// POST /api/anon-installs   (no login: the caller is identified only by a secret device token)
// Actions:
//   upload_urls  -> signed upload URLs so the browser can send photos/signatures for a new install (anon/<install id>/...)
//   list         -> the installs registered from this device
//   urls         -> signed read URLs for one of this device's installs (photos and signatures, for display and the PDF copy)
import { supabase } from './_auth.js'
import { deviceHash, ipHash } from './_device.js'

const BUCKET = 'install-photos'
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const PHOTO_KEYS = ['unit_area', 'cylinder', 'prv', 'dist_board', 'hub_wiring', 'unit_terminations']
const FILE = new RegExp(`^((${PHOTO_KEYS.join('|')})-[1-3]\\.jpg|signature-(engineer|customer)\\.png)$`)
const MAX_FILES = 22
const COLUMNS = 'id, created_at, install_date, address, lead_engineer, partner_contractor, model, outdoor_serial, indoor_serial, hub_serial, checks, photos, engineer_signature_path, engineer_signed_on, customer_signature_path, customer_signed_on, declaration_accepted'

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })
  try {
    const dh = deviceHash(req)
    if (!dh) return res.status(401).json({ error: 'Appareil non reconnu' })
    const { action } = req.body || {}

    if (action === 'upload_urls') {
      const { install_id, files } = req.body
      if (!UUID.test(install_id || '')) return res.status(400).json({ error: 'Identifiant invalide' })
      if (!Array.isArray(files) || files.length === 0 || files.length > MAX_FILES || !files.every(f => typeof f === 'string' && FILE.test(f))) {
        return res.status(400).json({ error: 'Fichiers invalides' })
      }
      // Rate limit: 5 new registrations per hour and 15 per day per IP address (hashed)
      const ih = ipHash(req)
      const now = Date.now()
      const [{ count: hour }, { count: day }] = await Promise.all([
        supabase.from('fr_anon_uploads').select('id', { count: 'exact', head: true }).eq('ip_hash', ih).gte('created_at', new Date(now - 3600 * 1000).toISOString()),
        supabase.from('fr_anon_uploads').select('id', { count: 'exact', head: true }).eq('ip_hash', ih).gte('created_at', new Date(now - 86400 * 1000).toISOString()),
      ])
      if ((hour || 0) >= 5 || (day || 0) >= 15) return res.status(429).json({ error: 'Trop de demandes, réessayez plus tard' })
      // The same install id can ask again (retry after a dropped connection) without using up the limit
      const { data: prior } = await supabase.from('fr_anon_uploads').select('id').eq('ip_hash', ih).eq('install_id', install_id).limit(1)
      if (!prior?.length) await supabase.from('fr_anon_uploads').insert({ ip_hash: ih, install_id })

      const out = []
      for (const f of files) {
        const path = `anon/${install_id}/${f}`
        const { data, error } = await supabase.storage.from(BUCKET).createSignedUploadUrl(path, { upsert: true })
        if (error) throw error
        out.push({ name: f, path, token: data.token })
      }
      return res.status(200).json({ uploads: out })
    }

    if (action === 'list') {
      const { data, error } = await supabase.from('fr_installations').select(COLUMNS)
        .eq('anon_token_hash', dh).order('created_at', { ascending: false }).limit(200)
      if (error) throw error
      return res.status(200).json({ installs: data || [] })
    }

    if (action === 'urls') {
      const { install_id } = req.body
      if (!UUID.test(install_id || '')) return res.status(400).json({ error: 'Identifiant invalide' })
      const { data: inst } = await supabase.from('fr_installations').select('photos, engineer_signature_path, customer_signature_path')
        .eq('id', install_id).eq('anon_token_hash', dh).maybeSingle()
      if (!inst) return res.status(404).json({ error: 'Introuvable' })
      const paths = [...Object.values(inst.photos || {}).flat(), inst.engineer_signature_path, inst.customer_signature_path].filter(Boolean)
      const { data, error } = await supabase.storage.from(BUCKET).createSignedUrls(paths, 3600)
      if (error) throw error
      return res.status(200).json({ urls: Object.fromEntries((data || []).filter(d => d.signedUrl).map(d => [d.path, d.signedUrl])) })
    }

    return res.status(400).json({ error: 'Unknown action' })
  } catch (err) {
    console.error('anon-installs error:', err)
    return res.status(500).json({ error: 'Erreur serveur' })
  }
}
