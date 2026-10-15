// POST /api/translate-message
// Requires a logged-in caller. Sender role is decided server-side, never taken from the request body.
import { supabase, getCaller } from './_auth.js'

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

    const sender = caller.isAdmin ? 'admin' : 'user'
    const internal = caller.isAdmin && !!is_internal   // only admins can write internal notes

    // Non-admins may only post on their own tickets
    if (!caller.isAdmin) {
      const { data: ticket } = await supabase
        .from('fr_support_requests')
        .select('id')
        .eq('id', request_id)
        .eq('user_id', caller.user.id)
        .maybeSingle()
      if (!ticket) return res.status(403).json({ error: 'Forbidden' })
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
    }

    return res.status(200).json({ success: true, message: data })
  } catch (err) {
    console.error('translate-message error:', err)
    return res.status(500).json({ error: 'Server error' })
  }
}
