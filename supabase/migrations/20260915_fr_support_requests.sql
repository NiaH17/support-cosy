-- French support requests table
-- Run in Supabase SQL editor

CREATE TABLE IF NOT EXISTS fr_support_requests (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at      timestamptz DEFAULT now(),
  user_id         uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  user_email      text,
  user_name       text,
  site_address    text,
  issue_type      text NOT NULL,
  fault_code      text,
  urgency         text NOT NULL DEFAULT 'medium' CHECK (urgency IN ('low', 'medium', 'high')),
  contact_phone   text,
  description_fr  text NOT NULL,
  description_en  text,
  status          text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'resolved', 'closed')),
  admin_notes     text,
  resolved_at     timestamptz
);

ALTER TABLE fr_support_requests ENABLE ROW LEVEL SECURITY;

-- Authenticated users can insert their own requests
CREATE POLICY "Users can insert support requests"
  ON fr_support_requests FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

-- Users can read their own requests
CREATE POLICY "Users can read own support requests"
  ON fr_support_requests FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Admins can read all requests
CREATE POLICY "Admins can read all support requests"
  ON fr_support_requests FOR ALL
  TO authenticated
  USING ((auth.jwt() -> 'user_metadata' ->> 'role') = 'admin');
