-- Company profiles: engineers in the same company see each other's support requests and install registrations,
-- and nobody else's. Run in the Supabase SQL editor BEFORE deploying the matching code.
-- Afterwards every Support Cosy user must log out and back in (the company is stored in their login token).
--
-- How it works: each user has app_metadata.company_id (server-only; users cannot edit it) pointing at fr_companies.
-- Requests and installs get a company_id (set by the server from the logged-in user). Admins see everything as before.

-- 1. Companies
CREATE TABLE IF NOT EXISTS fr_companies (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name       text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS fr_companies_name_idx ON fr_companies (lower(name));
ALTER TABLE fr_companies ENABLE ROW LEVEL SECURITY;

-- 2. Helper: the caller's company (from app_metadata in the login token)
CREATE OR REPLACE FUNCTION public.my_company() RETURNS uuid
LANGUAGE sql STABLE AS $$
  SELECT NULLIF(auth.jwt() -> 'app_metadata' ->> 'company_id', '')::uuid
$$;

DROP POLICY IF EXISTS "Admins manage companies" ON fr_companies;
CREATE POLICY "Admins manage companies" ON fr_companies
  FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
DROP POLICY IF EXISTS "Users read own company" ON fr_companies;
CREATE POLICY "Users read own company" ON fr_companies
  FOR SELECT TO authenticated USING (id = public.my_company());

-- 3. Company on requests and installs
ALTER TABLE fr_support_requests ADD COLUMN IF NOT EXISTS company_id uuid REFERENCES fr_companies(id) ON DELETE SET NULL;
ALTER TABLE fr_installations   ADD COLUMN IF NOT EXISTS company_id uuid REFERENCES fr_companies(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS fr_support_requests_company_idx ON fr_support_requests (company_id);
CREATE INDEX IF NOT EXISTS fr_installations_company_idx ON fr_installations (company_id);

-- 4. Existing users: create a company for each distinct company name already entered in Admin > Users,
--    attach the users, and tag their existing requests and installs. Safe to re-run.
INSERT INTO fr_companies (name)
SELECT DISTINCT trim(raw_user_meta_data ->> 'company_name')
FROM auth.users
WHERE raw_app_meta_data -> 'apps' ? 'support_cosy'
  AND COALESCE(trim(raw_user_meta_data ->> 'company_name'), '') <> ''
  AND COALESCE(raw_app_meta_data ->> 'role', '') <> 'admin'
ON CONFLICT DO NOTHING;

UPDATE auth.users u
SET raw_app_meta_data = u.raw_app_meta_data || jsonb_build_object('company_id', c.id)
FROM fr_companies c
WHERE lower(c.name) = lower(trim(u.raw_user_meta_data ->> 'company_name'))
  AND u.raw_app_meta_data -> 'apps' ? 'support_cosy'
  AND COALESCE(u.raw_app_meta_data ->> 'role', '') <> 'admin';

-- The request-protection trigger blocks edits made from the SQL editor (no admin login), so pause it for this one update
ALTER TABLE fr_support_requests DISABLE TRIGGER restrict_user_request_changes;
UPDATE fr_support_requests r SET company_id = (u.raw_app_meta_data ->> 'company_id')::uuid
FROM auth.users u WHERE u.id = r.user_id AND r.company_id IS NULL AND u.raw_app_meta_data ? 'company_id';
ALTER TABLE fr_support_requests ENABLE TRIGGER restrict_user_request_changes;
UPDATE fr_installations i SET company_id = (u.raw_app_meta_data ->> 'company_id')::uuid
FROM auth.users u WHERE u.id = i.user_id AND i.company_id IS NULL AND u.raw_app_meta_data ? 'company_id';

-- Colleagues should not get "new reply" banners for old tickets: mark existing company tickets as read for them
INSERT INTO fr_notification_reads (user_id, request_id, last_read_at)
SELECT u.id, r.id, now()
FROM fr_support_requests r
JOIN auth.users u ON (u.raw_app_meta_data ->> 'company_id')::uuid = r.company_id
WHERE r.company_id IS NOT NULL
ON CONFLICT DO NOTHING;

-- 5. Requests: members can read their company's requests (they still only edit their own)
DROP POLICY IF EXISTS "Users can read own support requests" ON fr_support_requests;
DROP POLICY IF EXISTS "Users read own or company requests" ON fr_support_requests;
CREATE POLICY "Users read own or company requests" ON fr_support_requests
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR (company_id IS NOT NULL AND company_id = public.my_company()));

-- Non-admin inserts always get the caller's own company; the company can never be edited by a user
CREATE OR REPLACE FUNCTION public.restrict_user_request_changes() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  IF public.is_admin() OR auth.role() = 'service_role' THEN RETURN NEW; END IF;
  IF TG_OP = 'UPDATE' THEN
    IF (to_jsonb(NEW) - 'status' - 'photo_urls') IS DISTINCT FROM (to_jsonb(OLD) - 'status' - 'photo_urls') THEN
      RAISE EXCEPTION 'Not allowed to change these fields';
    END IF;
    IF NEW.status IS DISTINCT FROM OLD.status AND NEW.status <> 'closed' THEN
      RAISE EXCEPTION 'Users can only close tickets';
    END IF;
  ELSE
    NEW.status := 'open';
    NEW.part_needed := NULL; NEW.part_details := NULL; NEW.kraken_account := NULL;
    NEW.confirmed_issue := NULL; NEW.internal_notes := NULL; NEW.admin_notes := NULL;
    NEW.company_id := public.my_company();
  END IF;
  RETURN NEW;
END $$;

-- 6. Messages: readable on any request the caller can read (the sub-select applies the request policy above)
DROP POLICY IF EXISTS "Users read own messages" ON fr_support_messages;
CREATE POLICY "Users read own messages" ON fr_support_messages
  FOR SELECT TO authenticated
  USING (is_internal = false AND request_id IN (SELECT id FROM fr_support_requests));

-- 7. Installs: members can read their company's installs
DROP POLICY IF EXISTS "Users read own installations" ON fr_installations;
DROP POLICY IF EXISTS "Users read own or company installations" ON fr_installations;
CREATE POLICY "Users read own or company installations" ON fr_installations
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR (company_id IS NOT NULL AND company_id = public.my_company()));

-- Install photos and signatures live under <uploader id>/<install id>/: let colleagues read them
DROP POLICY IF EXISTS "install-photos read own or admin" ON storage.objects;
DROP POLICY IF EXISTS "install-photos read own, company or admin" ON storage.objects;
CREATE POLICY "install-photos read own, company or admin" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'install-photos' AND (
      (storage.foldername(name))[1] = auth.uid()::text
      OR public.is_admin()
      OR EXISTS (
        SELECT 1 FROM fr_installations i
        WHERE i.id::text = (storage.foldername(name))[2]
          AND i.company_id IS NOT NULL AND i.company_id = public.my_company()
      )
    )
  );

-- 8. Notifications: colleagues are notified about replies on company tickets
CREATE OR REPLACE FUNCTION public.mark_ticket_read(p_request_id uuid) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF public.is_admin()
     OR EXISTS (SELECT 1 FROM fr_support_requests
                WHERE id = p_request_id
                  AND (user_id = auth.uid() OR (company_id IS NOT NULL AND company_id = public.my_company()))) THEN
    INSERT INTO fr_notification_reads (user_id, request_id, last_read_at)
    VALUES (auth.uid(), p_request_id, now())
    ON CONFLICT (user_id, request_id) DO UPDATE SET last_read_at = now();
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.get_unread_tickets() RETURNS TABLE (ticket_id uuid, kind text)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public STABLE AS $$
BEGIN
  IF public.is_admin() THEN
    RETURN QUERY
    SELECT r.id,
           CASE WHEN rd.request_id IS NULL THEN 'new_request' ELSE 'new_reply' END
    FROM fr_support_requests r
    LEFT JOIN fr_notification_reads rd ON rd.request_id = r.id AND rd.user_id = auth.uid()
    WHERE rd.request_id IS NULL
       OR EXISTS (SELECT 1 FROM fr_support_messages m
                  WHERE m.request_id = r.id AND m.sender = 'user' AND m.is_internal = false
                    AND m.created_at > rd.last_read_at);
  ELSE
    RETURN QUERY
    SELECT r.id, 'new_reply'::text
    FROM fr_support_requests r
    LEFT JOIN fr_notification_reads rd ON rd.request_id = r.id AND rd.user_id = auth.uid()
    WHERE (r.user_id = auth.uid() OR (r.company_id IS NOT NULL AND r.company_id = public.my_company()))
      AND EXISTS (SELECT 1 FROM fr_support_messages m
                  WHERE m.request_id = r.id AND m.sender = 'admin' AND m.is_internal = false
                    AND m.created_at > COALESCE(rd.last_read_at, '-infinity'::timestamptz));
  END IF;
END $$;

-- 9. Four access levels. UK admin = app_metadata.role 'admin' (as before). UK support = app_metadata.cosy_role 'support'
--    (a separate field so it never clashes with Octo Assist's own roles). French partner = neither.
--    UK support gets the same database access as admin; the Users and Reports tabs are hidden in the app,
--    and user management is enforced in /api/admin-users (UK admin only).
CREATE OR REPLACE FUNCTION public.is_admin() RETURNS boolean
LANGUAGE sql STABLE AS $$
  SELECT COALESCE(
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
    OR (auth.jwt() -> 'app_metadata' ->> 'cosy_role') = 'support',
    false)
$$;
