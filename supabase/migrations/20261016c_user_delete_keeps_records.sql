-- Let users be deleted without losing their commissioning forms / support requests.
-- Records are kept; the link to the deleted user is cleared (the forms still hold the engineer's name and email).

ALTER TABLE commissioning_forms ALTER COLUMN user_id DROP NOT NULL;
ALTER TABLE commissioning_forms DROP CONSTRAINT IF EXISTS commissioning_forms_user_id_fkey;
ALTER TABLE commissioning_forms
  ADD CONSTRAINT commissioning_forms_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE support_requests ALTER COLUMN user_id DROP NOT NULL;
ALTER TABLE support_requests DROP CONSTRAINT IF EXISTS support_requests_user_id_fkey;
ALTER TABLE support_requests
  ADD CONSTRAINT support_requests_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL;
