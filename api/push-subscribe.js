// POST /api/push-subscribe   (logged in)
// Body: { action: 'subscribe', subscription } | { action: 'unsubscribe', endpoint }
import { supabase, getCaller } from './_auth.js'

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })
  try {
    const caller = await getCaller(req)
    if (!caller) return res.status(401).json({ error: 'Not authenticated' })
    const { action } = req.body || {}

    if (action === 'subscribe') {
      const sub = req.body.subscription
      const ok = sub && typeof sub.endpoint === 'string' && sub.endpoint.startsWith('https://') && sub.endpoint.length < 1000
        && typeof sub.keys?.p256dh === 'string' && typeof sub.keys?.auth === 'string'
      if (!ok) return res.status(400).json({ error: 'Invalid subscription' })
      const { error } = await supabase.from('fr_push_subscriptions').upsert({
        user_id: caller.user.id,
        company_id: caller.companyId,
        is_staff: caller.isStaff,
        endpoint: sub.endpoint,
        p256dh: sub.keys.p256dh,
        auth: sub.keys.auth,
        user_agent: String(req.headers['user-agent'] || '').slice(0, 300),
      }, { onConflict: 'endpoint' })
      if (error) throw error
      return res.status(200).json({ success: true })
    }

    if (action === 'unsubscribe') {
      const endpoint = String(req.body.endpoint || '')
      await supabase.from('fr_push_subscriptions').delete().eq('endpoint', endpoint).eq('user_id', caller.user.id)
      return res.status(200).json({ success: true })
    }

    return res.status(400).json({ error: 'Unknown action' })
  } catch (err) {
    console.error('push-subscribe error:', err)
    return res.status(500).json({ error: 'Server error' })
  }
}
