import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { CHECKS, PHOTOS, DECLARATION, BUCKET } from '../lib/installFields'

// Shows one install registration. lang 'fr' (installer) or 'en' (admin).
export default function InstallDetail({ install, lang = 'fr', autoPrint = false }) {
  const [urls, setUrls] = useState({})
  const [ready, setReady] = useState(false)
  const L = lang === 'fr'
    ? { job: 'Chantier et équipement', checks: 'Contrôles', photos: 'Photos', sign: 'Signatures', date: 'Date', address: 'Adresse',
        lead: 'Ingénieur responsable', partner: 'Partenaire / entreprise', model: 'Modèle', outdoor: 'N° de série unité extérieure',
        indoor: 'N° de série unité intérieure / ballon', hub: 'Cosy Hub / MAC / n° de série', by: 'Envoyé par', on: 'Envoyé le',
        eng: "Ingénieur de mise en service", cust: 'Client', print: 'Télécharger la copie (PDF)', printHint: "Dans la fenêtre qui s'ouvre, choisissez « Enregistrer au format PDF ».", title: "Enregistrement d'installation Cosy", yes: 'Fait', no: 'Non coché', decl: 'Déclaration acceptée' }
    : { job: 'Job & asset details', checks: 'Checks', photos: 'Photos', sign: 'Signatures', date: 'Date', address: 'Address',
        lead: 'Lead engineer', partner: 'Partner / contractor', model: 'Model', outdoor: 'Outdoor unit serial',
        indoor: 'Indoor unit / cylinder serial', hub: 'Cosy Hub / MAC / serial', by: 'Submitted by', on: 'Submitted',
        eng: 'Commissioning engineer', cust: 'Customer', print: 'Download PDF copy', printHint: 'In the window that opens, choose "Save as PDF".', title: 'Cosy installation registration', yes: 'Done', no: 'Not ticked', decl: 'Declaration accepted' }
  const locale = lang === 'fr' ? 'fr-FR' : 'en-GB'
  const fmt = d => (d ? new Date(d).toLocaleDateString(locale, { day: 'numeric', month: 'long', year: 'numeric' }) : '—')

  useEffect(() => {
    let cancelled = false
    async function load() {
      const paths = [
        ...Object.values(install.photos || {}).flat(),
        install.engineer_signature_path, install.customer_signature_path,
      ].filter(Boolean)
      if (!paths.length) { setReady(true); return }
      const { data } = await supabase.storage.from(BUCKET).createSignedUrls(paths, 3600)
      if (cancelled || !data) return
      const map = Object.fromEntries(data.filter(d => d.signedUrl).map(d => [d.path, d.signedUrl]))
      // Wait for the images to load so the PDF isn't missing photos
      await Promise.all(Object.values(map).map(u => new Promise(r => { const im = new Image(); im.onload = im.onerror = r; im.src = u })))
      if (cancelled) return
      setUrls(map)
      setReady(true)
    }
    load()
    return () => { cancelled = true }
  }, [install.id])

  useEffect(() => {
    if (autoPrint && ready) { const t = setTimeout(() => window.print(), 500); return () => clearTimeout(t) }
  }, [autoPrint, ready])

  const rows = [
    [L.date, fmt(install.install_date)], [L.address, install.address], [L.lead, install.lead_engineer],
    [L.partner, install.partner_contractor || '—'], [L.model, install.model], [L.outdoor, install.outdoor_serial],
    [L.indoor, install.indoor_serial || '—'], [L.hub, install.hub_serial],
    [L.by, install.user_email || '—'], [L.on, new Date(install.created_at).toLocaleString(locale, { dateStyle: 'long', timeStyle: 'short' })],
  ]

  return (
    <div className="space-y-4">
      <div className="no-print">
        <button onClick={() => window.print()} disabled={!ready} className="w-full btn-primary text-sm">{ready ? L.print : '…'}</button>
        <p className="text-[11px] text-gray-400 text-center mt-1.5">{L.printHint}</p>
      </div>
      <div className="hidden print:block">
        <h1 className="text-lg font-bold text-brand-navy">{L.title}</h1>
        <p className="text-xs text-gray-500">{install.model} — {install.outdoor_serial}</p>
      </div>

      <div className="card space-y-2.5 break-inside-avoid">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">{L.job}</p>
        {rows.map(([k, v]) => (
          <div key={k} className="flex gap-4">
            <span className="text-xs text-gray-400 w-40 flex-shrink-0">{k}</span>
            <span className="text-sm text-brand-navy font-medium break-words min-w-0 whitespace-pre-line">{v}</span>
          </div>
        ))}
      </div>

      <div className="card break-inside-avoid">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">{L.checks}</p>
        <div className="divide-y divide-gray-100">
          {CHECKS.map(c => {
            const ok = !!install.checks?.[c.key]
            return (
              <div key={c.key} className="flex items-start gap-2.5 py-2">
                <span className={`mt-0.5 w-4 h-4 rounded-full flex-shrink-0 flex items-center justify-center text-[10px] font-bold ${ok ? 'bg-green-100 text-brand-green' : 'bg-red-100 text-red-600'}`}>{ok ? '✓' : '!'}</span>
                <span className="text-xs text-gray-700 flex-1 leading-snug">{c[lang]}</span>
                {!ok && <span className="text-[11px] text-red-600 font-semibold flex-shrink-0">{L.no}</span>}
              </div>
            )
          })}
        </div>
      </div>

      <div className="card space-y-4">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">{L.photos}</p>
        {PHOTOS.map(p => (
          <div key={p.key}>
            <p className="text-xs text-gray-600 mb-1.5">{p[lang]}</p>
            <div className="flex gap-2 flex-wrap">
              {(install.photos?.[p.key] || []).map(path => (
                urls[path]
                  ? <a key={path} href={urls[path]} target="_blank" rel="noreferrer"><img src={urls[path]} alt="" className="w-24 h-24 rounded-xl object-cover border border-gray-200" /></a>
                  : <div key={path} className="w-24 h-24 rounded-xl bg-gray-100 animate-pulse" />
              ))}
              {!(install.photos?.[p.key] || []).length && <span className="text-xs text-gray-400">—</span>}
            </div>
          </div>
        ))}
      </div>

      <div className="card space-y-4">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">{L.sign}</p>
        <p className="text-xs text-gray-600 leading-snug">{DECLARATION[lang]}{install.declaration_accepted ? ` (${L.decl})` : ''}</p>
        {[[L.eng, install.engineer_signature_path, install.engineer_signed_on], [L.cust, install.customer_signature_path, install.customer_signed_on]].map(([label, path, date]) => (
          <div key={label}>
            <p className="text-xs text-gray-400 mb-1">{label} — {fmt(date)}</p>
            {path && urls[path] ? <img src={urls[path]} alt="" className="h-24 bg-white rounded-xl border border-gray-200" /> : <div className="h-24 rounded-xl bg-gray-100" />}
          </div>
        ))}
      </div>
    </div>
  )
}
