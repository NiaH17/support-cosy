// Helpers for installers who use the app without a login. Their device holds a random secret token;
// the server only ever stores its hash. IP addresses are stored hashed too (rate limiting only).
import crypto from 'node:crypto'

export const sha256 = s => crypto.createHash('sha256').update(s).digest('hex')
export const TOKEN = /^[0-9a-f]{64}$/

export function deviceHash(req) {
  const t = req.headers['x-device-token'] || req.body?.token
  return typeof t === 'string' && TOKEN.test(t) ? sha256('device:' + t) : null
}

export function ipHash(req) {
  const ip = String(req.headers['x-forwarded-for'] || '').split(',')[0].trim() || req.socket?.remoteAddress || 'unknown'
  return sha256('ip:' + ip + ':' + (process.env.SUPABASE_SERVICE_ROLE_KEY || ''))
}
