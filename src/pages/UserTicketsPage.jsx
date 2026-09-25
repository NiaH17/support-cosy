import { useEffect, useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

const ISSUE_LABELS = {
  electrical: 'Problème électrique', mechanical: 'Problème mécanique',
  fault_code: 'Code erreur', performance: 'Mauvaises performances',
  commissioning: 'Mise en service', noise: 'Bruit inhabituel',
  connectivity: 'Connectivité', other: 'Autre',
}
const STATUS_FR = {
  open:        { label: 'Ouvert',   bg: 'bg-blue-100',   text: 'text-blue-700' },
  in_progress: { label: 'En cours', bg: 'bg-yellow-100', text: 'text-yellow-700' },
  closed:      { label: 'Fermé',    bg: 'bg-gray-100',   text: 'text-gray-500' },
}

function formatDate(iso) {
  return new Date(iso).toLocaleString('fr-FR', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })
}
function Badge({ value, map }) {
  const s = map[value] || map['closed'] || { label: value, bg: 'bg-gray-100', text: 'text-gray-500' }
  return <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${s.bg} ${s.text}`}>{s.label}</span>
}

// ── Notification banner ───────────────────────────────────────────────────────

function NotificationBanner({ notifications, onView, onDismiss }) {
  if (notifications.length === 0) return null
  const n = notifications[0]
  return (
    <div className="fixed top-0 left-0 right-0 z-50 px-4" style={{ paddingTop: 'max(env(safe-area-inset-top), 8px)' }}>
      <div className="mt-2 bg-brand-navy border border-brand-purple/40 rounded-2xl shadow-2xl px-4 py-3 flex items-center gap-3">
        <div className="w-8 h-8 rounded-full bg-brand-cyan/20 flex items-center justify-center flex-shrink-0">
          <svg className="w-4 h-4 text-brand-cyan" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-white text-xs font-bold">Octopus Energy a répondu</p>
          <p className="text-white/60 text-xs truncate">{n.issue}</p>
        </div>
        <button onClick={() => onView(n)} className="flex-shrink-0 bg-brand-purple text-white text-xs font-semibold px-3 py-1.5 rounded-xl">
          Voir
        </button>
        <button onClick={() => onDismiss(n.id)} className="flex-shrink-0 text-white/40 text-lg leading-none">×</button>
      </div>
      {notifications.length > 1 && (
        <p className="text-center text-white/40 text-xs mt-1">+{notifications.length - 1} autre(s)</p>
      )}
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function UserTicketsPage({ session }) {
  const navigate = useNavigate()
  const threadRef = useRef(null)
  const requestsRef = useRef([])
  const [requests, setRequests] = useState([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState(null)
  const [messages, setMessages] = useState([])
  const [filter, setFilter] = useState('active')
  const [replyText, setReplyText] = useState('')
  const [replySending, setReplySending] = useState(false)
  const [closing, setClosing] = useState(false)
  const [notifications, setNotifications] = useState([])

  useEffect(() => { requestsRef.current = requests }, [requests])

  useEffect(() => {
    loadRequests()

    const channel = supabase
      .channel('user-messages')
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'fr_support_messages', filter: 'sender=eq.admin',
      }, (payload) => {
        const msg = payload.new
        if (msg.is_internal) return
        const req = requestsRef.current.find(r => r.id === msg.request_id)
        if (!req) return // not the user's ticket

        // Always append to thread if open
        setMessages(m => {
          if (m.length > 0 && m[0].request_id === msg.request_id) {
            setTimeout(() => threadRef.current?.scrollTo({ top: threadRef.current.scrollHeight, behavior: 'smooth' }), 100)
            return [...m, msg]
          }
          return m
        })
        // Always show banner
        setNotifications(n => [...n, {
          id: msg.id,
          request_id: msg.request_id,
          issue: ISSUE_LABELS[req.issue_type] || req.issue_type,
          req,
        }])
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [])

  async function loadRequests() {
    const { data } = await supabase
      .from('fr_support_requests')
      .select('*')
      .eq('user_id', session.user.id)
      .order('created_at', { ascending: false })
    setRequests(data || [])
    setLoading(false)
  }

  async function selectTicket(req) {
    setSelected(req)
    setReplyText('')
    const { data } = await supabase
      .from('fr_support_messages')
      .select('*')
      .eq('request_id', req.id)
      .eq('is_internal', false)
      .order('created_at', { ascending: true })
    setMessages(data || [])
    setTimeout(() => threadRef.current?.scrollTo({ top: threadRef.current.scrollHeight, behavior: 'smooth' }), 100)
  }

  function viewNotification(n) {
    setNotifications(prev => prev.filter(x => x.id !== n.id))
    if (n.req) selectTicket(n.req)
  }
  function dismissNotification(id) {
    setNotifications(prev => prev.filter(x => x.id !== id))
  }

  async function sendReply() {
    if (!replyText.trim()) return
    setReplySending(true)
    try {
      const res = await fetch('/api/translate-message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ request_id: selected.id, message: replyText.trim(), sender: 'user', is_internal: false }),
      })
      if (res.ok) {
        const { message } = await res.json()
        setMessages(m => [...m, message])
        setReplyText('')
        setTimeout(() => threadRef.current?.scrollTo({ top: threadRef.current.scrollHeight, behavior: 'smooth' }), 100)
      } else {
        const err = await res.json()
        alert('Erreur : ' + err.error)
      }
    } catch (e) { alert('Erreur réseau : ' + e.message) }
    setReplySending(false)
  }

  async function closeTicket() {
    setClosing(true)
    await supabase.from('fr_support_requests').update({ status: 'closed' }).eq('id', selected.id)
    setRequests(rs => rs.map(r => r.id === selected.id ? { ...r, status: 'closed' } : r))
    setSelected(s => ({ ...s, status: 'closed' }))
    setClosing(false)
  }

  const TABS = [['active', 'En cours'], ['closed', 'Fermés'], ['all', 'Tout']]
  const filtered = filter === 'active'
    ? requests.filter(r => ['open','in_progress'].includes(r.status))
    : filter === 'closed'
      ? requests.filter(r => ['closed','resolved'].includes(r.status))
      : requests

  // ── List view ────────────────────────────────────────────────────────────────
  if (!selected) {
    return (
      <div className="min-h-screen bg-gray-50 safe-top safe-bottom">
        <NotificationBanner notifications={notifications} onView={viewNotification} onDismiss={dismissNotification} />
        <div className="bg-brand-navy px-6 pt-6 pb-4 sticky top-0 z-10">
          <div className="flex items-center gap-3 mb-4">
            <button onClick={() => navigate('/')} className="text-white/70">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
            </button>
            <h1 className="text-white font-bold text-lg">Mes demandes</h1>
          </div>
          <div className="flex gap-2">
            {TABS.map(([val, label]) => (
              <button key={val} onClick={() => setFilter(val)}
                className={`flex-1 text-xs font-semibold py-1.5 rounded-xl transition-colors ${filter === val ? 'bg-white text-brand-navy' : 'bg-white/20 text-white'}`}>
                {label}
              </button>
            ))}
          </div>
        </div>
        <div className="px-6 py-4 pb-12">
          {loading ? (
            <div className="flex justify-center py-16"><div className="w-6 h-6 rounded-full border-2 border-brand-purple border-t-transparent animate-spin" /></div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-400 text-sm mb-4">Aucune demande</p>
              <button onClick={() => navigate('/assistance')} className="btn-primary text-sm px-5 py-2.5">Nouvelle demande</button>
            </div>
          ) : (
            <div className="space-y-3">
              {filtered.map(req => {
                const hasNotif = notifications.some(n => n.request_id === req.id)
                return (
                  <button key={req.id} onClick={() => selectTicket(req)}
                    className={`w-full bg-white rounded-2xl border shadow-sm px-4 py-4 text-left transition-colors ${hasNotif ? 'border-brand-cyan/30 active:bg-cyan-50' : 'border-gray-100 active:bg-gray-50'}`}>
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="flex gap-1.5 flex-wrap items-center">
                        <Badge value={req.status} map={STATUS_FR} />
                        {hasNotif && (
                          <span className="flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full bg-brand-cyan/10 text-brand-navy">
                            <span className="w-1.5 h-1.5 rounded-full bg-brand-cyan animate-pulse" />
                            Nouvelle réponse
                          </span>
                        )}
                      </div>
                      <span className="text-xs text-gray-400 flex-shrink-0">{formatDate(req.created_at)}</span>
                    </div>
                    <p className="font-semibold text-sm text-brand-navy">{ISSUE_LABELS[req.issue_type] || req.issue_type}</p>
                    {req.installation_company && <p className="text-xs text-gray-500 mt-0.5">{req.installation_company}</p>}
                    <p className="text-xs text-gray-400 mt-1 line-clamp-2">{req.description_fr}</p>
                  </button>
                )
              })}
            </div>
          )}
        </div>
      </div>
    )
  }

  // ── Detail view ──────────────────────────────────────────────────────────────
  const isClosed = ['closed','resolved'].includes(selected.status)
  return (
    <div className="min-h-screen bg-gray-50 safe-top safe-bottom flex flex-col">
      <NotificationBanner notifications={notifications} onView={viewNotification} onDismiss={dismissNotification} />
      <div className="bg-brand-navy px-6 pt-6 pb-4 flex-shrink-0">
        <div className="flex items-center gap-3">
          <button onClick={() => setSelected(null)} className="text-white/70">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
          </button>
          <div className="flex-1 min-w-0">
            <p className="text-white font-bold">{ISSUE_LABELS[selected.issue_type] || selected.issue_type}</p>
            <p className="text-white/50 text-xs">{formatDate(selected.created_at)}</p>
          </div>
          <Badge value={selected.status} map={STATUS_FR} />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4 pb-6">
        <div className="card space-y-2 text-sm">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Votre demande</p>
          {selected.installation_company && (
            <div className="flex gap-2">
              <span className="text-gray-400 w-28 flex-shrink-0">Entreprise</span>
              <span className="text-brand-navy font-medium">{selected.installation_company}</span>
            </div>
          )}
          <div className="flex gap-2">
            <span className="text-gray-400 w-28 flex-shrink-0">Adresse</span>
            <span className="text-brand-navy font-medium">{selected.site_address}</span>
          </div>
          {selected.fault_code && (
            <div className="flex gap-2">
              <span className="text-gray-400 w-28 flex-shrink-0">Code(s) erreur</span>
              <span className="text-brand-navy font-medium">{selected.fault_code}</span>
            </div>
          )}
          <p className="text-gray-600 mt-2 pt-2 border-t border-gray-100 leading-relaxed">{selected.description_fr}</p>
        </div>

        <div className="card p-0 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Échanges</p>
          </div>
          <div ref={threadRef} className="px-4 py-3 overflow-y-auto" style={{ maxHeight: 320 }}>
            {messages.length === 0
              ? <p className="text-center text-gray-400 text-xs py-4">Aucun message pour l'instant</p>
              : messages.map(msg => {
                const isUser = msg.sender === 'user'
                return (
                  <div key={msg.id} className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-3`}>
                    <div className={`max-w-xs rounded-2xl px-4 py-3 ${isUser ? 'bg-brand-purple text-white rounded-tr-sm' : 'bg-white border border-gray-200 rounded-tl-sm'}`}>
                      <p className={`text-xs font-semibold mb-1 ${isUser ? 'text-white/70' : 'text-gray-400'}`}>
                        {isUser ? 'Vous' : 'Octopus Energy'}
                      </p>
                      <p className={`text-sm leading-relaxed ${isUser ? 'text-white' : 'text-brand-navy'}`}>
                        {isUser ? msg.message_fr : (msg.message_fr || msg.message_en)}
                      </p>
                      <p className={`text-xs mt-1.5 ${isUser ? 'text-white/50' : 'text-gray-400'}`}>{formatDate(msg.created_at)}</p>
                    </div>
                  </div>
                )
              })
            }
          </div>
        </div>

        {!isClosed ? (
          <>
            <div className="card space-y-2">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Répondre</p>
              <textarea className="input-field resize-none text-sm" rows={3}
                placeholder="Écrivez votre réponse en français…"
                value={replyText} onChange={e => setReplyText(e.target.value)} />
              <button onClick={sendReply} disabled={replySending || !replyText.trim()} className="btn-primary text-sm py-2.5">
                {replySending ? 'Envoi…' : 'Envoyer'}
              </button>
            </div>
            <button onClick={closeTicket} disabled={closing}
              className="w-full py-2.5 rounded-xl text-sm font-semibold bg-gray-100 text-gray-600 border border-gray-200">
              {closing ? 'En cours…' : 'Fermer la demande'}
            </button>
          </>
        ) : (
          <div className="text-center bg-gray-50 rounded-2xl border border-gray-100 py-5 px-4">
            <p className="text-gray-600 font-semibold text-sm">Demande fermée</p>
            <p className="text-gray-400 text-xs mt-1">Merci d'avoir contacté Octopus Energy.</p>
          </div>
        )}
      </div>
    </div>
  )
}
