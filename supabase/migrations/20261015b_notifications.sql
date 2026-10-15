-- Per-user unread tracking for notifications. Run in Supabase SQL editor
-- (after 20261015_security_hardening.sql). If you already ran an earlier version of this file, that's fine:
-- the old columns are simply no longer used.

CREATE TABLE IF NOT EXISTS fr_notification_reads (
  user_id       uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  request_id    uuid NOT NULL REFERENCES fr_support_requests(id) ON DELETE CASCADE,
  last_read_at  timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, request_id)
);

-- No direct access; everything goes through the functions below
ALTER TABLE fr_notification_reads ENABLE ROW LEVEL SECURITY;

-- Treat everything that exists today as already read, for every current admin and each ticket's owner
INSERT INTO fr_notification_reads (user_id, request_id, last_read_at)
SELECT u.id, r.id, now()
FROM fr_support_requests r
JOIN auth.users u ON (u.raw_app_meta_data ->> 'role') = 'admin' OR u.id = r.user_id
ON CONFLICT DO NOTHING;

-- Called when someone opens a ticket: marks it read for that person only
CREATE OR REPLACE FUNCTION public.mark_ticket_read(p_request_id uuid) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF public.is_admin()
     OR EXISTS (SELECT 1 FROM fr_support_requests WHERE id = p_request_id AND user_id = auth.uid()) THEN
    INSERT INTO fr_notification_reads (user_id, request_id, last_read_at)
    VALUES (auth.uid(), p_request_id, now())
    ON CONFLICT (user_id, request_id) DO UPDATE SET last_read_at = now();
  END IF;
END $$;

-- Returns the tickets with something unread for the calling person
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
    WHERE r.user_id = auth.uid()
      AND EXISTS (SELECT 1 FROM fr_support_messages m
                  WHERE m.request_id = r.id AND m.sender = 'admin' AND m.is_internal = false
                    AND m.created_at > COALESCE(rd.last_read_at, '-infinity'::timestamptz));
  END IF;
END $$;

REVOKE ALL ON FUNCTION public.mark_ticket_read(uuid) FROM public;
REVOKE ALL ON FUNCTION public.get_unread_tickets() FROM public;
GRANT EXECUTE ON FUNCTION public.mark_ticket_read(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_unread_tickets() TO authenticated;
