// Web Push (phone notifications). Optional: does nothing unless the VAPID keys are set in Vercel.
// Never throws: a push problem must not stop a request or reply being saved.
import { supabase } from './_auth.js'

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

// audience: { staff: true }  -> UK team (admin + support) who enabled notifications
//           { userId, companyId } -> the ticket owner and everyone in their company
// excludeUserId: don't ping the person who just sent the message
export async function sendPush({ audience, payload, excludeUserId }) {
  const { VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT } = process.env
  if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) return
  try {
    const { default: webpush } = await import('web-push')
    webpush.setVapidDetails(VAPID_SUBJECT || 'mailto:support@example.com', VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY)

    let q = supabase.from('fr_push_subscriptions').select('id, endpoint, p256dh, auth, user_id')
    if (audience.staff) {
      q = q.eq('is_staff', true)
    } else {
      const parts = []
      if (audience.userId && UUID.test(audience.userId)) parts.push(`user_id.eq.${audience.userId}`)
      if (audience.companyId && UUID.test(audience.companyId)) parts.push(`company_id.eq.${audience.companyId}`)
      if (!parts.length) return
      q = q.eq('is_staff', false).or(parts.join(','))
    }
    const { data: subs } = await q
    const targets = (subs || []).filter(s => s.user_id !== excludeUserId)
    if (!targets.length) return

    const body = JSON.stringify(payload)
    const dead = []
    await Promise.all(targets.map(async s => {
      try {
        await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, body, { TTL: 86400 })
      } catch (err) {
        if (err?.statusCode === 404 || err?.statusCode === 410) dead.push(s.id)
        else console.error('push failed:', err?.statusCode || err?.message)
      }
    }))
    if (dead.length) await supabase.from('fr_push_subscriptions').delete().in('id', dead)
  } catch (err) {
    console.error('push error:', err?.message)
  }
}
