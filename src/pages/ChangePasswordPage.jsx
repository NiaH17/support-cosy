import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

export default function ChangePasswordPage() {
  const navigate = useNavigate()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)
  const [saving, setSaving] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    if (password.length < 8) { setError('Le mot de passe doit contenir au moins 8 caractères.'); return }
    if (password !== confirm) { setError('Les deux mots de passe ne correspondent pas.'); return }
    setSaving(true)
    const { error } = await supabase.auth.updateUser({ password })
    setSaving(false)
    if (error) setError(error.message)
    else setDone(true)
  }

  return (
    <div className="min-h-screen bg-gray-50 safe-top safe-bottom">
      <div className="bg-brand-navy px-6 pt-6 pb-4">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/')} className="text-white/70">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
          </button>
          <h1 className="text-white font-bold text-lg">Changer mon mot de passe</h1>
        </div>
      </div>
      <div className="px-6 py-6">
        {done ? (
          <div className="card text-center">
            <p className="font-semibold text-brand-navy mb-1">Mot de passe modifié</p>
            <p className="text-sm text-gray-500 mb-4">Utilisez-le lors de votre prochaine connexion.</p>
            <button className="btn-primary" onClick={() => navigate('/')}>Retour à l'accueil</button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="card space-y-4">
            <div><label className="form-label">Nouveau mot de passe</label>
              <input type="password" className="input-field" value={password} onChange={e => setPassword(e.target.value)} autoComplete="new-password" required /></div>
            <div><label className="form-label">Confirmer le mot de passe</label>
              <input type="password" className="input-field" value={confirm} onChange={e => setConfirm(e.target.value)} autoComplete="new-password" required /></div>
            {error && <p className="text-sm text-red-500">{error}</p>}
            <button type="submit" className="btn-primary" disabled={saving}>{saving ? 'Enregistrement…' : 'Enregistrer'}</button>
          </form>
        )}
      </div>
    </div>
  )
}
