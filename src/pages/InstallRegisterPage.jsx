import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { compressImage } from '../lib/images'
import { CHECKS, PHOTOS, MODELS, DECLARATION, BUCKET } from '../lib/installFields'
import PhotoField from '../components/PhotoField'
import SignaturePad from '../components/SignaturePad'

const today = () => new Date().toISOString().slice(0, 10)

function SectionTitle({ n, children }) {
  return (
    <div className="flex items-center gap-2.5 mb-3">
      <span className="w-6 h-6 rounded-full bg-brand-purple text-white text-xs font-bold flex items-center justify-center">{n}</span>
      <h2 className="font-bold text-brand-navy">{children}</h2>
    </div>
  )
}

export default function InstallRegisterPage({ session }) {
  const navigate = useNavigate()
  const user = session.user
  const [form, setForm] = useState({
    install_date: today(),
    address: '',
    lead_engineer: user.user_metadata?.full_name || '',
    partner_contractor: '',
    outdoor_serial: '',
    indoor_serial: '',
    model: '',
    hub_serial: '',
  })
  const [checks, setChecks] = useState(() => Object.fromEntries(CHECKS.map(c => [c.key, false])))
  const [photos, setPhotos] = useState(() => Object.fromEntries(PHOTOS.map(p => [p.key, []])))
  const [engSig, setEngSig] = useState(null)
  const [custSig, setCustSig] = useState(null)
  const [engDate, setEngDate] = useState(today())
  const [custDate, setCustDate] = useState(today())
  const [declared, setDeclared] = useState(false)
  const [error, setError] = useState('')
  const [progress, setProgress] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [result, setResult] = useState(null)

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  async function upload(path, blob, contentType) {
    const { error } = await supabase.storage.from(BUCKET).upload(path, blob, { contentType, upsert: true })
    if (error) throw new Error(`Échec du téléversement (${error.message})`)
    return path
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    const missing = []
    if (!form.address.trim() || !form.lead_engineer.trim() || !form.model || !form.outdoor_serial.trim() || !form.hub_serial.trim()) {
      missing.push('les informations obligatoires (adresse, ingénieur, modèle, numéros de série)')
    }
    const missingPhotos = PHOTOS.filter(p => photos[p.key].length === 0)
    if (missingPhotos.length) missing.push(`${missingPhotos.length} photo(s) manquante(s)`)
    if (!engSig || !custSig) missing.push('les deux signatures')
    if (!declared) missing.push('la déclaration')
    if (missing.length) { setError('Veuillez compléter : ' + missing.join(', ') + '.'); window.scrollTo({ top: 0, behavior: 'smooth' }); return }

    setSubmitting(true)
    try {
      const id = crypto.randomUUID()
      const base = `${user.id}/${id}`
      const photoPaths = {}
      let done = 0
      const total = PHOTOS.reduce((n, p) => n + photos[p.key].length, 0) + 2
      for (const p of PHOTOS) {
        photoPaths[p.key] = []
        for (let i = 0; i < photos[p.key].length; i++) {
          setProgress(`Envoi des photos… ${++done}/${total}`)
          const blob = await compressImage(photos[p.key][i].file)
          photoPaths[p.key].push(await upload(`${base}/${p.key}-${i + 1}.jpg`, blob, 'image/jpeg'))
        }
      }
      setProgress(`Envoi des signatures… ${++done}/${total}`)
      const engPath = await upload(`${base}/signature-engineer.png`, engSig, 'image/png')
      setProgress(`Envoi des signatures… ${++done}/${total}`)
      const custPath = await upload(`${base}/signature-customer.png`, custSig, 'image/png')

      setProgress('Enregistrement…')
      const token = (await supabase.auth.getSession()).data.session?.access_token
      const res = await fetch('/api/submit-installation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          id, ...form, checks, photos: photoPaths,
          engineer_signature_path: engPath, engineer_signed_on: engDate,
          customer_signature_path: custPath, customer_signed_on: custDate,
          declaration_accepted: declared,
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || 'Erreur serveur')
      setResult({ id })
    } catch (err) {
      setError(err.message || 'Une erreur est survenue. Veuillez réessayer.')
    }
    setSubmitting(false)
    setProgress('')
  }

  if (result) {
    return (
      <div className="min-h-screen bg-gray-50 safe-top safe-bottom flex items-center justify-center px-6">
        <div className="card text-center max-w-sm w-full">
          <div className="w-14 h-14 rounded-full bg-green-100 mx-auto mb-4 flex items-center justify-center">
            <svg className="w-7 h-7 text-brand-green" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>
          </div>
          <h1 className="font-bold text-brand-navy text-lg mb-1">Installation enregistrée</h1>
          <p className="text-sm text-gray-500 mb-5">
            Vous pouvez télécharger votre copie au format PDF, et la retrouver à tout moment dans « Mes installations ».
          </p>
          <button className="btn-primary mb-3" onClick={() => navigate(`/installations?id=${result.id}&print=1`)}>Télécharger la copie (PDF)</button>
          <button className="btn-secondary" onClick={() => navigate('/')}>Retour à l'accueil</button>
        </div>
      </div>
    )
  }

  const pre = CHECKS.filter(c => c.section === 'pre')
  const ctl = CHECKS.filter(c => c.section === 'ctl')
  const checkRow = c => (
    <label key={c.key} className="flex items-start gap-3 py-2 cursor-pointer">
      <input type="checkbox" className="mt-0.5 w-5 h-5 rounded border-gray-300 accent-[#5840FF] flex-shrink-0"
        checked={checks[c.key]} onChange={e => setChecks(s => ({ ...s, [c.key]: e.target.checked }))} />
      <span className="text-sm text-gray-700 leading-snug">{c.fr}</span>
    </label>
  )

  return (
    <div className="min-h-screen bg-gray-50 safe-top safe-bottom">
      <div className="bg-brand-navy px-6 pt-6 pb-4 sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/')} className="text-white/70">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
          </button>
          <div>
            <h1 className="text-white font-bold text-lg">Enregistrer une installation</h1>
            <p className="text-brand-cyan/70 text-xs">Registre fabricant — Cosy</p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="px-6 py-5 pb-16 space-y-6">
        {error && <div className="bg-red-50 border border-red-200 rounded-2xl px-4 py-3 text-sm text-red-700">{error}</div>}

        <div className="card space-y-4">
          <SectionTitle n={1}>Chantier et équipement</SectionTitle>
          <div><label className="form-label">Date<span className="text-red-400 ml-1">*</span></label>
            <input type="date" className="input-field" value={form.install_date} onChange={e => set('install_date', e.target.value)} required /></div>
          <div><label className="form-label">Adresse<span className="text-red-400 ml-1">*</span></label>
            <textarea className="input-field" rows={2} value={form.address} onChange={e => set('address', e.target.value)} required /></div>
          <div><label className="form-label">Ingénieur responsable<span className="text-red-400 ml-1">*</span></label>
            <input className="input-field" value={form.lead_engineer} onChange={e => set('lead_engineer', e.target.value)} required /></div>
          <div><label className="form-label">Partenaire / entreprise</label>
            <input className="input-field" value={form.partner_contractor} onChange={e => set('partner_contractor', e.target.value)} /></div>
          <div><label className="form-label">Modèle<span className="text-red-400 ml-1">*</span></label>
            <select className="input-field" value={form.model} onChange={e => set('model', e.target.value)} required>
              <option value="">Sélectionner…</option>
              {MODELS.map(m => <option key={m} value={m}>{m}</option>)}
            </select></div>
          <div><label className="form-label">N° de série de l'unité extérieure Cosy<span className="text-red-400 ml-1">*</span></label>
            <input className="input-field" value={form.outdoor_serial} onChange={e => set('outdoor_serial', e.target.value)} required /></div>
          <div><label className="form-label">N° de série de l'unité intérieure / du ballon</label>
            <input className="input-field" value={form.indoor_serial} onChange={e => set('indoor_serial', e.target.value)} /></div>
          <div><label className="form-label">Cosy Hub / passerelle — adresse MAC ou n° de série<span className="text-red-400 ml-1">*</span></label>
            <input className="input-field" value={form.hub_serial} onChange={e => set('hub_serial', e.target.value)} required /></div>
        </div>

        <div className="card space-y-3">
          <SectionTitle n={2}>Contrôles avant mise en service et installation</SectionTitle>
          <div className="divide-y divide-gray-100">{pre.map(checkRow)}</div>
          {PHOTOS.filter(p => p.section === 'pre').map(p => (
            <PhotoField key={p.key} label={p.fr} required value={photos[p.key]} onChange={v => setPhotos(s => ({ ...s, [p.key]: v }))} />
          ))}
        </div>

        <div className="card space-y-4">
          <SectionTitle n={3}>Électricité et isolation</SectionTitle>
          {PHOTOS.filter(p => p.section === 'elec').map(p => (
            <PhotoField key={p.key} label={p.fr} required value={photos[p.key]} onChange={v => setPhotos(s => ({ ...s, [p.key]: v }))} />
          ))}
        </div>

        <div className="card space-y-3">
          <SectionTitle n={4}>Connectivité, commandes et remise au client</SectionTitle>
          <div className="divide-y divide-gray-100">{ctl.map(checkRow)}</div>
        </div>

        <div className="card space-y-4">
          <SectionTitle n={5}>Validation et déclaration</SectionTitle>
          <label className="flex items-start gap-3 cursor-pointer">
            <input type="checkbox" className="mt-0.5 w-5 h-5 rounded border-gray-300 accent-[#5840FF] flex-shrink-0"
              checked={declared} onChange={e => setDeclared(e.target.checked)} />
            <span className="text-sm text-gray-700 leading-snug">{DECLARATION.fr}</span>
          </label>
          <SignaturePad label="Signature de l'ingénieur de mise en service" onChange={setEngSig} />
          <div><label className="form-label">Date</label>
            <input type="date" className="input-field" value={engDate} onChange={e => setEngDate(e.target.value)} /></div>
          <SignaturePad label="Signature du client" onChange={setCustSig} />
          <div><label className="form-label">Date</label>
            <input type="date" className="input-field" value={custDate} onChange={e => setCustDate(e.target.value)} /></div>
        </div>

        <button type="submit" className="btn-primary" disabled={submitting}>
          {submitting ? (progress || 'Envoi…') : "Envoyer l'enregistrement"}
        </button>
        <p className="text-center text-xs text-gray-400">Une copie PDF sera téléchargeable après l'envoi.</p>
      </form>
    </div>
  )
}
