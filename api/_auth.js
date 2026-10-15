// Shared auth helper for API routes. The leading underscore stops Vercel exposing it as an endpoint.
import { createClient } from '@supabase/supabase-js'

export const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

// Verifies the caller's Supabase JWT (Authorization: Bearer <token>).
// Returns { user, isAdmin } or null. The role comes from app_metadata, which users cannot edit.
export async function getCaller(req) {
  const header = req.headers.authorization || ''
  const token = header.startsWith('Bearer ') ? header.slice(7) : null
  if (!token) return null
  const { data, error } = await supabase.auth.getUser(token)
  if (error || !data?.user) return null
  return { user: data.user, isAdmin: data.user.app_metadata?.role === 'admin' }
}
