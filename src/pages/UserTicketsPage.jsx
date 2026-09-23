import { useEffect, useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

const STATUS = {
  open:        { label: 'Ouvert',    bg: 'bg-blue-100',   text: 'text-blue-700' },
  in_progress: { label: 'En cours',  bg: 'bg-yellow-100', text: 'text-yellow-700' },
  resolved:    { label: 'Résolu',    bg: 'bg-green-100',  text: 'text-green-700' },
  closed:      { label: 'Fermé',     bg: 'bg-gray-100',   text: 'text-gray-500' },
}
const URGENCY = {
  low:    { label: 'Faible',  bg: 'bg-green-100',  text: 'text-green-700' },
  medium: { label: 'Normale', bg: 'bg-yellow-100', text: 'text-yellow-700' },
  high:   { label: 'Urgente', bg: 'bg-red-100',    text: 'text-red-600' },
}

function formatDate(iso) {
  return new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
}
function Badge({ value, map }) {
  const s = map[value] || { label: value, bg: 'bg-gray-100', text: 'text-gray-500' }
  return <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${s.bg} ${s.text}`}>{s.label}</span>
}

function MessageBubble({ msg }) {
  const isAdmin = msg.sender === 'admin'
  return (
    <div className={`flex mb-3 ${isAdmin ? 'justify-start' : 'justify-end'}`}>
      <div className={`max-w-xs rounded-2xl px-4 py-3 ${
        isAdmin
          ? 'bg-white border border-gray-200 rounded-tl-sm'
          : 'bg-brand-purple text-white rounded-tr-sm'
      }`}>
        <p className={`text-xs font-semibold mb-1 ${isAdmin ? 'text-gray-400' : 'text-white/70'}`}>
          {isAdmin ? 'Octopus Energy' : 'Vous'}
        </p>
        <p className={`text-sm leading-relaxed ${isAdmin ? 'text-brand-navy' : 'text-white'}`}>
          {msg.message_fr || msg.message_en}
        </p>
        <p className={`text-xs mt-1.5 ${isAdmin ? 'text-gray-400' : 'text-white/50'}`}>
          {formatDate(msg.created_at)}
        </p>
      </div>
    </div>
  )
}

export default function UserTicketsPage({ session }) {
  const navigate = useNavigate()
  const threadRef = useRef(null)
  const [tickets, setTickets] = useState([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState(null)
  const [messages, setMessages] = useState([])
  const [filter, setFilter] = useState('active')
  const [replyText, setReplyText] = useState('')
  const [replySending, setReplySending] = useState(false)
  const [resolving, setResolving] = useState(false)

  useEffect(() => { loadTickets() }, [])

  async function loadTickets() {
    const { data } = await supabase
      .from('fr_support_requests')
      .select('*')
      .eq('user_id', session.user.id)
      .order('created_at', { ascending: false })
    setTickets(data || [])
    setLoading(false)
  }

  async function selectTicket(ticket) {
    setSelected(ticket)
    setReplyText('')
    const { data } = await supabase
      .from('fr_support_messages')
      .select('*')
      .eq('request_id', ticket.id)
      .eq('is_internal', false)
      .order('created_at', { ascending: true })
    setMessages(data || [])
    setTimeout(() => threadRef.current?.scrollTo({ top: threadRef.current.scrollHeight, behavior: 'smooth' }), 100)
  }

  async function sendReply() {
    if (!replyText.trim()) return
    setReplySending(true)
    const res = await fetch('/api/translate-message', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        request_id: selected.id,
        message: replyText.trim(),
        sender: 'user',
        is_internal: false,
      }),
    })
    if (res.ok) {
      const { message } = await res.json()
      setMessages(m => [...m, message])
      setReplyText('')
      setTimeout(() => threadRef.current?.scrollTo({ top: threadRef.current.scrollHeight, behavior: 'smooth' }), 100)
    }
    setReplySending(false)
  }

  async function resolveTicket() {
    setResolving(true)
    const { error } = await supabase
      .from('fr_support_requests')
      .update({ status: 'resolved' })
      .eq('id', selected.id)
    if (!error) {
      setTickets(ts => ts.map(t => t.id === selected.id ? { ...t, status: 'resolved' } : t))
      setSelected(s => ({ ...s, status: 'resolved' }))
    }
    setResolving(false)
  }

  const TABS = [['active', 'En cours'], ['resolved', 'Résolus'], ['all', 'Tout']]
  const filtered = filter === 'all'
    ? tickets
    : filter === 'active'
    ? tickets.filter(t => t.status === 'open' || t.status === 'in_progress')
    : tickets.filter(t => t.status === 'resolved' || t.status === 'closed')

  // ── Ticket detail ────────────────────────────────────────────────────────────

  if (selected) {
    const isResolved = selected.status === 'resolved' || selected.status === 'closed'
    return (
      <div className="min-h-screen bg-gray-50 safe-top safe-bottom flex flex-col">
        <div className="bg-brand-navy px-6 pt-6 pb-5 flex-shrink-0">
          <div className="flex items-center gap-3 mb-1">
            <button onClick={() => setSelected(null)} className="text-white/70">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <div className="flex-1">
              <h1 className="text-white font-bold">Ma demande</h1>
              <p className="text-white/50 text-xs">{formatDate(selected.created_at)}</p>
            </div>
            <div className="flex gap-1.5">
              <Badge value={selected.urgency} map={URGENCY} />
              <Badge value={selected.status} map={STATUS} />
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">

          {/* Original request summary */}
          <div className="card bg-gray-50">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Votre demande initiale</p>
            <p className="text-sm text-brand-navy font-semibold mb-1">{selected.issue_type}</p>
            {selected.fault_code && (
              <p className="text-xs text-red-600 font-mono mb-1">Code défaut : {selected.fault_code}</p>
            )}
            <p className="text-sm text-gray-600 leading-relaxed">{selected.description_fr}</p>
          </div>

          {/* Message thread */}
          {messages.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Messages</p>
              <div ref={threadRef}>
                {messages.map(msg => <MessageBubble key={msg.id} msg={msg} />)}
              </div>
            </div>
          )}

          {/* Reply or resolved state */}
          {isResolved ? (
            <div className="card text-center py-6">
              <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-3">
                <svg className="w-6 h-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <p className="font-semibold text-brand-navy">Demande résolue</p>
              <p className="text-sm text-gray-500 mt-1">Merci de nous avoir contactés.</p>
            </div>
          ) : (
            <div className="space-y-3">
              <div>
                <label className="form-label">Répondre</label>
                <textarea
                  className="input-field resize-none" rows={3}
                  placeholder="Écrivez votre message en français…"
                  value={replyText} onChange={e => setReplyText(e.target.value)} />
                <button onClick={sendReply} disabled={replySending || !replyText.trim()} className="btn-primary mt-2 text-sm py-2.5">
                  {replySending ? 'Envoi…' : 'Envoyer'}
                </button>
              </div>
              <button onClick={resolveTicket} disabled={resolving}
                className="w-full py-3 rounded-2xl border-2 border-green-200 text-green-700 bg-green-50 text-sm font-semibold active:bg-green-100 transition-colors">
                {resolving ? 'En cours…' : '✓ Marquer comme résolu'}
              </button>
            </div>
          )}
        </div>
      </div>
    )
  }

  // ── Ticket list ──────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-gray-50 safe-top safe-bottom">
      <div className="bg-brand-navy px-6 pt-6 pb-4 sticky top-0 z-10">
        <div className="flex items-center gap-3 mb-4">
          <button onClick={() => navigate('/')} className="text-white/70">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <h1 className="text-white font-bold text-lg">Mes demandes</h1>
          <span className="ml-auto text-white/40 text-sm">{tickets.length}</span>
        </div>
        <div className="flex gap-2">
          {TABS.map(([val, label]) => (
            <button key={val} onClick={() => setFilter(val)}
              className={`flex-1 text-xs font-semibold py-1.5 rounded-xl transition-colors ${
                filter === val ? 'bg-white text-brand-navy' : 'bg-white/20 text-white'
              }`}>
              {label}
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
          <div className="text-center py-12">
            <p className="text-gray-400 text-sm">Aucune demande</p>
            <button onClick={() => navigate('/assistance')} className="mt-4 btn-primary max-w-xs mx-auto text-sm py-2.5">
              Soumettre une demande
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map(ticket => (
              <button key={ticket.id} onClick={() => selectTicket(ticket)}
                className="w-full bg-white rounded-2xl border border-gray-100 shadow-sm px-4 py-4 text-left active:bg-gray-50 transition-colors">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex gap-1.5">
                    <Badge value={ticket.urgency} map={URGENCY} />
                    <Badge value={ticket.status} map={STATUS} />
                  </div>
                  <span className="text-xs text-gray-400 flex-shrink-0">{formatDate(ticket.created_at)}</span>
                </div>
                <p className="font-semibold text-sm text-brand-navy">{ticket.issue_type}</p>
                {ticket.fault_code && (
                  <p className="text-xs text-red-500 font-mono mt-0.5">Code défaut : {ticket.fault_code}</p>
                )}
                <p className="text-xs text-gray-500 mt-1 line-clamp-2">{ticket.description_fr}</p>
                {ticket.site_address && (
                  <p className="text-xs text-gray-400 mt-1">{ticket.site_address}</p>
                )}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
