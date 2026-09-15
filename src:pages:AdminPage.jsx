import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

const URGENCY = {
  low:    { label: 'Faible',   bg: 'bg-green-100',  text: 'text-green-700' },
  medium: { label: 'Normale',  bg: 'bg-yellow-100', text: 'text-yellow-700' },
  high:   { label: 'Urgente',  bg: 'bg-red-100',    text: 'text-red-600' },
}

const STATUS = {
  open:        { label: 'Ouvert',      bg: 'bg-blue-100',   text: 'text-blue-700' },
  in_progress: { label: 'En cours',    bg: 'bg-yellow-100', text: 'text-yellow-700' },
  resolved:    { label: 'Résolu',      bg: 'bg-green-100',  text: 'text-green-700' },
  closed:      { label: 'Fermé',       bg: 'bg-gray-100',   text: 'text-gray-500' },
}

function formatDate(iso) {
  return new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
}

function Badge({ value, map }) {
  const s = map[value] || { label: value, bg: 'bg-gray-100', text: 'text-gray-500' }
  return <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${s.bg} ${s.text}`}>{s.label}</span>
}

export default function AdminPage({ session }) {
  const navigate = useNavigate()
  const [requests, setRequests] = useState([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState(null)
  const [reply, setReply] = useState('')
  const [saving, setSaving] = useState(false)
  const [filter, setFilter] = useState('open')

  useEffect(() => {
    load()
  }, [])

  async function load() {
    const { data } = await supabase
      .from('fr_support_requests')
      .select('*')
      .order('created_at', { ascending: false })
    setRequests(data || [])
    setLoading(false)
  }

  async function saveReply() {
    if (!reply.trim()) return
    setSaving(true)
    const { error } = await supabase
      .from('fr_support_requests')
      .update({
        admin_reply: reply.trim(),
        replied_at: new Date().toISOString(),
        replied_by: session?.user?.email,
        status: 'in_progress',
      })
      .eq('id', selected.id)

    if (!error) {
      setRequests(rs => rs.map(r => r.id === selected.id
        ? { ...r, admin_reply: reply.trim(), replied_at: new Date().toISOString(), status: 'in_progress' }
        : r
      ))
      setSelected(s => ({ ...s, admin_reply: reply.trim(), status: 'in_progress' }))
      setReply('')
    }
    setSaving(false)
  }

  async function updateStatus(status) {
    await supabase.from('fr_support_requests').update({ status }).eq('id', selected.id)
    setRequests(rs => rs.map(r => r.id === selected.id ? { ...r, status } : r))
    setSelected(s => ({ ...s, status }))
  }

  const filtered = requests.filter(r => filter === 'all' || r.status === filter)

  // ── Detail view ─────────────────────────────────────────────────────────────
  if (selected) {
    return (
      <div className="min-h-screen bg-gray-50 safe-top safe-bottom">
        <div className="bg-brand-navy px-6 pt-6 pb-5">
          <div className="flex items-center gap-3 mb-1">
            <button onClick={() => setSelected(null)} className="text-white/70">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <h1 className="text-white font-bold text-lg">Demande</h1>
            <div className="ml-auto flex gap-2">
              <Badge value={selected.urgency} map={URGENCY} />
              <Badge value={selected.status} map={STATUS} />
            </div>
          </div>
          <p className="text-white/50 text-xs ml-8">{formatDate(selected.created_at)} · {selected.user_email}</p>
        </div>

        <div className="px-6 py-5 space-y-4 pb-12">

          {/* Info row */}
          <div className="card space-y-2">
            {selected.site_address && (
              <div className="flex gap-2 text-sm">
                <span className="text-gray-400 w-24 flex-shrink-0">Adresse</span>
                <span className="text-brand-navy font-medium">{selected.site_address}</span>
              </div>
            )}
            <div className="flex gap-2 text-sm">
              <span className="text-gray-400 w-24 flex-shrink-0">Problème</span>
              <span className="text-brand-navy font-medium">{selected.issue_type}</span>
            </div>
            {selected.fault_code && (
              <div className="flex gap-2 text-sm">
                <span className="text-gray-400 w-24 flex-shrink-0">Code défaut</span>
                <span className="font-mono font-bold text-red-600">{selected.fault_code}</span>
              </div>
            )}
            {selected.contact_phone && (
              <div className="flex gap-2 text-sm">
                <span className="text-gray-400 w-24 flex-shrink-0">Téléphone</span>
                <a href={`tel:${selected.contact_phone}`} className="text-brand-purple font-medium">{selected.contact_phone}</a>
              </div>
            )}
          </div>

          {/* Description EN */}
          <div className="card">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Description (English)</p>
            <p className="text-sm text-brand-navy leading-relaxed">
              {selected.description_en || <span className="text-gray-400 italic">Translation pending — DeepL key not set</span>}
            </p>
          </div>

          {/* Description FR */}
          <div className="card bg-gray-50">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Original (Français)</p>
            <p className="text-sm text-gray-600 leading-relaxed">{selected.description_fr}</p>
          </div>

          {/* Photos */}
          {selected.photo_urls?.length > 0 && (
            <div className="card">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Photos</p>
              <div className="flex gap-2 flex-wrap">
                {selected.photo_urls.map((url, i) => (
                  <a key={i} href={url} target="_blank" rel="noopener noreferrer">
                    <img src={url} alt="" className="w-20 h-20 rounded-xl object-cover border border-gray-200" />
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* Existing reply */}
          {selected.admin_reply && (
            <div className="card border-brand-purple/20 bg-brand-purple/5">
              <p className="text-xs font-semibold text-brand-purple uppercase tracking-wider mb-2">Reply sent</p>
              <p className="text-sm text-brand-navy leading-relaxed">{selected.admin_reply}</p>
              <p className="text-xs text-gray-400 mt-2">{selected.replied_by} · {formatDate(selected.replied_at)}</p>
            </div>
          )}

          {/* Reply box */}
          <div>
            <label className="form-label">
              {selected.admin_reply ? 'Update reply' : 'Write a reply'} <span className="font-normal text-gray-400">(English)</span>
            </label>
            <textarea
              className="input-field resize-none"
              rows={4}
              placeholder="Type your reply in English…"
              value={reply}
              onChange={e => setReply(e.target.value)}
              defaultValue={selected.admin_reply || ''}
            />
            <button onClick={saveReply} disabled={saving || !reply.trim()}
              className="btn-primary mt-2" type="button">
              {saving ? 'Saving…' : 'Send reply'}
            </button>
          </div>

          {/* Status controls */}
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Update status</p>
            <div className="flex gap-2 flex-wrap">
              {Object.entries(STATUS).map(([val, s]) => (
                <button key={val} type="button" onClick={() => updateStatus(val)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-colors ${
                    selected.status === val ? `${s.bg} ${s.text} border-current` : 'bg-white border-gray-200 text-gray-500'
                  }`}>
                  {s.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    )
  }

  // ── List view ────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-50 safe-top safe-bottom">
      <div className="bg-brand-navy px-6 pt-6 pb-5 sticky top-0 z-10">
        <div className="flex items-center gap-3 mb-4">
          <button onClick={() => navigate('/')} className="text-white/70">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <h1 className="text-white font-bold text-lg">Admin — Demandes</h1>
          <span className="ml-auto text-white/40 text-sm">{requests.length}</span>
        </div>
        {/* Filter tabs */}
        <div className="flex gap-2 overflow-x-auto">
          {[['open', 'Ouverts'], ['in_progress', 'En cours'], ['resolved', 'Résolus'], ['all', 'Tout']].map(([val, label]) => (
            <button key={val} onClick={() => setFilter(val)}
              className={`flex-shrink-0 text-xs font-semibold px-3 py-1.5 rounded-xl transition-colors ${
                filter === val ? 'bg-white text-brand-navy' : 'bg-white/20 text-white'
              }`}>
              {label}
              {val !== 'all' && (
                <span className="ml-1 opacity-60">
                  {requests.filter(r => r.status === val).length}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      <div className="px-6 py-4 pb-12">
        {loading ? (
          <div className="flex justify-center py-16">
            <div className="w-6 h-6 rounded-full border-2 border-brand-purple border-t-transparent animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <p className="text-center text-gray-400 text-sm py-12">Aucune demande</p>
        ) : (
          <div className="space-y-3">
            {filtered.map(req => (
              <button key={req.id} onClick={() => { setSelected(req); setReply(req.admin_reply || '') }}
                className="w-full bg-white rounded-2xl border border-gray-100 shadow-sm px-4 py-4 text-left active:bg-gray-50 transition-colors">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex gap-1.5 flex-wrap">
                    <Badge value={req.urgency} map={URGENCY} />
                    <Badge value={req.status} map={STATUS} />
                    {req.admin_reply && (
                      <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-brand-purple/10 text-brand-purple">Répondu</span>
                    )}
                  </div>
                  <span className="text-xs text-gray-400 flex-shrink-0">{formatDate(req.created_at)}</span>
                </div>
                <p className="font-semibold text-sm text-brand-navy mb-1">
                  {req.issue_type} {req.fault_code ? `— ${req.fault_code}` : ''}
                </p>
                <p className="text-xs text-gray-500 line-clamp-2 leading-relaxed">
                  {req.description_en || req.description_fr}
                </p>
                {req.site_address && (
                  <p className="text-xs text-gray-400 mt-1.5">{req.site_address}</p>
                )}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
