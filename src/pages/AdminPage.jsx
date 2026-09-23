import { useEffect, useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

// ── Constants ─────────────────────────────────────────────────────────────────

const URGENCY = {
  low:    { label: 'Low',     bg: 'bg-green-100',  text: 'text-green-700' },
  medium: { label: 'Normal',  bg: 'bg-yellow-100', text: 'text-yellow-700' },
  high:   { label: 'Urgent',  bg: 'bg-red-100',    text: 'text-red-600' },
}
const STATUS = {
  open:        { label: 'Open',        bg: 'bg-blue-100',   text: 'text-blue-700' },
  in_progress: { label: 'In progress', bg: 'bg-yellow-100', text: 'text-yellow-700' },
  resolved:    { label: 'Resolved',    bg: 'bg-green-100',  text: 'text-green-700' },
  closed:      { label: 'Closed',      bg: 'bg-gray-100',   text: 'text-gray-500' },
}
const CONFIRMED_ISSUES = [
  'Firmware', 'End user education', 'Installer education',
  'Unit swap', 'Faulty part', 'System fault', 'Kraken/App', 'No fault found',
]
const ISSUE_LABELS = {
  electrical: 'Electrical problem', mechanical: 'Mechanical problem',
  fault_code: 'Fault code', performance: 'Poor performance',
  commissioning: 'Commissioning', noise: 'Unusual noise',
  connectivity: 'Connectivity', other: 'Other',
}

function formatDate(iso) {
  return new Date(iso).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
}
function Badge({ value, map }) {
  const s = map[value] || { label: value, bg: 'bg-gray-100', text: 'text-gray-500' }
  return <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${s.bg} ${s.text}`}>{s.label}</span>
}

// ── Message bubble ────────────────────────────────────────────────────────────

function MessageBubble({ msg, isAdmin }) {
  const [showFr, setShowFr] = useState(false)
  const isUser = msg.sender === 'user'
  const isInternal = msg.is_internal

  if (isInternal) {
    return (
      <div className="flex justify-center my-2">
        <div className="bg-amber-50 border border-amber-200 rounded-2xl px-4 py-2.5 max-w-xs text-center">
          <p className="text-xs font-semibold text-amber-600 mb-0.5">🔒 Internal note</p>
          <p className="text-sm text-amber-800">{msg.message_en}</p>
          <p className="text-xs text-amber-500 mt-1">{formatDate(msg.created_at)}</p>
        </div>
      </div>
    )
  }

  return (
    <div className={`flex ${isUser ? 'justify-start' : 'justify-end'} mb-3`}>
      <div className={`max-w-xs rounded-2xl px-4 py-3 ${
        isUser
          ? 'bg-white border border-gray-200 rounded-tl-sm'
          : 'bg-brand-purple text-white rounded-tr-sm'
      }`}>
        <p className={`text-xs font-semibold mb-1 ${isUser ? 'text-gray-400' : 'text-white/70'}`}>
          {isUser ? 'Installer' : 'Octopus Energy'}
        </p>

        {/* Admin sees both languages for user messages, EN for own messages */}
        {isAdmin && isUser ? (
          <>
            <p className="text-sm text-brand-navy leading-relaxed">{msg.message_en || msg.message_fr}</p>
            {msg.message_fr && msg.message_en && (
              <button onClick={() => setShowFr(v => !v)}
                className="text-xs text-gray-400 mt-1 underline underline-offset-2">
                {showFr ? 'Hide French' : 'Show original French'}
              </button>
            )}
            {showFr && <p className="text-xs text-gray-400 mt-1 italic">{msg.message_fr}</p>}
          </>
        ) : isAdmin && !isUser ? (
          <>
            <p className="text-sm text-white leading-relaxed">{msg.message_en}</p>
            {msg.message_fr && (
              <>
                <button onClick={() => setShowFr(v => !v)}
                  className="text-xs text-white/50 mt-1 underline underline-offset-2">
                  {showFr ? 'Hide French' : 'Show French sent'}
                </button>
                {showFr && <p className="text-xs text-white/60 mt-1 italic">{msg.message_fr}</p>}
              </>
            )}
          </>
        ) : (
          <p className="text-sm leading-relaxed">{msg.message_fr || msg.message_en}</p>
        )}

        <p className={`text-xs mt-1.5 ${isUser ? 'text-gray-400' : 'text-white/50'}`}>{formatDate(msg.created_at)}</p>
      </div>
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function AdminPage({ session }) {
  const navigate = useNavigate()
  const threadRef = useRef(null)
  const [requests, setRequests] = useState([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState(null)
  const [messages, setMessages] = useState([])
  const [filter, setFilter] = useState('open')
  const [detailTab, setDetailTab] = useState('details') // 'details' | 'triage'

  // Triage state
  const [triage, setTriage] = useState({})
  const [triageSaving, setTriageSaving] = useState(false)
  const [triageSaved, setTriageSaved] = useState(false)

  // Reply state
  const [replyText, setReplyText] = useState('')
  const [replySending, setReplySending] = useState(false)
  const [noteText, setNoteText] = useState('')
  const [noteSending, setNoteSending] = useState(false)

  useEffect(() => { loadRequests() }, [])

  async function loadRequests() {
    const { data } = await supabase
      .from('fr_support_requests')
      .select('*')
      .order('created_at', { ascending: false })
    setRequests(data || [])
    setLoading(false)
  }

  async function selectTicket(req) {
    setSelected(req)
    setDetailTab('details')
    setReplyText('')
    setNoteText('')
    setTriageSaved(false)
    setTriage({
      part_needed: req.part_needed ?? null,
      part_details: req.part_details || '',
      kraken_account: req.kraken_account || '',
      confirmed_issue: req.confirmed_issue || '',
    })
    // Load messages
    const { data } = await supabase
      .from('fr_support_messages')
      .select('*')
      .eq('request_id', req.id)
      .order('created_at', { ascending: true })
    setMessages(data || [])
    setTimeout(() => threadRef.current?.scrollTo({ top: threadRef.current.scrollHeight, behavior: 'smooth' }), 100)
  }

  async function saveTriage() {
    setTriageSaving(true)
    const { error } = await supabase
      .from('fr_support_requests')
      .update({
        part_needed: triage.part_needed,
        part_details: triage.part_details || null,
        kraken_account: triage.kraken_account || null,
        confirmed_issue: triage.confirmed_issue || null,
      })
      .eq('id', selected.id)
    if (!error) {
      setRequests(rs => rs.map(r => r.id === selected.id ? { ...r, ...triage } : r))
      setSelected(s => ({ ...s, ...triage }))
      setTriageSaved(true)
      setTimeout(() => setTriageSaved(false), 2000)
    }
    setTriageSaving(false)
  }

  async function sendReply() {
    if (!replyText.trim()) return
    setReplySending(true)
    const res = await fetch('/api/translate-message', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ request_id: selected.id, message: replyText.trim(), sender: 'admin', is_internal: false }),
    })
    if (res.ok) {
      const { message } = await res.json()
      setMessages(m => [...m, message])
      setReplyText('')
      setRequests(rs => rs.map(r => r.id === selected.id ? { ...r, status: r.status === 'open' ? 'in_progress' : r.status } : r))
      setSelected(s => ({ ...s, status: s.status === 'open' ? 'in_progress' : s.status }))
      setTimeout(() => threadRef.current?.scrollTo({ top: threadRef.current.scrollHeight, behavior: 'smooth' }), 100)
    }
    setReplySending(false)
  }

  async function sendNote() {
    if (!noteText.trim()) return
    setNoteSending(true)
    const res = await fetch('/api/translate-message', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ request_id: selected.id, message: noteText.trim(), sender: 'admin', is_internal: true }),
    })
    if (res.ok) {
      const { message } = await res.json()
      setMessages(m => [...m, message])
      setNoteText('')
    }
    setNoteSending(false)
  }

  async function updateStatus(status) {
    await supabase.from('fr_support_requests').update({ status }).eq('id', selected.id)
    setRequests(rs => rs.map(r => r.id === selected.id ? { ...r, status } : r))
    setSelected(s => ({ ...s, status }))
  }

  // ── Filtered list ────────────────────────────────────────────────────────────

  const TABS = [
    ['open', 'Open'],
    ['in_progress', 'Active'],
    ['resolved', 'Resolved'],
    ['closed', 'Closed'],
    ['all', 'All'],
  ]
  const filtered = filter === 'all' ? requests : requests.filter(r => r.status === filter)

  // ── Details panel ────────────────────────────────────────────────────────────

  function DetailsPanel() {
    return (
      <div className="space-y-4">
        {/* Submitted fields */}
        <div className="card space-y-2.5">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Submission details</p>
          {[
            ['Company', selected.installation_company],
            ['Address', selected.site_address],
            ['Issue type', ISSUE_LABELS[selected.issue_type] || selected.issue_type],
            ['Fault code(s)', selected.fault_code],
            ['Phone', selected.contact_phone],
            ['Email', selected.contact_email],
            ['Submitted by', selected.user_email],
          ].filter(([, v]) => v).map(([label, value]) => (
            <div key={label} className="flex gap-2 text-sm">
              <span className="text-gray-400 w-28 flex-shrink-0">{label}</span>
              <span className="text-brand-navy font-medium break-all">{value}</span>
            </div>
          ))}
          <div className="flex gap-2 text-sm pt-1 border-t border-gray-100">
            <span className="text-gray-400 w-28 flex-shrink-0">Submitted</span>
            <span className="text-brand-navy">{formatDate(selected.created_at)}</span>
          </div>
        </div>

        {/* Description EN */}
        <div className="card">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Description (English)</p>
          <p className="text-sm text-brand-navy leading-relaxed">
            {selected.description_en || <span className="italic text-gray-400">Translation not available</span>}
          </p>
        </div>

        {/* Description FR */}
        <div className="card bg-gray-50">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Original (French)</p>
          <p className="text-sm text-gray-600 leading-relaxed">{selected.description_fr}</p>
        </div>

        {/* Photos */}
        {selected.photo_urls?.length > 0 && (
          <div className="card">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Photos ({selected.photo_urls.length})</p>
            <div className="flex gap-2 flex-wrap">
              {selected.photo_urls.map((url, i) => (
                <a key={i} href={url} target="_blank" rel="noopener noreferrer">
                  <img src={url} alt="" className="w-24 h-24 rounded-xl object-cover border border-gray-200" />
                </a>
              ))}
            </div>
          </div>
        )}
      </div>
    )
  }

  // ── Triage panel ─────────────────────────────────────────────────────────────

  function TriagePanel() {
    return (
      <div className="space-y-4">
        {/* Triage fields */}
        <div className="card space-y-4">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Triage</p>

          {/* Part needed */}
          <div>
            <label className="form-label text-xs">Part replacement needed?</label>
            <div className="flex gap-2 mt-1">
              {[['yes', 'Yes'], ['no', 'No']].map(([v, l]) => (
                <button key={v} type="button"
                  onClick={() => setTriage(t => ({ ...t, part_needed: v === 'yes' }))}
                  className={`flex-1 py-2 rounded-xl border text-sm font-semibold transition-colors ${
                    (v === 'yes' && triage.part_needed === true) || (v === 'no' && triage.part_needed === false)
                      ? 'bg-brand-purple/10 border-brand-purple text-brand-purple'
                      : 'bg-white border-gray-200 text-gray-600'
                  }`}>
                  {l}
                </button>
              ))}
            </div>
            {triage.part_needed === true && (
              <input type="text" className="input-field mt-2 text-sm"
                placeholder="Part details — model, reference, what needs replacing…"
                value={triage.part_details}
                onChange={e => setTriage(t => ({ ...t, part_details: e.target.value }))} />
            )}
          </div>

          {/* Kraken account */}
          <div>
            <label className="form-label text-xs">Kraken account number</label>
            <input type="text" className="input-field text-sm" placeholder="A-XXXXXXX"
              value={triage.kraken_account}
              onChange={e => setTriage(t => ({ ...t, kraken_account: e.target.value }))} />
          </div>

          {/* Confirmed issue */}
          <div>
            <label className="form-label text-xs">Confirmed issue</label>
            <div className="grid grid-cols-2 gap-1.5 mt-1">
              {CONFIRMED_ISSUES.map(opt => (
                <button key={opt} type="button"
                  onClick={() => setTriage(t => ({ ...t, confirmed_issue: t.confirmed_issue === opt ? '' : opt }))}
                  className={`text-left px-3 py-2 rounded-xl border text-xs font-medium transition-colors ${
                    triage.confirmed_issue === opt
                      ? 'bg-brand-purple/10 border-brand-purple text-brand-purple'
                      : 'bg-white border-gray-200 text-gray-600'
                  }`}>
                  {opt}
                </button>
              ))}
            </div>
          </div>

          <button onClick={saveTriage} disabled={triageSaving}
            className={`w-full py-2.5 rounded-xl text-sm font-semibold transition-colors ${
              triageSaved
                ? 'bg-green-100 text-green-700'
                : 'bg-brand-navy text-white active:opacity-90'
            }`}>
            {triageSaving ? 'Saving…' : triageSaved ? '✓ Triage saved' : 'Save triage'}
          </button>
        </div>

        {/* Message thread */}
        <div className="card p-0 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Messages</p>
          </div>
          <div ref={threadRef} className="px-4 py-3 overflow-y-auto" style={{ maxHeight: 340 }}>
            {messages.length === 0 ? (
              <p className="text-center text-gray-400 text-xs py-4">No messages yet</p>
            ) : (
              messages.map(msg => <MessageBubble key={msg.id} msg={msg} isAdmin={true} />)
            )}
          </div>
        </div>

        {/* Reply box */}
        <div className="card space-y-2">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Reply to installer (English → translated to French)</p>
          <textarea
            className="input-field resize-none text-sm" rows={3}
            placeholder="Write your reply in English…"
            value={replyText} onChange={e => setReplyText(e.target.value)} />
          <button onClick={sendReply} disabled={replySending || !replyText.trim()} className="btn-primary text-sm py-2.5">
            {replySending ? 'Sending…' : 'Send reply'}
          </button>
        </div>

        {/* Internal note */}
        <div className="card space-y-2">
          <p className="text-xs font-semibold text-amber-500 uppercase tracking-wider">🔒 Internal note (not sent to installer)</p>
          <textarea
            className="input-field resize-none text-sm bg-amber-50 border-amber-200" rows={2}
            placeholder="Notes for the team only…"
            value={noteText} onChange={e => setNoteText(e.target.value)} />
          <button onClick={sendNote} disabled={noteSending || !noteText.trim()}
            className="w-full py-2 rounded-xl text-sm font-semibold bg-amber-100 text-amber-800 disabled:opacity-40">
            {noteSending ? 'Saving…' : 'Save note'}
          </button>
        </div>

        {/* Status */}
        <div className="card">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Status</p>
          <div className="flex gap-2 flex-wrap">
            {Object.entries(STATUS).map(([val, s]) => (
              <button key={val} type="button" onClick={() => updateStatus(val)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-colors ${
                  selected.status === val
                    ? `${s.bg} ${s.text} border-current`
                    : 'bg-white border-gray-200 text-gray-500'
                }`}>
                {s.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    )
  }

  // ── List view ────────────────────────────────────────────────────────────────

  if (!selected) {
    return (
      <div className="min-h-screen bg-gray-50 safe-top safe-bottom">
        <div className="bg-brand-navy px-6 pt-6 pb-4 sticky top-0 z-10">
          <div className="flex items-center gap-3 mb-4">
            <button onClick={() => navigate('/')} className="text-white/70">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <h1 className="text-white font-bold text-lg">Support requests</h1>
            <span className="ml-auto text-white/40 text-sm">{requests.length} total</span>
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {TABS.map(([val, label]) => (
              <button key={val} onClick={() => setFilter(val)}
                className={`flex-shrink-0 text-xs font-semibold px-3 py-1.5 rounded-xl transition-colors ${
                  filter === val ? 'bg-white text-brand-navy' : 'bg-white/20 text-white'
                }`}>
                {label}
                {val !== 'all' && <span className="ml-1 opacity-60">{requests.filter(r => r.status === val).length}</span>}
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
            <p className="text-center text-gray-400 text-sm py-12">No requests</p>
          ) : (
            <div className="space-y-3">
              {filtered.map(req => (
                <button key={req.id} onClick={() => selectTicket(req)}
                  className="w-full bg-white rounded-2xl border border-gray-100 shadow-sm px-4 py-4 text-left active:bg-gray-50 transition-colors">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex gap-1.5 flex-wrap">
                      <Badge value={req.urgency} map={URGENCY} />
                      <Badge value={req.status} map={STATUS} />
                      {req.confirmed_issue && (
                        <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-brand-purple/10 text-brand-purple">{req.confirmed_issue}</span>
                      )}
                    </div>
                    <span className="text-xs text-gray-400 flex-shrink-0">{formatDate(req.created_at)}</span>
                  </div>
                  <p className="font-semibold text-sm text-brand-navy">
                    {ISSUE_LABELS[req.issue_type] || req.issue_type}
                    {req.fault_code ? ` — ${req.fault_code}` : ''}
                  </p>
                  {req.installation_company && (
                    <p className="text-xs text-gray-500 mt-0.5">{req.installation_company}</p>
                  )}
                  <p className="text-xs text-gray-400 mt-1 line-clamp-2">{req.description_en || req.description_fr}</p>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    )
  }

  // ── Detail view ──────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-gray-50 safe-top safe-bottom">
      {/* Header */}
      <div className="bg-brand-navy px-6 pt-6 pb-4 sticky top-0 z-10">
        <div className="flex items-center gap-3 mb-2">
          <button onClick={() => setSelected(null)} className="text-white/70">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div className="flex-1 min-w-0">
            <p className="text-white font-bold truncate">
              {selected.installation_company || selected.user_email}
            </p>
            <p className="text-white/50 text-xs">{formatDate(selected.created_at)}</p>
          </div>
          <div className="flex gap-1.5 flex-shrink-0">
            <Badge value={selected.urgency} map={URGENCY} />
            <Badge value={selected.status} map={STATUS} />
          </div>
        </div>
        {/* Mobile tab switcher */}
        <div className="flex gap-2 md:hidden">
          {[['details', 'Details'], ['triage', 'Triage & Messages']].map(([t, l]) => (
            <button key={t} onClick={() => setDetailTab(t)}
              className={`flex-1 text-xs font-semibold py-1.5 rounded-xl transition-colors ${
                detailTab === t ? 'bg-white text-brand-navy' : 'bg-white/20 text-white'
              }`}>
              {l}
            </button>
          ))}
        </div>
      </div>

      {/* Body — side-by-side on md+, tabbed on mobile */}
      <div className="md:flex md:gap-4 md:px-6 md:py-4 md:items-start pb-12">
        {/* Left / Details */}
        <div className={`md:flex-1 md:block px-6 py-4 md:px-0 md:py-0 ${detailTab === 'details' ? 'block' : 'hidden'}`}>
          <DetailsPanel />
        </div>
        {/* Right / Triage */}
        <div className={`md:flex-1 md:block px-6 py-4 md:px-0 md:py-0 ${detailTab === 'triage' ? 'block' : 'hidden'}`}>
          <TriagePanel />
        </div>
      </div>
    </div>
  )
}
