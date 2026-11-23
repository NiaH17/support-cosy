// POST /api/translate-message
// Requires a logged-in caller. Sender role is decided server-side, never taken from the request body.
import { supabase, getCaller } from './_auth.js'
import { notifySlack, clip, APP_URL } from './_slack.js'
import { sendPush } from './_push.js'

const MAX_LEN = 4000

async function translate(text, sourceLang, targetLang) {
  if (!text || !process.env.DEEPL_API_KEY) return null
  const res = await fetch('https://api-free.deepl.com/v2/translate', {
    method: 'POST',
    headers: {
      'Authorization': `DeepL-Auth-Key ${process.env.DEEPL_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ text: [text], source_lang: sourceLang, target_lang: targetLang }),
  })
  if (!res.ok) return null
  const data = await res.json()
  return data.translations?.[0]?.text || null
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  try {
    const caller = await getCaller(req)
    if (!caller) return res.status(401).json({ error: 'Not authenticated' })

    const { request_id, message, is_internal } = req.body || {}
    if (!request_id || !message || typeof message !== 'string') {
      return res.status(400).json({ error: 'Missing required fields' })
    }
    if (message.length > MAX_LEN) return res.status(400).json({ error: 'Message too long' })

    const sender = caller.isStaff ? 'admin' : 'user'   // 'admin' = the UK team (UK admin or UK support)
    const internal = caller.isStaff && !!is_internal   // only UK staff can write internal notes

    // Non-admins may only post on their own tickets or their company's tickets
    if (!caller.isStaff) {
      const { data: ticket } = await supabase
        .from('fr_support_requests')
        .select('id, user_id, company_id')
        .eq('id', request_id)
        .maybeSingle()
      const allowed = ticket && (ticket.user_id === caller.user.id || (caller.companyId && ticket.company_id === caller.companyId))
      if (!allowed) return res.status(403).json({ error: 'Forbidden' })
    }

    // Rate limit: 30 messages per caller per hour
    const since = new Date(Date.now() - 3600 * 1000).toISOString()
    const { count } = await supabase
      .from('fr_support_messages')
      .select('id', { count: 'exact', head: true })
      .eq('sender_id', caller.user.id)
      .gte('created_at', since)
    if ((count || 0) >= 30) return res.status(429).json({ error: 'Too many messages, try again later' })

    let message_fr = null
    let message_en = null
    if (internal) {
      message_en = message
    } else if (sender === 'user') {
      message_fr = message
      message_en = await translate(message, 'FR', 'EN-GB') || message
    } else {
      message_en = message
      message_fr = await translate(message, 'EN', 'FR') || message
    }

    const { data, error } = await supabase
      .from('fr_support_messages')
      .insert({ request_id, sender, sender_id: caller.user.id, message_fr, message_en, is_internal: internal })
      .select()
      .single()
    if (error) throw error

    if (sender === 'admin' && !internal) {
      await supabase
        .from('fr_support_requests')
        .update({ status: 'in_progress', replied_at: new Date().toISOString() })
        .eq('id', request_id)
        .eq('status', 'open')
      // The first admin to reply becomes the person handling the ticket (others can take over from the admin page)
      await supabase
        .from('fr_support_requests')
        .update({
          assigned_admin_id: caller.user.id,
          assigned_admin_name: caller.user.user_metadata?.full_name || caller.user.email,
        })
        .eq('id', request_id)
        .is('assigned_admin_id', null)
    }

    // Slack: customer replies, and replies from the UK team (internal notes are never sent)
    if (!internal) {
      const { data: t } = await supabase.from('fr_support_requests')
        .select('id, user_id, company_id, user_name, user_email, installation_company, issue_type').eq('id', request_id).maybeSingle()
      const who = t ? `${t.user_name || t.user_email}${t.installation_company ? ` (${t.installation_company})` : ''}` : 'a partner'
      await notifySlack({
        title: sender === 'user' ? 'New reply from partner' : `Reply sent by ${caller.user.user_metadata?.full_name || caller.user.email}`,
        lines: [`Request: ${t?.issue_type || ''} · ${who}`, clip(message_en || message_fr)],
        url: `${APP_URL}/admin?ticket=${request_id}`,
      })
      // Phone notification. Partners get a short generic message (nothing sensitive on a lock screen).
      if (sender === 'admin') {
        await sendPush({
          audience: { userId: t?.user_id, companyId: t?.company_id },
          payload: { title: 'Support Cosy', body: 'Nouvelle réponse à votre demande', url: `/mes-demandes?ticket=${request_id}`, tag: `ticket-${request_id}` },
          excludeUserId: caller.user.id,
        })
      } else {
        await sendPush({
          audience: { staff: true },
          payload: { title: 'New reply from partner', body: `${t?.installation_company || t?.user_name || t?.user_email || ''} · ${t?.issue_type || ''}`, url: `/admin?ticket=${request_id}`, tag: `ticket-${request_id}` },
          excludeUserId: caller.user.id,
        })
      }
    }

    return res.status(200).json({ success: true, message: data })
  } catch (err) {
    console.error('translate-message error:', err)
    return res.status(500).json({ error: 'Server error' })
  }
}
