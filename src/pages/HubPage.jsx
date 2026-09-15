import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

const ACTIONS = [
  {
    id: 'depannage',
    route: '/depannage',
    label: 'Dépannage',
    subtitle: 'Codes défaut & guides de diagnostic',
    bg: 'bg-yellow-50',
    color: 'text-yellow-600',
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
  },
  {
    id: 'informations',
    route: '/informations',
    label: 'Informations & Procédures',
    subtitle: 'Guides, méthodes & références',
    bg: 'bg-cyan-50',
    color: 'text-brand-cyan',
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
      </svg>
    ),
  },
  {
    id: 'assistance',
    route: '/assistance',
    label: 'Demande d\'assistance',
    subtitle: 'Contacter le support technique',
    bg: 'bg-pink-50',
    color: 'text-brand-pink',
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
      </svg>
    ),
  },
]

export default function HubPage({ session }) {
  const navigate = useNavigate()
  const name = session?.user?.user_metadata?.full_name || session?.user?.email || ''

  async function handleSignOut() {
    await supabase.auth.signOut()
    navigate('/connexion')
  }

  return (
    <div className="min-h-screen bg-gray-50 safe-top safe-bottom">
      {/* Header */}
      <div className="bg-gradient-to-br from-brand-purple to-brand-pink px-6 pt-6 pb-8">
        <div className="flex items-center justify-between mb-5">
          <div />
          <button onClick={handleSignOut} className="text-white/50 text-xs border border-white/20 rounded-xl px-3 py-1.5">
            Déconnexion
          </button>
        </div>
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-white/10 flex items-center justify-center">
            <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
            </svg>
          </div>
          <div>
            <h1 className="text-white font-bold text-xl">Support Cosy</h1>
            {name && <p className="text-white/60 text-sm mt-0.5">Bonjour, {name.split(' ')[0]}</p>}
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="px-6 py-6 space-y-3">
        {ACTIONS.map(action => (
          <button
            key={action.id}
            onClick={() => navigate(action.route)}
            className="w-full card flex items-center gap-4 active:bg-gray-50 transition-colors"
          >
            <div className={`w-12 h-12 rounded-2xl ${action.bg} flex items-center justify-center flex-shrink-0 ${action.color}`}>
              {action.icon}
            </div>
            <div className="flex-1 text-left">
              <p className="font-semibold text-brand-navy">{action.label}</p>
              <p className="text-sm text-gray-500 mt-0.5">{action.subtitle}</p>
            </div>
            <svg className="w-4 h-4 text-gray-300 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        ))}
      </div>

      <div className="px-6 pb-8">
        <p className="text-center text-xs text-gray-400">
          Support Cosy — Octopus Energy France
        </p>
      </div>
    </div>
  )
}
