-- Separate access to Octo Assist and Support Cosy (both apps share this Supabase project).
-- Each account has a server-side list in app_metadata.apps, e.g. ["octo_assist"], ["support_cosy"] or both.
-- Users cannot edit app_metadata. Run once, in the SQL editor. EVERYONE MUST LOG OUT AND BACK IN AFTERWARDS.

-- 1. Helper used by the policies below
CREATE OR REPLACE FUNCTION public.has_app(app text) RETURNS boolean
LANGUAGE sql STABLE AS $$
  SELECT COALESCE((auth.jwt() -> 'app_metadata' -> 'apps') ? app, false)
$$;

-- 2. Existing accounts: everyone gets Octo Assist...
UPDATE auth.users
SET raw_app_meta_data = COALESCE(raw_app_meta_data, '{}'::jsonb) || '{"apps":["octo_assist"]}'::jsonb
WHERE raw_app_meta_data -> 'apps' IS NULL;

--    ...Support Cosy admins get both...
UPDATE auth.users
SET raw_app_meta_data = raw_app_meta_data || '{"apps":["octo_assist","support_cosy"]}'::jsonb
WHERE raw_app_meta_data ->> 'role' = 'admin';

--    ...and your French test installer account gets Support Cosy only. Replace the email(s).
UPDATE auth.users
SET raw_app_meta_data = raw_app_meta_data || '{"apps":["support_cosy"]}'::jsonb
WHERE email IN ('REPLACE_WITH_FRENCH_TEST_INSTALLER@example.com');

-- 3. Database-level enforcement: restrictive policies are ANDed with the existing ones.
--    (Anonymous/public pages are unaffected: these apply to logged-in users only.)
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['commissioning_forms', 'support_requests', 'documents', 'aftercare_visits', 'health_checks'] LOOP
    IF to_regclass('public.' || t) IS NOT NULL THEN
      EXECUTE format('DROP POLICY IF EXISTS "Octo Assist app access" ON public.%I', t);
      EXECUTE format('CREATE POLICY "Octo Assist app access" ON public.%I AS RESTRICTIVE FOR ALL TO authenticated USING (public.has_app(''octo_assist''))', t);
    END IF;
  END LOOP;

  FOREACH t IN ARRAY ARRAY['fr_support_requests', 'fr_support_messages', 'fr_installations', 'fr_notification_reads'] LOOP
    IF to_regclass('public.' || t) IS NOT NULL THEN
      EXECUTE format('DROP POLICY IF EXISTS "Support Cosy app access" ON public.%I', t);
      EXECUTE format('CREATE POLICY "Support Cosy app access" ON public.%I AS RESTRICTIVE FOR ALL TO authenticated USING (public.has_app(''support_cosy''))', t);
    END IF;
  END LOOP;
END $$;

-- 4. Storage buckets
DROP POLICY IF EXISTS "App access to storage buckets" ON storage.objects;
CREATE POLICY "App access to storage buckets" ON storage.objects AS RESTRICTIVE FOR ALL TO authenticated
USING (
  CASE bucket_id
    WHEN 'install-photos'      THEN public.has_app('support_cosy')
    WHEN 'commissioning-photos' THEN public.has_app('octo_assist')
    WHEN 'router-photos'       THEN public.has_app('octo_assist')
    WHEN 'support-photos'      THEN (public.has_app('octo_assist') OR public.has_app('support_cosy'))
    ELSE true
  END
);
