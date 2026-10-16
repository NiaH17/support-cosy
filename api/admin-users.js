// POST /api/admin-users   (admins only)
// Actions: list | create | set_password | remove_access
// Manages the accounts that can use Support Cosy. Accounts are plain installers: this endpoint can never grant the admin role.
import { supabase, getCaller } from './_auth.js'

const APP = 'support_cosy'
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

async function findByEmail(email) {
  for (let page = 1; page <= 10; page++) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 200 })
    if (error) throw error
    const hit = data.users.find(u => (u.email || '').toLowerCase() === email)
    if (hit) return hit
    if (data.users.length < 200) return null
  }
  return null
}
const withApp = u => Array.from(new Set([...(u.app_metadata?.apps || []), APP]))
const summary = u => ({
  id: u.id, email: u.email, full_name: u.user_metadata?.full_name || '', company_name: u.user_metadata?.company_name || '',
  is_admin: u.app_metadata?.role === 'admin', created_at: u.created_at, last_sign_in_at: u.last_sign_in_at,
})

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })
  try {
    const caller = await getCaller(req)
    if (!caller) return res.status(401).json({ error: 'Not authenticated' })
    if (!caller.isAdmin) return res.status(403).json({ error: 'Forbidden' })

    const { action } = req.body || {}

    if (action === 'list') {
      const out = []
      for (let page = 1; page <= 10; page++) {
        const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 200 })
        if (error) throw error
        out.push(...data.users.filter(u => u.app_metadata?.apps?.includes(APP)))
        if (data.users.length < 200) break
      }
      out.sort((a, b) => (b.created_at || '').localeCompare(a.created_at || ''))
      return res.status(200).json({ users: out.map(summary) })
    }

    if (action === 'create') {
      const email = String(req.body.email || '').trim().toLowerCase()
      const password = String(req.body.password || '')
      const full_name = String(req.body.full_name || '').trim().slice(0, 120)
      const company_name = String(req.body.company_name || '').trim().slice(0, 120)
      if (!EMAIL.test(email)) return res.status(400).json({ error: 'Invalid email address' })

      const existing = await findByEmail(email)
      if (existing) {
        // The email already has an account (e.g. Octo Assist): grant Support Cosy access, leave its password alone
        const { error } = await supabase.auth.admin.updateUserById(existing.id, {
          app_metadata: { ...existing.app_metadata, apps: withApp(existing) },
          user_metadata: { ...existing.user_metadata, ...(full_name ? { full_name } : {}), ...(company_name ? { company_name } : {}) },
        })
        if (error) throw error
        return res.status(200).json({ success: true, granted_existing: true })
      }
      if (password.length < 8) return res.status(400).json({ error: 'Password must be at least 8 characters' })
      const { error } = await supabase.auth.admin.createUser({
        email, password, email_confirm: true,
        user_metadata: { full_name, company_name },
        app_metadata: { apps: [APP] },
      })
      if (error) throw error
      return res.status(200).json({ success: true, granted_existing: false })
    }

    if (action === 'set_password' || action === 'remove_access') {
      const { user_id, password } = req.body
      const { data, error: gErr } = await supabase.auth.admin.getUserById(user_id)
      if (gErr || !data?.user) return res.status(404).json({ error: 'User not found' })
      const u = data.user
      if (!u.app_metadata?.apps?.includes(APP)) return res.status(404).json({ error: 'User not found' })
      if (action === 'set_password') {
        if (String(password || '').length < 8) return res.status(400).json({ error: 'Password must be at least 8 characters' })
        const { error } = await supabase.auth.admin.updateUserById(u.id, { password })
        if (error) throw error
      } else {
        if (u.id === caller.user.id) return res.status(400).json({ error: 'You cannot remove your own access' })
        const apps = (u.app_metadata.apps || []).filter(a => a !== APP)
        const { error } = await supabase.auth.admin.updateUserById(u.id, { app_metadata: { ...u.app_metadata, apps } })
        if (error) throw error
      }
      return res.status(200).json({ success: true })
    }

    return res.status(400).json({ error: 'Unknown action' })
  } catch (err) {
    console.error('admin-users error:', err)
    return res.status(500).json({ error: err.message || 'Server error' })
  }
}
