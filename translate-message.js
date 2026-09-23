// POST /api/translate-message
// Handles back-and-forth threaded messages with DeepL translation
// user→admin : FR→EN    admin→user : EN→FR    is_internal : no translation

import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

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
    const { request_id, message, sender, is_internal } = req.body

    if (!request_id || !message || !sender) {
      return res.status(400).json({ error: 'Missing required fields' })
    }

    let message_fr = null
    let message_en = null

    if (is_internal) {
      // Internal admin note — no translation, EN only
      message_en = message
    } else if (sender === 'user') {
      // User writes French → translate to English for admin
      message_fr = message
      message_en = await translate(message, 'FR', 'EN-GB') || message
    } else if (sender === 'admin') {
      // Admin writes English → translate to French for user
      message_en = message
      message_fr = await translate(message, 'EN', 'FR') || message
    }

    const { data, error } = await supabase
      .from('fr_support_messages')
      .insert({ request_id, sender, message_fr, message_en, is_internal: !!is_internal })
      .select()
      .single()

    if (error) throw error

    // If admin sends a real reply, bump status to in_progress
    if (sender === 'admin' && !is_internal) {
      await supabase
        .from('fr_support_requests')
        .update({ status: 'in_progress', replied_at: new Date().toISOString() })
        .eq('id', request_id)
        .eq('status', 'open') // only if still open
    }

    return res.status(200).json({ success: true, message: data })
  } catch (err) {
    console.error('translate-message error:', err)
    return res.status(500).json({ error: err.message })
  }
}
