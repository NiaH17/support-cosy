import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { CHECKS } from '../../lib/installFields'

const ISSUE_LABELS = {
  electrical: 'Electrical problem', mechanical: 'Mechanical problem',
  fault_code: 'Fault code', performance: 'Poor performance',
  commissioning: 'Commissioning', noise: 'Unusual noise',
  connectivity: 'Connectivity', other: 'Other',
}
const RANGES = [['7', '7 days'], ['30', '30 days'], ['90', '90 days'], ['all', 'All time']]
const DAY = 86400000

function startOfDay(d) { const x = new Date(d); x.setHours(0, 0, 0, 0); return x }
function startOfWeek(d) { const x = startOfDay(d); const dow = (x.getDay() + 6) % 7; x.setDate(x.getDate() - dow); return x }
function startOfMonth(d) { const x = startOfDay(d); x.setDate(1); return x }
function bucketStart(d, unit) { return unit === 'day' ? startOfDay(d) : unit === 'week' ? startOfWeek(d) : startOfMonth(d) }
function nextBucket(d, unit) {
  const x = new Date(d)
  if (unit === 'day') x.setDate(x.getDate() + 1)
  else if (unit === 'week') x.setDate(x.getDate() + 7)
  else x.setMonth(x.getMonth() + 1)
  return x
}
function bucketLabel(d, unit) {
  return unit === 'month'
    ? d.toLocaleDateString('en-GB', { month: 'short', year: '2-digit' })
    : d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
}
function fmtDuration(ms) {
  if (ms == null) return '—'
  const h = ms / 3600000
  if (h < 1) return `${Math.max(1, Math.round(ms / 60000))} min`
  if (h < 48) return `${h.toFixed(h < 10 ? 1 : 0)} h`
  return `${(h / 24).toFixed(1)} days`
}

function Stat({ label, value, sub }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-4 py-3">
      <p className="text-2xl font-bold text-brand-navy leading-tight">{value}</p>
      <p className="text-xs text-gray-500 mt-0.5">{label}</p>
      {sub && <p className="text-[11px] text-gray-400 mt-0.5">{sub}</p>}
    </div>
  )
}

function BarList({ rows, total, color = 'bg-brand-purple' }) {
  if (!rows.length) return <p className="text-xs text-gray-400 py-2">No data in this period</p>
  const max = Math.max(...rows.map(r => r.count))
  return (
    <div className="space-y-2.5">
      {rows.map(r => (
        <div key={r.key}>
          <div className="flex items-baseline justify-between gap-3 mb-1">
            <span className="text-xs text-brand-navy font-medium truncate">{r.label}</span>
            <span className="text-xs text-gray-500 flex-shrink-0">
              {r.count} <span className="text-gray-300">·</span> {Math.round((r.count / total) * 100)}%
            </span>
          </div>
          <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
            <div className={`h-full rounded-full ${color}`} style={{ width: `${(r.count / max) * 100}%` }} />
          </div>
          {r.sub && <p className="text-[11px] text-gray-400 mt-0.5">{r.sub}</p>}
        </div>
      ))}
    </div>
  )
}

function Section({ title, children }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-4 py-4">
      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">{title}</p>
      {children}
    </div>
  )
}

export default function ReportingTab({ requests }) {
  const [range, setRange] = useState('30')
  const [installs, setInstalls] = useState([])

  useEffect(() => {
    supabase.from('fr_installations').select('id, install_date, model, partner_contractor, user_email, checks')
      .then(({ data }) => setInstalls(data || []))
  }, [])

  const data = useMemo(() => {
    const now = new Date()
    const all = requests || []
    const from = range === 'all'
      ? (all.length ? new Date(Math.min(...all.map(r => new Date(r.created_at)))) : now)
      : startOfDay(new Date(now.getTime() - (Number(range) - 1) * DAY))
    const inRange = all.filter(r => new Date(r.created_at) >= from)

    // Time series
    const spanDays = Math.max(1, Math.ceil((now - from) / DAY))
    const unit = spanDays <= 31 ? 'day' : spanDays <= 140 ? 'week' : 'month'
    const buckets = []
    for (let d = bucketStart(from, unit); d <= now; d = nextBucket(d, unit)) buckets.push({ start: d, count: 0 })
    inRange.forEach(r => {
      const bs = bucketStart(new Date(r.created_at), unit).getTime()
      const b = buckets.find(x => x.start.getTime() === bs)
      if (b) b.count++
    })

    // Installs registered in the same period (by install date)
    const instInRange = installs.filter(i => new Date(i.install_date) >= from)
    const instBuckets = buckets.map(b => ({ start: b.start, count: 0 }))
    instInRange.forEach(i => {
      const bs = bucketStart(new Date(i.install_date), unit).getTime()
      const b = instBuckets.find(x => x.start.getTime() === bs)
      if (b) b.count++
    })
    const byModel = {}
    const byPartner = {}
    instInRange.forEach(i => {
      byModel[i.model] = (byModel[i.model] || 0) + 1
      const name = (i.partner_contractor || '').trim() || i.user_email || 'Unknown'
      const k = name.toLowerCase()
      byPartner[k] = byPartner[k] || { key: k, label: name, count: 0 }
      byPartner[k].count++
    })
    const modelRows = Object.entries(byModel).map(([k, count]) => ({ key: k, label: k, count })).sort((a, b) => b.count - a.count)
    const partnerRows = Object.values(byPartner).sort((a, b) => b.count - a.count)
    const incomplete = instInRange.filter(i => CHECKS.some(c => !i.checks?.[c.key])).length

    // By type
    const byType = {}
    inRange.forEach(r => { byType[r.issue_type] = (byType[r.issue_type] || 0) + 1 })
    const typeRows = Object.entries(byType)
      .map(([k, count]) => ({ key: k, label: ISSUE_LABELS[k] || k, count }))
      .sort((a, b) => b.count - a.count)

    // By who (company, falling back to login email). Grouped case-insensitively.
    const byWho = {}
    inRange.forEach(r => {
      const name = (r.installation_company || '').trim() || r.user_email || 'Unknown'
      const k = name.toLowerCase()
      byWho[k] = byWho[k] || { key: k, label: name, count: 0, last: null, types: {} }
      byWho[k].count++
      byWho[k].types[r.issue_type] = (byWho[k].types[r.issue_type] || 0) + 1
      const t = new Date(r.created_at)
      if (!byWho[k].last || t > byWho[k].last) byWho[k].last = t
    })
    const whoRows = Object.values(byWho).sort((a, b) => b.count - a.count).map(w => {
      const top = Object.entries(w.types).sort((a, b) => b[1] - a[1])[0]
      return { ...w, sub: `Last request ${w.last.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })} · mostly ${(ISSUE_LABELS[top[0]] || top[0]).toLowerCase()}` }
    })

    // Fault codes
    const codes = {}
    inRange.forEach(r => {
      (r.fault_code || '').split(',').map(c => c.trim()).filter(Boolean).forEach(c => { codes[c] = (codes[c] || 0) + 1 })
    })
    const codeRows = Object.entries(codes).map(([k, count]) => ({ key: k, label: k, count })).sort((a, b) => b.count - a.count).slice(0, 8)
    const codeTotal = codeRows.reduce((s, r) => s + r.count, 0)

    // KPIs
    const replied = inRange.filter(r => r.replied_at)
    const avgReply = replied.length
      ? replied.reduce((s, r) => s + (new Date(r.replied_at) - new Date(r.created_at)), 0) / replied.length
      : null
    const urgency = { high: 0, medium: 0, low: 0 }
    inRange.forEach(r => { if (urgency[r.urgency] != null) urgency[r.urgency]++ })

    return {
      total: inRange.length,
      awaiting: inRange.filter(r => r.status === 'open').length,
      active: inRange.filter(r => r.status === 'in_progress').length,
      closed: inRange.filter(r => ['closed', 'resolved'].includes(r.status)).length,
      avgReply, urgency, unit, buckets, typeRows, whoRows, codeRows, codeTotal,
      installTotal: instInRange.length, instBuckets, modelRows, partnerRows, incomplete,
    }
  }, [requests, installs, range])

  const maxBucket = Math.max(1, ...data.buckets.map(b => b.count))
  const maxInst = Math.max(1, ...data.instBuckets.map(b => b.count))

  return (
    <div className="space-y-4">
      <div className="flex gap-2 overflow-x-auto pb-1">
        {RANGES.map(([val, label]) => (
          <button key={val} onClick={() => setRange(val)}
            className={`flex-shrink-0 text-xs font-semibold px-3 py-1.5 rounded-xl transition-colors ${range === val ? 'bg-brand-navy text-white' : 'bg-white text-gray-500 border border-gray-200'}`}>
            {label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Stat label="Requests" value={data.total} />
        <Stat label="Avg. time to first reply" value={fmtDuration(data.avgReply)} />
        <Stat label="Awaiting first reply" value={data.awaiting} sub={`${data.active} in progress · ${data.closed} closed`} />
        <Stat label="Urgent" value={data.urgency.high} sub={`${data.urgency.medium} normal · ${data.urgency.low} low`} />
        <Stat label="Installs registered" value={data.installTotal} sub={data.incomplete ? `${data.incomplete} with unticked checks` : undefined} />
        <Stat label="Requests per 10 installs" value={data.installTotal ? ((data.total / data.installTotal) * 10).toFixed(1) : '—'} />
      </div>

      <Section title={`Requests per ${data.unit}`}>
        {data.total === 0 ? (
          <p className="text-xs text-gray-400 py-2">No requests in this period</p>
        ) : (
          <>
            <div className="flex items-end gap-[3px] h-32">
              {data.buckets.map((b, i) => (
                <div key={i} className="flex-1 flex flex-col justify-end h-full min-w-0" title={`${bucketLabel(b.start, data.unit)}: ${b.count}`}>
                  {data.buckets.length <= 16 && b.count > 0 && (
                    <span className="text-[10px] text-gray-500 text-center leading-none mb-0.5">{b.count}</span>
                  )}
                  <div className="w-full rounded-t bg-brand-purple" style={{ height: `${(b.count / maxBucket) * 100}%`, minHeight: b.count ? 3 : 0 }} />
                </div>
              ))}
            </div>
            <div className="flex justify-between mt-1.5 text-[10px] text-gray-400">
              <span>{bucketLabel(data.buckets[0].start, data.unit)}</span>
              <span>{bucketLabel(data.buckets[data.buckets.length - 1].start, data.unit)}</span>
            </div>
          </>
        )}
      </Section>

      <Section title={`Installs registered per ${data.unit}`}>
        {data.installTotal === 0 ? (
          <p className="text-xs text-gray-400 py-2">No installs in this period</p>
        ) : (
          <>
            <div className="flex items-end gap-[3px] h-32">
              {data.instBuckets.map((b, i) => (
                <div key={i} className="flex-1 flex flex-col justify-end h-full min-w-0" title={`${bucketLabel(b.start, data.unit)}: ${b.count}`}>
                  {data.instBuckets.length <= 16 && b.count > 0 && (
                    <span className="text-[10px] text-gray-500 text-center leading-none mb-0.5">{b.count}</span>
                  )}
                  <div className="w-full rounded-t bg-brand-green" style={{ height: `${(b.count / maxInst) * 100}%`, minHeight: b.count ? 3 : 0 }} />
                </div>
              ))}
            </div>
            <div className="flex justify-between mt-1.5 text-[10px] text-gray-400">
              <span>{bucketLabel(data.instBuckets[0].start, data.unit)}</span>
              <span>{bucketLabel(data.instBuckets[data.instBuckets.length - 1].start, data.unit)}</span>
            </div>
          </>
        )}
      </Section>

      {data.installTotal > 0 && (
        <>
          <Section title="Installs by model">
            <BarList rows={data.modelRows} total={data.installTotal} color="bg-brand-green" />
          </Section>
          <Section title="Installs by partner / contractor">
            <BarList rows={data.partnerRows} total={data.installTotal} color="bg-brand-green" />
          </Section>
        </>
      )}

      <Section title="By type of request">
        <BarList rows={data.typeRows} total={data.total} />
      </Section>

      <Section title="By who raised them">
        <BarList rows={data.whoRows} total={data.total} color="bg-brand-pink" />
        <p className="text-[11px] text-gray-400 mt-3">Grouped by the installation company entered on the request form (falls back to the login email).</p>
      </Section>

      {data.codeRows.length > 0 && (
        <Section title="Most reported fault codes">
          <BarList rows={data.codeRows} total={data.codeTotal} color="bg-brand-navy" />
        </Section>
      )}
    </div>
  )
}
