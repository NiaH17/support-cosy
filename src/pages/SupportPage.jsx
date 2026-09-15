import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

const ISSUE_TYPES = [
  { value: 'installation', label: 'Problème d\'installation' },
  { value: 'fault_code', label: 'Code défaut' },
  { value: 'performance', label: 'Performance insuffisante' },
  { value: 'configuration', label: 'Configuration / paramétrage' },
  { value: 'noise', label: 'Bruit inhabituel' },
  { value: 'connectivity', label: 'Problème de connectivité' },
  { value: 'other', label: 'Autre' },
]

const URGENCY_LEVELS = [
  { value: 'low', label: 'Faible', description: 'Peut attendre 2–3 jours', color: 'bg-green-50 border-green-200 text-green-700' },
  { value: 'medium', label: 'Normale', description: 'Dans la journée', color: 'bg-yellow-50 border-yellow-200 text-yellow-700' },
  { value: 'high', label: 'Urgente', description: 'Client sans chauffage', color: 'bg-red-50 border-red-200 text-red-700' },
]

export default function SupportPage({ session }) {
  const navigate = useNavigate()
  const [form, setForm] = useState({
    site_address: '',
    issue_type: '',
    fault_code: '',
    urgency: 'medium',
    description: '',
    contact_phone: '',
  })
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState('')

  function update(field, value) {
    setForm(f => ({ ...f, [field]: value }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.issue_type || !form.description.trim()) {
      setError('Veuillez remplir tous les champs obligatoires.')
      return
    }
    setError('')
    setSubmitting(true)

    try {
      // Send to our translation endpoint
      const res = await fetch('/api/translate-support', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          user_id: session?.user?.id,
          user_email: session?.user?.email,
          user_name: session?.user?.user_metadata?.full_name || session?.user?.email,
        }),
      })
      if (!res.ok) throw new Error('Erreur réseau')
      setSubmitted(true)
    } catch (err) {
      // Fallback: save directly to Supabase without translation
      const { error: dbErr } = await supabase.from('fr_support_requests').insert({
        ...form,
        user_id: session?.user?.id,
        user_email: session?.user?.email,
        description_fr: form.description,
        description_en: null,
      })
      if (dbErr) setError('Erreur lors de l\'envoi. Veuillez réessayer.')
      else setSubmitted(true)
    }

    setSubmitting(false)
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-gray-50 safe-top safe-bottom flex flex-col">
        <div className="bg-gradient-to-br from-brand-pink to-brand-purple px-6 pt-6 pb-6">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate('/')} className="text-white/70">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <h1 className="text-white font-bold text-lg">Demande envoyée</h1>
          </div>
        </div>
        <div className="flex-1 flex flex-col items-center justify-center px-6 pb-12">
          <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mb-5">
            <svg className="w-10 h-10 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-brand-navy text-center mb-2">Demande transmise !</h2>
          <p className="text-gray-500 text-center text-sm mb-8 max-w-xs leading-relaxed">
            Votre demande a été envoyée à l'équipe technique Octopus Energy. Vous recevrez une réponse dans les meilleurs délais.
          </p>
          <button onClick={() => { setSubmitted(false); setForm({ site_address: '', issue_type: '', fault_code: '', urgency: 'medium', description: '', contact_phone: '' }) }}
            className="btn-secondary max-w-xs">
            Nouvelle demande
          </button>
          <button onClick={() => navigate('/')} className="mt-3 text-sm text-brand-purple font-medium">
            Retour à l'accueil
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 safe-top safe-bottom">
      {/* Header */}
      <div className="bg-gradient-to-br from-brand-pink to-brand-purple px-6 pt-6 pb-6">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/')} className="text-white/70">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div>
            <h1 className="text-white font-bold text-lg">Demande d'assistance</h1>
            <p className="text-white/60 text-xs mt-0.5">Réponse en anglais traduite automatiquement</p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="px-6 py-5 space-y-5 pb-12">

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
              <button
                key={it.value}
                type="button"
                onClick={() => update('issue_type', it.value)}
                className={`text-left px-3 py-2.5 rounded-xl border text-sm font-medium transition-colors ${
                  form.issue_type === it.value
                    ? 'bg-brand-purple/10 border-brand-purple text-brand-purple'
                    : 'bg-white border-gray-200 text-gray-700'
                }`}
              >
                {it.label}
              </button>
            ))}
          </div>
        </div>

        {/* Fault code (optional) */}
        <div>
          <label className="form-label">Code défaut (si applicable)</label>
          <input type="text" className="input-field" placeholder="Ex. E3, E7…"
            value={form.fault_code} onChange={e => update('fault_code', e.target.value)} />
        </div>

        {/* Urgency */}
        <div>
          <label className="form-label">Urgence</label>
          <div className="space-y-2 mt-1">
            {URGENCY_LEVELS.map(u => (
              <button
                key={u.value}
                type="button"
                onClick={() => update('urgency', u.value)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border-2 text-left transition-all ${
                  form.urgency === u.value ? u.color + ' border-current' : 'bg-white border-gray-100 text-gray-600'
                }`}
              >
                <div className={`w-4 h-4 rounded-full border-2 flex-shrink-0 ${
                  form.urgency === u.value ? 'border-current bg-current' : 'border-gray-300'
                }`} />
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
          <textarea
            className="input-field resize-none"
            rows={5}
            placeholder="Décrivez le problème en détail : symptômes observés, mesures déjà effectuées, conditions (météo, âge de l'installation, etc.)…"
            value={form.description}
            onChange={e => update('description', e.target.value)}
          />
          <p className="text-xs text-gray-400 mt-1">Votre message sera traduit automatiquement en anglais pour l'équipe UK.</p>
        </div>

        {/* Phone */}
        <div>
          <label className="form-label">Téléphone de contact</label>
          <input type="tel" className="input-field" placeholder="Ex. +33 6 12 34 56 78"
            value={form.contact_phone} onChange={e => update('contact_phone', e.target.value)} />
        </div>

        {error && <p className="text-sm text-red-500 bg-red-50 rounded-xl px-4 py-3">{error}</p>}

        <button type="submit" className="btn-primary" disabled={submitting}>
          {submitting ? 'Envoi en cours…' : 'Envoyer la demande'}
        </button>
      </form>
    </div>
  )
}
