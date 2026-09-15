// Vercel serverless function — ES module
// POST /api/translate-support
// Receives French support form data, translates via DeepL, stores in Supabase, notifies Slack

import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function translateToEnglish(text) {
  if (!text || !process.env.DEEPL_API_KEY) return null

  const res = await fetch('https://api-free.deepl.com/v2/translate', {
    method: 'POST',
    headers: {
      'Authorization': `DeepL-Auth-Key ${process.env.DEEPL_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      text: [text],
      source_lang: 'FR',
      target_lang: 'EN-GB',
    }),
  })

  if (!res.ok) return null
  const data = await res.json()
  return data.translations?.[0]?.text || null
}

async function notifySlack(payload, descriptionEn) {
  if (!process.env.SLACK_WEBHOOK_URL) return

  const urgencyEmoji = { low: '🟢', medium: '🟡', high: '🔴' }
  const urgencyLabel = { low: 'Faible', medium: 'Normale', high: 'URGENTE' }

  const message = {
    text: `${urgencyEmoji[payload.urgency] || '⚪'} *Nouvelle demande support (FR)* — ${urgencyLabel[payload.urgency] || payload.urgency}`,
    blocks: [
      {
        type: 'header',
        text: { type: 'plain_text', text: `${urgencyEmoji[payload.urgency]} Support Request — ${urgencyLabel[payload.urgency]}` }
      },
      {
        type: 'section',
        fields: [
          { type: 'mrkdwn', text: `*From:*\n${payload.user_name || payload.user_email}` },
          { type: 'mrkdwn', text: `*Site:*\n${payload.site_address || '—'}` },
          { type: 'mrkdwn', text: `*Issue type:*\n${payload.issue_type}` },
          { type: 'mrkdwn', text: `*Fault code:*\n${payload.fault_code || '—'}` },
        ]
      },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*Description (English):*\n${descriptionEn || '_(translation unavailable)_'}\n\n*Original (French):*\n_${payload.description}_`
        }
      },
      ...(payload.contact_phone ? [{
        type: 'section',
        text: { type: 'mrkdwn', text: `*Phone:* ${payload.contact_phone}` }
      }] : []),
    ]
  }

  await fetch(process.env.SLACK_WEBHOOK_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(message),
  })
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const payload = req.body

    // Translate description FR → EN
    const descriptionEn = await translateToEnglish(payload.description)

    // Save to Supabase
    const { data, error } = await supabase.from('fr_support_requests').insert({
      user_id: payload.user_id || null,
      user_email: payload.user_email,
      user_name: payload.user_name,
      site_address: payload.site_address,
      issue_type: payload.issue_type,
      fault_code: payload.fault_code || null,
      urgency: payload.urgency,
      contact_phone: payload.contact_phone || null,
      description_fr: payload.description,
      description_en: descriptionEn,
      status: 'open',
    }).select().single()

    if (error) throw error

    // Notify Slack
    await notifySlack(payload, descriptionEn)

    return res.status(200).json({ success: true, id: data.id })
  } catch (err) {
    console.error('translate-support error:', err)
    return res.status(500).json({ error: err.message })
  }
}
