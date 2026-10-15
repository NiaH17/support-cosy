// POST /api/translate-support
// Requires a logged-in caller. Translates the French description to English and stores the request.
// Identity (user_id / email) comes from the verified token, never from the request body.
import { supabase, getCaller } from './_auth.js'

const MAX_DESC = 4000
const MAX_PER_HOUR = 10

async function translateToEnglish(text) {
  if (!text || !process.env.DEEPL_API_KEY) return null
  const res = await fetch('https://api-free.deepl.com/v2/translate', {
    method: 'POST',
    headers: {
      'Authorization': `DeepL-Auth-Key ${process.env.DEEPL_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ text: [text], source_lang: 'FR', target_lang: 'EN-GB' }),
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

    const payload = req.body || {}
    if (!payload.issue_type || !payload.description || typeof payload.description !== 'string') {
      return res.status(400).json({ error: 'Missing required fields' })
    }
    if (payload.description.length > MAX_DESC) return res.status(400).json({ error: 'Description too long' })

    // Rate limit per user
    const since = new Date(Date.now() - 3600 * 1000).toISOString()
    const { count } = await supabase
      .from('fr_support_requests')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', caller.user.id)
      .gte('created_at', since)
    if ((count || 0) >= MAX_PER_HOUR) return res.status(429).json({ error: 'Too many requests, try again later' })

    const descriptionEn = await translateToEnglish(payload.description)

    const { data, error } = await supabase.from('fr_support_requests').insert({
      user_id: caller.user.id,
      user_email: caller.user.email,
      user_name: caller.user.user_metadata?.full_name || caller.user.email,
      installation_company: payload.installation_company || null,
      site_address: payload.site_address,
      issue_type: payload.issue_type,
      fault_code: payload.fault_code || null,
      urgency: ['low', 'medium', 'high'].includes(payload.urgency) ? payload.urgency : 'medium',
      contact_phone: payload.contact_phone || null,
      description_fr: payload.description,
      description_en: descriptionEn,
      status: 'open',
    }).select().single()

    if (error) throw error

    return res.status(200).json({ success: true, id: data.id })
  } catch (err) {
    console.error('translate-support error:', err)
    return res.status(500).json({ error: 'Server error' })
  }
}
