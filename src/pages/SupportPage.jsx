import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

const ISSUE_TYPES = [
  { value: 'electrical', label: 'Problème électrique' },
  { value: 'mechanical', label: 'Problème mécanique' },
  { value: 'fault_code', label: 'Code défaut' },
  { value: 'performance', label: 'Performance insuffisante' },
  { value: 'commissioning', label: 'Mise en service' },
  { value: 'noise', label: 'Bruit inhabituel' },
  { value: 'connectivity', label: 'Problème de connectivité' },
  { value: 'other', label: 'Autre' },
]

const FAULT_CODES = [
  'Débit faible ou bloqué',
  'Pas de communication avec la pompe à chaleur',
  'Vitesse ventilateur faible / bloquée',
  'Perte de communication ventilateur',
  'Ventilateur défaillant',
  'Pas de communication avec le manifold',
  'Sous-tension alimentation CA',
  'Perte communication onduleur',
  'Capteur température refoulement — valeur basse ou court-circuit',
  'Surchauffe faible / élevée',
  'Échec programmation onduleur',
  'Verrouillage : entraînement',
]

const URGENCY_LEVELS = [
  { value: 'low',    label: 'Faible',  description: 'Question',                                                        color: 'bg-green-50 border-green-200 text-green-700' },
  { value: 'medium', label: 'Normale', description: 'Un problème, non urgent',                                         color: 'bg-yellow-50 border-yellow-200 text-yellow-700' },
  { value: 'high',   label: 'Urgente', description: 'La PAC ne chauffe pas / ne produit pas d\'eau chaude, ou est dangereuse', color: 'bg-red-50 border-red-200 text-red-700' },
]

export default function SupportPage({ session }) {
  const navigate = useNavigate()
  const fileInputRef = useRef(null)
  const [faultOpen, setFaultOpen] = useState(false)
  const [form, setForm] = useState({
    installation_company: '',
    site_address: '',
    issue_type: '',
    fault_codes: [],   // multi-select
    urgency: 'medium',
    description: '',
    contact_phone: '',
    contact_email: '',
  })
  const [photos, setPhotos] = useState([])
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState('')

  function update(field, value) {
    setForm(f => ({ ...f, [field]: value }))
  }

  function toggleFaultCode(code) {
    setForm(f => ({
      ...f,
      fault_codes: f.fault_codes.includes(code)
        ? f.fault_codes.filter(c => c !== code)
        : [...f.fault_codes, code],
    }))
  }

  function handlePhotoChange(e) {
    const files = Array.from(e.target.files)
    const newPhotos = files.map(file => ({ file, preview: URL.createObjectURL(file) }))
    setPhotos(p => [...p, ...newPhotos].slice(0, 5))
    e.target.value = ''
  }

  function removePhoto(index) {
    setPhotos(p => { URL.revokeObjectURL(p[index].preview); return p.filter((_, i) => i !== index) })
  }

  async function uploadPhotos(requestId) {
    const urls = []
    for (let i = 0; i < photos.length; i++) {
      const { file } = photos[i]
      const ext = file.name.split('.').pop()
      const path = `fr-support/${requestId}/photo-${i + 1}.${ext}`
      const { error } = await supabase.storage.from('support-photos').upload(path, file, { upsert: true })
      if (!error) {
        const { data } = supabase.storage.from('support-photos').getPublicUrl(path)
        urls.push(data.publicUrl)
      }
    }
    return urls
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.issue_type || !form.description.trim()) {
      setError('Veuillez remplir tous les champs obligatoires.')
      return
    }
    setError('')
    setSubmitting(true)

    const payload = {
      ...form,
      fault_code: form.fault_codes.join(', '), // backward-compat string for translate API
      user_id: session?.user?.id,
      user_email: session?.user?.email,
      user_name: session?.user?.user_metadata?.full_name || session?.user?.email,
      photo_count: photos.length,
    }

    try {
      const res = await fetch('/api/translate-support', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!res.ok) throw new Error('Erreur réseau')
      const { id } = await res.json()

      if (photos.length > 0 && id) {
        const photoUrls = await uploadPhotos(id)
        if (photoUrls.length > 0) {
          await supabase.from('fr_support_requests').update({ photo_urls: photoUrls }).eq('id', id)
        }
      }
      setSubmitted(true)
    } catch {
      const { data: saved, error: dbErr } = await supabase.from('fr_support_requests').insert({
        installation_company: form.installation_company,
        site_address: form.site_address,
        issue_type: form.issue_type,
        fault_code: form.fault_codes.join(', '),
        urgency: form.urgency,
        description_fr: form.description,
        description_en: null,
        contact_phone: form.contact_phone,
        contact_email: form.contact_email,
        user_id: session?.user?.id,
        user_email: session?.user?.email,
      }).select().single()

      if (dbErr) setError('Erreur lors de l\'envoi. Veuillez réessayer.')
      else { if (photos.length > 0 && saved?.id) await uploadPhotos(saved.id); setSubmitted(true) }
    }

    setSubmitting(false)
  }

  const emptyForm = { installation_company: '', site_address: '', issue_type: '', fault_codes: [], urgency: 'medium', description: '', contact_phone: '', contact_email: '' }

  if (submitted) {
    return (
      <div className="min-h-screen bg-gray-50 safe-top safe-bottom flex flex-col">
        <div className="bg-gradient-to-br from-brand-pink to-brand-purple px-6 pt-6 pb-6">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate('/')} className="text-white/70">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
            </button>
            <h1 className="text-white font-bold text-lg">Demande envoyée</h1>
          </div>
        </div>
        <div className="flex-1 flex flex-col items-center justify-center px-6 pb-12">
          <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mb-5">
            <svg className="w-10 h-10 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
          </div>
          <h2 className="text-xl font-bold text-brand-navy text-center mb-2">Demande transmise !</h2>
          <p className="text-gray-500 text-center text-sm mb-8 max-w-xs leading-relaxed">
            Votre demande a été envoyée à l'équipe technique Octopus Energy. Vous recevrez une réponse dans les meilleurs délais.
          </p>
          <button onClick={() => { setSubmitted(false); setPhotos([]); setForm(emptyForm) }} className="btn-secondary max-w-xs">Nouvelle demande</button>
          <button onClick={() => navigate('/')} className="mt-3 text-sm text-brand-purple font-medium">Retour à l'accueil</button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 safe-top safe-bottom">
      <div className="bg-gradient-to-br from-brand-pink to-brand-purple px-6 pt-6 pb-6">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/')} className="text-white/70">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
          </button>
          <div>
            <h1 className="text-white font-bold text-lg">Demande d'assistance</h1>
            <p className="text-white/60 text-xs mt-0.5">Réponse en anglais traduite automatiquement</p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="px-6 py-5 space-y-5 pb-12">

        {/* Installation company */}
        <div>
          <label className="form-label">Entreprise d'installation</label>
          <input type="text" className="input-field" placeholder="Ex. Chauffage Dupont & Fils"
            value={form.installation_company} onChange={e => update('installation_company', e.target.value)} />
        </div>

        {/* Site address */}
        <div>
          <label className="form-label">Adresse du chantier</label>
          <input type="text" className="input-field" placeholder="Ex. 12 rue de la Paix, 75001 Paris"
            value={form.site_address} onChange={e => update('site_address', e.target.value)} />
        </div>

        {/* Issue type */}
        <div>
          <label className="form-label">Type de problème <span className="text-red-500">*</span></label>
          <div className="grid grid-cols-2 gap-2 mt-1">
            {ISSUE_TYPES.map(it => (
              <button key={it.value} type="button" onClick={() => update('issue_type', it.value)}
                className={`text-left px-3 py-2.5 rounded-xl border text-sm font-medium transition-colors ${
                  form.issue_type === it.value
                    ? 'bg-brand-purple/10 border-brand-purple text-brand-purple'
                    : 'bg-white border-gray-200 text-gray-700'
                }`}>
                {it.label}
              </button>
            ))}
          </div>
        </div>

        {/* Fault codes — multi-select */}
        <div>
          <label className="form-label">Code(s) défaut (si applicable)</label>

          {/* Trigger button */}
          <button type="button" onClick={() => setFaultOpen(o => !o)}
            className="w-full input-field flex items-center justify-between text-left">
            <span className={form.fault_codes.length ? 'text-brand-navy' : 'text-gray-400'}>
              {form.fault_codes.length
                ? `${form.fault_codes.length} code${form.fault_codes.length > 1 ? 's' : ''} sélectionné${form.fault_codes.length > 1 ? 's' : ''}`
                : 'Sélectionner un ou plusieurs codes…'}
            </span>
            <svg className={`w-4 h-4 text-gray-400 flex-shrink-0 transition-transform ${faultOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {/* Dropdown list */}
          {faultOpen && (
            <div className="mt-1 bg-white border border-gray-200 rounded-2xl shadow-lg overflow-hidden">
              {FAULT_CODES.map(code => {
                const selected = form.fault_codes.includes(code)
                return (
                  <button key={code} type="button" onClick={() => toggleFaultCode(code)}
                    className={`w-full flex items-center gap-3 px-4 py-3 text-left text-sm border-b border-gray-50 last:border-0 transition-colors ${selected ? 'bg-brand-purple/5' : 'hover:bg-gray-50'}`}>
                    <div className={`w-5 h-5 rounded flex-shrink-0 border-2 flex items-center justify-center transition-colors ${selected ? 'bg-brand-purple border-brand-purple' : 'border-gray-300'}`}>
                      {selected && (
                        <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </div>
                    <span className={selected ? 'text-brand-navy font-medium' : 'text-gray-700'}>{code}</span>
                  </button>
                )
              })}
              <button type="button" onClick={() => setFaultOpen(false)}
                className="w-full py-2.5 text-sm text-brand-purple font-semibold border-t border-gray-100 bg-gray-50">
                Fermer
              </button>
            </div>
          )}

          {/* Selected tags */}
          {form.fault_codes.length > 0 && !faultOpen && (
            <div className="flex flex-wrap gap-1.5 mt-2">
              {form.fault_codes.map(code => (
                <span key={code} className="flex items-center gap-1 bg-brand-purple/10 text-brand-purple text-xs font-medium px-2.5 py-1 rounded-full">
                  {code}
                  <button type="button" onClick={() => toggleFaultCode(code)} className="ml-0.5 opacity-60 hover:opacity-100">✕</button>
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Urgency */}
        <div>
          <label className="form-label">Urgence</label>
          <div className="space-y-2 mt-1">
            {URGENCY_LEVELS.map(u => (
              <button key={u.value} type="button" onClick={() => update('urgency', u.value)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border-2 text-left transition-all ${
                  form.urgency === u.value ? u.color + ' border-current' : 'bg-white border-gray-100 text-gray-600'
                }`}>
                <div className={`w-4 h-4 rounded-full border-2 flex-shrink-0 ${form.urgency === u.value ? 'border-current bg-current' : 'border-gray-300'}`} />
                <div>
                  <p className="font-semibold text-sm">{u.label}</p>
                  <p className="text-xs opacity-70">{u.description}</p>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Description */}
        <div>
          <label className="form-label">Description du problème <span className="text-red-500">*</span></label>
          <textarea className="input-field resize-none" rows={5}
            placeholder="Décrivez le problème en détail : symptômes observés, mesures déjà effectuées, conditions (météo, âge de l'installation, etc.)…"
            value={form.description} onChange={e => update('description', e.target.value)} />
          <p className="text-xs text-gray-400 mt-1">Votre message sera traduit automatiquement en anglais pour l'équipe UK.</p>
        </div>

        {/* Photos */}
        <div>
          <label className="form-label">Photos (optionnel — max 5)</label>
          <input ref={fileInputRef} type="file" accept="image/*" multiple className="hidden" onChange={handlePhotoChange} />
          {photos.length > 0 && (
            <div className="flex gap-2 flex-wrap mb-3">
              {photos.map((p, i) => (
                <div key={i} className="relative w-20 h-20 rounded-xl overflow-hidden border border-gray-200">
                  <img src={p.preview} alt="" className="w-full h-full object-cover" />
                  <button type="button" onClick={() => removePhoto(i)}
                    className="absolute top-0.5 right-0.5 w-5 h-5 rounded-full bg-black/60 text-white flex items-center justify-center text-xs">✕</button>
                </div>
              ))}
            </div>
          )}
          {photos.length < 5 && (
            <button type="button" onClick={() => fileInputRef.current?.click()}
              className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl border-2 border-dashed border-gray-200 text-gray-400 text-sm font-medium active:bg-gray-50 transition-colors">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              Ajouter des photos
            </button>
          )}
        </div>

        {/* Contact */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="form-label">Téléphone</label>
            <input type="tel" className="input-field" placeholder="+33 6 12 34 56 78"
              value={form.contact_phone} onChange={e => update('contact_phone', e.target.value)} />
          </div>
          <div>
            <label className="form-label">Email</label>
            <input type="email" className="input-field" placeholder="vous@exemple.fr"
              value={form.contact_email} onChange={e => update('contact_email', e.target.value)} />
          </div>
        </div>

        {error && <p className="text-sm text-red-500 bg-red-50 rounded-xl px-4 py-3">{error}</p>}

        <button type="submit" className="btn-primary" disabled={submitting}>
          {submitting ? 'Envoi en cours…' : `Envoyer la demande${photos.length > 0 ? ` (${photos.length} photo${photos.length > 1 ? 's' : ''})` : ''}`}
        </button>
      </form>
    </div>
  )
}
