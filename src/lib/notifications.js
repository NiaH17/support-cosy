import { supabase } from './supabase'

// Marks a ticket's messages as read for the current user, then asks the global banner to refresh.
export async function markTicketRead(requestId) {
  await supabase.rpc('mark_ticket_read', { p_request_id: requestId })
  window.dispatchEvent(new Event('notifier-refresh'))
}
