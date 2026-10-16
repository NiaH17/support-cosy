import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../../lib/supabase'
import InstallDetail from '../InstallDetail'
import { CHECKS, PHOTOS } from '../../lib/installFields'

const csvCell = v => `"${String(v ?? '').replace(/"/g, '""').replace(/\r?\n/g, ' ')}"`

export default function InstallationsTab() {
  const [installs, setInstalls] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState(null)

  useEffect(() => {
    supabase.from('fr_installations').select('*').order('created_at', { ascending: false })
      .then(({ data, error }) => {
        if (error) setError(error.message)
        setInstalls(data || [])
        setLoading(false)
      })
  }, [])

  const unticked = i => CHECKS.filter(c => !i.checks?.[c.key]).length

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return installs
    return installs.filter(i => [i.address, i.lead_engineer, i.partner_contractor, i.model, i.outdoor_serial, i.indoor_serial, i.hub_serial, i.user_email]
      .some(v => (v || '').toLowerCase().includes(q)))
  }, [installs, query])

  function exportCsv() {
    const head = ['Install date', 'Submitted at', 'Address', 'Lead engineer', 'Partner / contractor', 'Model', 'Outdoor serial', 'Indoor / cylinder serial', 'Hub serial / MAC', 'Submitted by', ...CHECKS.map(c => c.en), 'Photos']
    const rows = filtered.map(i => [
      i.install_date, i.created_at, i.address, i.lead_engineer, i.partner_contractor, i.model, i.outdoor_serial, i.indoor_serial, i.hub_serial, i.user_email,
      ...CHECKS.map(c => (i.checks?.[c.key] ? 'Yes' : 'No')),
      PHOTOS.reduce((n, p) => n + (i.photos?.[p.key]?.length || 0), 0),
    ])
    const csv = [head, ...rows].map(r => r.map(csvCell).join(',')).join('\n')
    const url = URL.createObjectURL(new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' }))
    const a = document.createElement('a')
    a.href = url; a.download = `installations-${new Date().toISOString().slice(0, 10)}.csv`; a.click()
    URL.revokeObjectURL(url)
  }

  if (loading) return <div className="flex justify-center py-16"><div className="w-6 h-6 rounded-full border-2 border-brand-purple border-t-transparent animate-spin" /></div>

  if (selected) {
    return (
      <div>
        <button onClick={() => setSelected(null)} className="no-print flex items-center gap-1.5 text-brand-purple text-sm font-medium mb-4">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
          All installations
        </button>
        <InstallDetail install={selected} lang="en" />
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {error && <p className="text-xs text-red-600">Could not load installations: {error}</p>}
      <div className="flex gap-2">
        <input className="input-field flex-1" placeholder="Search address, serial, engineer, company…" value={query} onChange={e => setQuery(e.target.value)} />
        <button onClick={exportCsv} disabled={!filtered.length} className="flex-shrink-0 text-xs font-semibold px-3 rounded-xl bg-white border border-gray-200 text-brand-navy disabled:opacity-40">CSV</button>
      </div>
      <p className="text-xs text-gray-400">{filtered.length} installation{filtered.length === 1 ? '' : 's'}</p>
      {filtered.length === 0 ? (
        <p className="text-center text-gray-400 text-sm py-12">No installations registered</p>
      ) : filtered.map(i => (
        <button key={i.id} onClick={() => setSelected(i)}
          className="w-full bg-white rounded-2xl border border-gray-100 shadow-sm px-4 py-4 text-left active:bg-gray-50">
          <div className="flex items-start justify-between gap-2 mb-1">
            <p className="font-semibold text-sm text-brand-navy">{i.model} — {i.outdoor_serial}</p>
            <span className="text-xs text-gray-400 flex-shrink-0">{new Date(i.install_date).toLocaleDateString('en-GB')}</span>
          </div>
          <p className="text-xs text-gray-500 line-clamp-2 whitespace-pre-line">{i.address}</p>
          <p className="text-xs text-gray-400 mt-1">{i.partner_contractor || i.user_email}{i.lead_engineer ? ` · ${i.lead_engineer}` : ''}</p>
          {unticked(i) > 0 && <p className="text-xs text-amber-600 mt-1">{unticked(i)} check(s) not ticked</p>}
        </button>
      ))}
    </div>
  )
}
