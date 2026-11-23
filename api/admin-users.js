// POST /api/admin-users   (admins only)
// Actions: list | create | create_company | set_company | set_role | set_password | remove_access
// Manages the accounts that can use Support Cosy: French partners and UK support. This endpoint can never grant UK admin.
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
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
async function loadCompanies() {
  const { data, error } = await supabase.from('fr_companies').select('id, name').order('name')
  if (error) throw error
  return data || []
}
// Company membership lives in app_metadata.company_id (users cannot edit it); user_metadata.company_name is only a label
const companyPatch = (u, company) => ({
  app_metadata: { ...u.app_metadata, company_id: company ? company.id : null },
  user_metadata: { ...u.user_metadata, company_name: company ? company.name : '' },
})
const summary = (u, names = {}) => ({
  id: u.id, email: u.email, full_name: u.user_metadata?.full_name || '',
  company_id: u.app_metadata?.company_id || null,
  company_name: names[u.app_metadata?.company_id] || '',
  role: u.app_metadata?.role === 'admin' ? 'admin' : (u.app_metadata?.cosy_role === 'support' ? 'support' : 'partner'),
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
      const companies = await loadCompanies()
      const names = Object.fromEntries(companies.map(c => [c.id, c.name]))
      return res.status(200).json({ users: out.map(u => summary(u, names)), companies })
    }

    if (action === 'create_company') {
      const name = String(req.body.name || '').trim().slice(0, 120)
      if (!name) return res.status(400).json({ error: 'Company name required' })
      const { data, error } = await supabase.from('fr_companies').insert({ name }).select('id, name').single()
      if (error) {
        if (error.code === '23505') return res.status(409).json({ error: 'A company with that name already exists' })
        throw error
      }
      return res.status(200).json({ success: true, company: data })
    }

    if (action === 'set_role') {
      const { user_id, role } = req.body
      if (!['partner', 'support'].includes(role)) return res.status(400).json({ error: 'Invalid role' })
      const { data, error: gErr } = await supabase.auth.admin.getUserById(user_id)
      if (gErr || !data?.user || !data.user.app_metadata?.apps?.includes(APP)) return res.status(404).json({ error: 'User not found' })
      if (data.user.app_metadata?.role === 'admin') return res.status(400).json({ error: 'UK admin accounts are managed in the database' })
      const meta = { ...data.user.app_metadata }
      if (role === 'support') { meta.cosy_role = 'support'; meta.company_id = null } else { delete meta.cosy_role }
      const { error } = await supabase.auth.admin.updateUserById(data.user.id, { app_metadata: meta })
      if (error) throw error
      return res.status(200).json({ success: true })
    }

    if (action === 'set_company') {
      const { user_id, company_id } = req.body
      const { data, error: gErr } = await supabase.auth.admin.getUserById(user_id)
      if (gErr || !data?.user || !data.user.app_metadata?.apps?.includes(APP)) return res.status(404).json({ error: 'User not found' })
      let company = null
      if (company_id) {
        if (!UUID.test(company_id)) return res.status(400).json({ error: 'Invalid company' })
        const { data: co } = await supabase.from('fr_companies').select('id, name').eq('id', company_id).maybeSingle()
        if (!co) return res.status(404).json({ error: 'Company not found' })
        company = co
      }
      const { error } = await supabase.auth.admin.updateUserById(data.user.id, companyPatch(data.user, company))
      if (error) throw error
      return res.status(200).json({ success: true })
    }

    if (action === 'create') {
      const email = String(req.body.email || '').trim().toLowerCase()
      const password = String(req.body.password || '')
      const full_name = String(req.body.full_name || '').trim().slice(0, 120)
      const role = req.body.role === 'support' ? 'support' : 'partner'
      let company = null
      if (role === 'partner' && req.body.company_id) {
        if (!UUID.test(req.body.company_id)) return res.status(400).json({ error: 'Invalid company' })
        const { data: co } = await supabase.from('fr_companies').select('id, name').eq('id', req.body.company_id).maybeSingle()
        if (!co) return res.status(404).json({ error: 'Company not found' })
        company = co
      }
      if (!EMAIL.test(email)) return res.status(400).json({ error: 'Invalid email address' })

      const existing = await findByEmail(email)
      if (existing) {
        // The email already has an account (e.g. Octo Assist): grant Support Cosy access, leave its password alone
        const { error } = await supabase.auth.admin.updateUserById(existing.id, {
          app_metadata: { ...existing.app_metadata, apps: withApp(existing), ...(company ? { company_id: company.id } : {}), ...(role === 'support' && existing.app_metadata?.role !== 'admin' ? { cosy_role: 'support' } : {}) },
          user_metadata: { ...existing.user_metadata, ...(full_name ? { full_name } : {}), ...(company ? { company_name: company.name } : {}) },
        })
        if (error) throw error
        return res.status(200).json({ success: true, granted_existing: true })
      }
      if (password.length < 8) return res.status(400).json({ error: 'Password must be at least 8 characters' })
      const { error } = await supabase.auth.admin.createUser({
        email, password, email_confirm: true,
        user_metadata: { full_name, company_name: company?.name || '' },
        app_metadata: { apps: [APP], ...(company ? { company_id: company.id } : {}), ...(role === 'support' ? { cosy_role: 'support' } : {}) },
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
      if (u.app_metadata?.role === 'admin') return res.status(400).json({ error: 'UK admin accounts are managed in the database' })
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
