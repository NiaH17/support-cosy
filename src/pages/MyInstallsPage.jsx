import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import InstallDetail from '../components/InstallDetail'

export default function MyInstallsPage({ session }) {
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()
  const [installs, setInstalls] = useState([])
  const [loading, setLoading] = useState(true)
  const selectedId = params.get('id')
  const selected = installs.find(i => i.id === selectedId)

  useEffect(() => {
    supabase.from('fr_installations').select('*').eq('user_id', session.user.id)
      .order('created_at', { ascending: false })
      .then(({ data }) => { setInstalls(data || []); setLoading(false) })
  }, [])

  const missing = i => Object.values(i.checks || {}).filter(v => !v).length

  return (
    <div className="min-h-screen bg-gray-50 safe-top safe-bottom">
      <div className="no-print bg-brand-navy px-6 pt-6 pb-4 sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <button onClick={() => (selected ? setParams({}) : navigate('/'))} className="text-white/70">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
          </button>
          <h1 className="text-white font-bold text-lg">{selected ? 'Installation' : 'Mes installations'}</h1>
          {!selected && <span className="ml-auto text-white/40 text-sm">{installs.length}</span>}
        </div>
      </div>
      <div className="px-6 py-4 pb-12">
        {loading ? (
          <div className="flex justify-center py-16"><div className="w-6 h-6 rounded-full border-2 border-brand-purple border-t-transparent animate-spin" /></div>
        ) : selected ? (
          <InstallDetail install={selected} lang="fr" autoPrint={params.get('print') === '1'} />
        ) : installs.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-400 text-sm mb-4">Aucune installation enregistrée.</p>
            <button className="btn-primary max-w-xs mx-auto" onClick={() => navigate('/installations/nouvelle')}>Enregistrer une installation</button>
          </div>
        ) : (
          <div className="space-y-3">
            {installs.map(i => (
              <button key={i.id} onClick={() => setParams({ id: i.id })}
                className="w-full bg-white rounded-2xl border border-gray-100 shadow-sm px-4 py-4 text-left active:bg-gray-50">
                <div className="flex items-start justify-between gap-2 mb-1">
                  <p className="font-semibold text-sm text-brand-navy">{i.model} — {i.outdoor_serial}</p>
                  <span className="text-xs text-gray-400 flex-shrink-0">{new Date(i.install_date).toLocaleDateString('fr-FR')}</span>
                </div>
                <p className="text-xs text-gray-500 line-clamp-2 whitespace-pre-line">{i.address}</p>
                {missing(i) > 0 && <p className="text-xs text-amber-600 mt-1.5">{missing(i)} contrôle(s) non coché(s)</p>}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
