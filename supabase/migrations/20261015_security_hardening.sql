-- Security hardening. Run in Supabase SQL editor.
-- STEP 1 MUST RUN FIRST and BEFORE deploying the new code, or admins lose access.

-- 1. Give your admins the role in app_metadata (users cannot edit this). Replace the emails.
UPDATE auth.users
SET raw_app_meta_data = COALESCE(raw_app_meta_data, '{}'::jsonb) || '{"role":"admin"}'::jsonb
WHERE email IN ('REPLACE_WITH_ADMIN_EMAIL@octoenergy.com');

-- 2. Track who sent each message (used for rate limiting)
ALTER TABLE fr_support_messages ADD COLUMN IF NOT EXISTS sender_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;

-- 3. Helper: is the caller an admin (reads app_metadata only)
CREATE OR REPLACE FUNCTION public.is_admin() RETURNS boolean
LANGUAGE sql STABLE AS $$
  SELECT COALESCE((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin', false)
$$;

-- 4. Requests: replace admin policy (was reading user_metadata, which users can edit)
DROP POLICY IF EXISTS "Admins can read all support requests" ON fr_support_requests;
CREATE POLICY "Admins full access to requests" ON fr_support_requests
  FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

-- Users may update only their own rows (the trigger below limits which columns)
DROP POLICY IF EXISTS "Users can update own requests" ON fr_support_requests;
CREATE POLICY "Users can update own requests" ON fr_support_requests
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Users cannot set admin-only columns on insert or edit them later
CREATE OR REPLACE FUNCTION public.restrict_user_request_changes() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  IF public.is_admin() OR auth.role() = 'service_role' THEN RETURN NEW; END IF;
  IF TG_OP = 'UPDATE' THEN
    -- non-admins may only change status (to closed) and photo_urls
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
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS restrict_user_request_changes ON fr_support_requests;
CREATE TRIGGER restrict_user_request_changes
  BEFORE INSERT OR UPDATE ON fr_support_requests
  FOR EACH ROW EXECUTE FUNCTION public.restrict_user_request_changes();

-- 5. Messages: admin policy on app_metadata. Users read non-internal messages on own tickets.
--    Users no longer insert directly; they post through /api/translate-message.
DROP POLICY IF EXISTS "Admins all messages" ON fr_support_messages;
CREATE POLICY "Admins all messages" ON fr_support_messages
  FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
