import { useEffect, useState, useCallback } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { supabase } from '../lib/supabase'

const ISSUE_FR = {
  electrical: 'Problème électrique', mechanical: 'Problème mécanique',
  fault_code: 'Code erreur', performance: 'Mauvaises performances',
  commissioning: 'Mise en service', noise: 'Bruit inhabituel',
  connectivity: 'Connectivité', other: 'Autre',
}
const ISSUE_EN = {
  electrical: 'Electrical problem', mechanical: 'Mechanical problem',
  fault_code: 'Fault code', performance: 'Poor performance',
  commissioning: 'Commissioning', noise: 'Unusual noise',
  connectivity: 'Connectivity', other: 'Other',
}

// Banner shown on every page while there are unread items. Stays until the ticket is opened.
export default function GlobalNotifier({ session }) {
  const navigate = useNavigate()
  const location = useLocation()
  const isAdmin = session?.user?.app_metadata?.role === 'admin'
  const userId = session?.user?.id
  const [items, setItems] = useState([])

  const load = useCallback(async () => {
    if (!userId) return
    const { data: unread } = await supabase.rpc('get_unread_tickets')
    if (!unread?.length) { setItems([]); return }
    const { data: rows } = await supabase.from('fr_support_requests')
      .select('id, installation_company, user_email, issue_type')
      .in('id', unread.map(u => u.ticket_id))
    const byId = Object.fromEntries((rows || []).map(r => [r.id, r]))
    setItems(unread.filter(u => byId[u.ticket_id]).map(u => {
      const r = byId[u.ticket_id]
      return {
        id: u.ticket_id,
        kind: u.kind,
        who: r.installation_company || r.user_email || 'Installer',
        issue: (isAdmin ? ISSUE_EN : ISSUE_FR)[r.issue_type] || r.issue_type,
      }
    }))
  }, [isAdmin, userId])

  // Load on mount, on navigation, on tab focus, on explicit refresh, and every minute as a fallback
  useEffect(() => { load() }, [load, location.pathname, location.search])
  useEffect(() => {
    const refresh = () => load()
    const onVisible = () => { if (document.visibilityState === 'visible') load() }
    window.addEventListener('notifier-refresh', refresh)
    document.addEventListener('visibilitychange', onVisible)
    const timer = setInterval(load, 60000)
    return () => {
      window.removeEventListener('notifier-refresh', refresh)
      document.removeEventListener('visibilitychange', onVisible)
      clearInterval(timer)
    }
  }, [load])

  // Realtime: any new message or request triggers a reload (RLS limits what each user receives)
  useEffect(() => {
    if (!userId) return
    const channel = supabase
      .channel(`global-notifier-${userId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'fr_support_messages' }, load)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'fr_support_requests' }, load)
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [userId, load])

  if (!items.length) return null
  const shown = items.slice(0, 3)

  function open(item) {
    navigate(`${isAdmin ? '/admin' : '/mes-demandes'}?ticket=${item.id}`)
  }

  return (
    <div className="fixed top-0 left-0 right-0 z-[100] px-4 space-y-2"
      style={{ paddingTop: 'max(env(safe-area-inset-top), 8px)' }}>
      {shown.map(item => {
        const isNew = item.kind === 'new_request'
        const title = isAdmin
          ? (isNew ? 'New support request' : 'New reply from installer')
          : 'Octopus Energy a répondu'
        const sub = isAdmin ? `${item.who} — ${item.issue}` : item.issue
        return (
          <div key={item.id} className="bg-brand-navy border border-brand-purple/40 rounded-2xl shadow-2xl px-4 py-3 flex items-center gap-3">
            <span className="w-2.5 h-2.5 rounded-full bg-brand-pink flex-shrink-0 animate-pulse" />
            <div className="flex-1 min-w-0">
              <p className="text-white text-xs font-bold">{title}</p>
              <p className="text-white/60 text-xs truncate">{sub}</p>
            </div>
            <button onClick={() => open(item)}
              className="flex-shrink-0 bg-brand-purple text-white text-xs font-semibold px-3 py-1.5 rounded-xl">
              {isAdmin ? 'View' : 'Voir'}
            </button>
          </div>
        )
      })}
      {items.length > shown.length && (
        <p className="text-center text-gray-500 text-xs">
          {isAdmin ? `+${items.length - shown.length} more` : `+${items.length - shown.length} autre(s)`}
        </p>
      )}
    </div>
  )
}
