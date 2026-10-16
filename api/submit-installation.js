// POST /api/submit-installation
// Stores an install registration. Installers and admins download a PDF copy from the app.
// Identity comes from the verified login token. Photos/signatures are uploaded by the browser first;
// this endpoint only accepts storage paths inside the caller's own folder for this registration.
import { supabase, getCaller } from './_auth.js'

const MODELS = ['Cosy 6', 'Cosy 9', 'Cosy 12']
const CHECK_KEYS = ['clearances', 'secured', 'insulation', 'condensate', 'flushed', 'hub_online', 'weather_comp', 'app_connected', 'app_understood']
const PHOTO_KEYS = ['unit_area', 'cylinder', 'prv', 'dist_board', 'hub_wiring', 'unit_terminations']
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const DATE = /^\d{4}-\d{2}-\d{2}$/

const str = (v, max = 300) => (typeof v === 'string' ? v.trim().slice(0, max) : '')

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })
  try {
    const caller = await getCaller(req)
    if (!caller) return res.status(401).json({ error: 'Not authenticated' })
    const b = req.body || {}
    const uid = caller.user.id

    if (!UUID.test(b.id || '')) return res.status(400).json({ error: 'Identifiant invalide' })
    const base = `${uid}/${b.id}/`

    const inst = {
      id: b.id,
      user_id: uid,
      user_email: caller.user.email,
      install_date: DATE.test(b.install_date || '') ? b.install_date : null,
      address: str(b.address, 500),
      lead_engineer: str(b.lead_engineer),
      partner_contractor: str(b.partner_contractor) || null,
      model: str(b.model),
      outdoor_serial: str(b.outdoor_serial),
      indoor_serial: str(b.indoor_serial) || null,
      hub_serial: str(b.hub_serial),
      checks: Object.fromEntries(CHECK_KEYS.map(k => [k, b.checks?.[k] === true])),
      photos: {},
      engineer_signature_path: str(b.engineer_signature_path, 500),
      engineer_signed_on: DATE.test(b.engineer_signed_on || '') ? b.engineer_signed_on : null,
      customer_signature_path: str(b.customer_signature_path, 500),
      customer_signed_on: DATE.test(b.customer_signed_on || '') ? b.customer_signed_on : null,
      declaration_accepted: b.declaration_accepted === true,
    }

    if (!inst.install_date || !inst.address || !inst.lead_engineer || !MODELS.includes(inst.model) || !inst.outdoor_serial || !inst.hub_serial) {
      return res.status(400).json({ error: 'Champs obligatoires manquants' })
    }
    if (!inst.declaration_accepted) return res.status(400).json({ error: 'La déclaration doit être acceptée' })

    for (const k of PHOTO_KEYS) {
      const paths = Array.isArray(b.photos?.[k]) ? b.photos[k].slice(0, 3) : []
      if (!paths.length) return res.status(400).json({ error: 'Photo(s) manquante(s)' })
      if (!paths.every(p => typeof p === 'string' && p.startsWith(base) && !p.includes('..'))) return res.status(400).json({ error: 'Chemin de fichier invalide' })
      inst.photos[k] = paths
    }
    for (const p of [inst.engineer_signature_path, inst.customer_signature_path]) {
      if (!p || !p.startsWith(base) || p.includes('..')) return res.status(400).json({ error: 'Signature manquante ou invalide' })
    }

    // Rate limit: 20 registrations per hour per user
    const since = new Date(Date.now() - 3600 * 1000).toISOString()
    const { count } = await supabase.from('fr_installations').select('id', { count: 'exact', head: true }).eq('user_id', uid).gte('created_at', since)
    if ((count || 0) >= 20) return res.status(429).json({ error: 'Trop de demandes, réessayez plus tard' })

    const { error } = await supabase.from('fr_installations').insert(inst)
    if (error) {
      if (error.code === '23505') return res.status(409).json({ error: 'Déjà enregistré' })
      throw error
    }

    return res.status(200).json({ success: true, id: inst.id })
  } catch (err) {
    console.error('submit-installation error:', err)
    return res.status(500).json({ error: 'Erreur serveur' })
  }
}
