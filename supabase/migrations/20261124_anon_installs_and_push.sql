-- Push 2: install registration without a login (saved on the installer's device) and phone push notifications.
-- Run in the Supabase SQL editor BEFORE deploying the matching code. Safe to re-run.

-- 1. Installs registered without a login. There is no user_id; the device holds a secret token and we store only its hash.
--    No policy exists for the public (anon) role, so these rows are reachable only through /api (service role) and by UK staff.
ALTER TABLE fr_installations
  ADD COLUMN IF NOT EXISTS anon_token_hash text,
  ADD COLUMN IF NOT EXISTS ip_hash         text;
CREATE INDEX IF NOT EXISTS fr_installations_anon_token_idx ON fr_installations (anon_token_hash) WHERE anon_token_hash IS NOT NULL;
CREATE INDEX IF NOT EXISTS fr_installations_ip_idx ON fr_installations (ip_hash, created_at) WHERE ip_hash IS NOT NULL;

-- 2. Upload sessions for no-login installs (rate limiting by hashed IP address). Service role only.
CREATE TABLE IF NOT EXISTS fr_anon_uploads (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  ip_hash    text NOT NULL,
  install_id uuid
);
CREATE INDEX IF NOT EXISTS fr_anon_uploads_ip_idx ON fr_anon_uploads (ip_hash, created_at);
ALTER TABLE fr_anon_uploads ENABLE ROW LEVEL SECURITY;

-- 3. Phone push subscriptions (one row per browser/phone). Written by /api/push-subscribe (service role).
CREATE TABLE IF NOT EXISTS fr_push_subscriptions (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  user_id    uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  company_id uuid REFERENCES fr_companies(id) ON DELETE SET NULL,
  is_staff   boolean NOT NULL DEFAULT false,
  endpoint   text NOT NULL UNIQUE,
  p256dh     text NOT NULL,
  auth       text NOT NULL,
  user_agent text
);
CREATE INDEX IF NOT EXISTS fr_push_subscriptions_user_idx ON fr_push_subscriptions (user_id);
CREATE INDEX IF NOT EXISTS fr_push_subscriptions_company_idx ON fr_push_subscriptions (company_id);
ALTER TABLE fr_push_subscriptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users read own push subscriptions" ON fr_push_subscriptions;
CREATE POLICY "Users read own push subscriptions" ON fr_push_subscriptions
  FOR SELECT TO authenticated USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Support Cosy app access" ON fr_push_subscriptions;
CREATE POLICY "Support Cosy app access" ON fr_push_subscriptions AS RESTRICTIVE
  FOR ALL TO authenticated USING (public.has_app('support_cosy'));

-- 4. Limit what can be uploaded to the install photo bucket (no-login uploads use one-time signed links)
UPDATE storage.buckets
SET file_size_limit = 10485760,                       -- 10 MB per file
    allowed_mime_types = ARRAY['image/jpeg', 'image/png']
WHERE id = 'install-photos';
