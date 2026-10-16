import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'

async function call(body) {
  const token = (await supabase.auth.getSession()).data.session?.access_token
  const res = await fetch('/api/admin-users', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(body),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.error || 'Request failed')
  return data
}

function generatePassword() {
  const chars = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  const bytes = crypto.getRandomValues(new Uint32Array(12))
  return Array.from(bytes, b => chars[b % chars.length]).join('')
}

export default function UsersTab({ currentUserId }) {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [form, setForm] = useState({ email: '', full_name: '', company_name: '', password: generatePassword() })
  const [saving, setSaving] = useState(false)
  const [created, setCreated] = useState(null) // { email, password } shown once so it can be passed on
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  async function load() {
    try { setUsers((await call({ action: 'list' })).users) } catch (e) { setError(e.message) }
    setLoading(false)
  }
  useEffect(() => { load() }, [])

  async function create(e) {
    e.preventDefault()
    setError(''); setNotice(''); setCreated(null); setSaving(true)
    try {
      const r = await call({ action: 'create', ...form })
      if (r.granted_existing) setNotice(`${form.email} already had an account. Support Cosy access was added; their password is unchanged.`)
      else setCreated({ email: form.email, password: form.password })
      setForm({ email: '', full_name: '', company_name: '', password: generatePassword() })
      await load()
    } catch (err) { setError(err.message) }
    setSaving(false)
  }

  async function resetPassword(u) {
    const pw = generatePassword()
    if (!window.confirm(`Set a new password for ${u.email}?`)) return
    try { await call({ action: 'set_password', user_id: u.id, password: pw }); setCreated({ email: u.email, password: pw }) } catch (err) { setError(err.message) }
  }
  async function removeAccess(u) {
    if (!window.confirm(`Remove Support Cosy access for ${u.email}? Their account is kept (it still works for any other app they have).`)) return
    try { await call({ action: 'remove_access', user_id: u.id }); await load() } catch (err) { setError(err.message) }
  }

  return (
    <div className="space-y-4">
      {error && <div className="bg-red-50 border border-red-200 rounded-2xl px-4 py-3 text-sm text-red-700">{error}</div>}
      {notice && <div className="bg-blue-50 border border-blue-200 rounded-2xl px-4 py-3 text-sm text-blue-800">{notice}</div>}
      {created && (
        <div className="bg-green-50 border border-green-200 rounded-2xl px-4 py-3 text-sm text-green-900">
          <p className="font-semibold mb-1">Login details — copy them now, the password is not shown again</p>
          <p className="font-mono break-all">{created.email}</p>
          <p className="font-mono break-all">{created.password}</p>
          <button className="mt-2 text-xs font-semibold underline" onClick={() => navigator.clipboard?.writeText(`${created.email}\n${created.password}`)}>Copy</button>
        </div>
      )}

      <form onSubmit={create} className="bg-white rounded-2xl border border-gray-100 shadow-sm px-4 py-4 space-y-3">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Add a Support Cosy user</p>
        <input className="input-field" type="email" placeholder="Email" value={form.email} onChange={e => set('email', e.target.value)} required />
        <input className="input-field" placeholder="Full name" value={form.full_name} onChange={e => set('full_name', e.target.value)} />
        <input className="input-field" placeholder="Company" value={form.company_name} onChange={e => set('company_name', e.target.value)} />
        <div className="flex gap-2">
          <input className="input-field flex-1 font-mono" value={form.password} onChange={e => set('password', e.target.value)} minLength={8} required />
          <button type="button" onClick={() => set('password', generatePassword())} className="flex-shrink-0 text-xs font-semibold px-3 rounded-xl bg-white border border-gray-200 text-brand-navy">New</button>
        </div>
        <p className="text-[11px] text-gray-400">If the email already has an Octo Assist account, this adds Support Cosy access and leaves the password as it is.</p>
        <button type="submit" disabled={saving} className="btn-primary text-sm">{saving ? 'Saving…' : 'Create user'}</button>
      </form>

      <div>
        <p className="text-xs text-gray-400 mb-2">{users.length} user{users.length === 1 ? '' : 's'} with Support Cosy access</p>
        {loading ? (
          <div className="flex justify-center py-8"><div className="w-6 h-6 rounded-full border-2 border-brand-purple border-t-transparent animate-spin" /></div>
        ) : (
          <div className="space-y-2">
            {users.map(u => (
              <div key={u.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm px-4 py-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-brand-navy truncate">{u.full_name || u.email}</p>
                    {u.full_name && <p className="text-xs text-gray-500 truncate">{u.email}</p>}
                    <p className="text-xs text-gray-400 mt-0.5">
                      {u.company_name ? `${u.company_name} · ` : ''}{u.last_sign_in_at ? `Last login ${new Date(u.last_sign_in_at).toLocaleDateString('en-GB')}` : 'Never logged in'}
                    </p>
                  </div>
                  {u.is_admin && <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-brand-purple/10 text-brand-purple flex-shrink-0">Admin</span>}
                </div>
                {!u.is_admin && (
                  <div className="flex gap-3 mt-2">
                    <button onClick={() => resetPassword(u)} className="text-xs font-semibold text-brand-purple">Reset password</button>
                    {u.id !== currentUserId && <button onClick={() => removeAccess(u)} className="text-xs font-semibold text-red-600">Remove access</button>}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
