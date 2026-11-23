import { supabase } from './supabase'

// Phone notifications (Web Push). Needs VITE_VAPID_PUBLIC_KEY at build time.
const KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY

const toKey = b64 => {
  const pad = '='.repeat((4 - (b64.length % 4)) % 4)
  const raw = atob((b64 + pad).replace(/-/g, '+').replace(/_/g, '/'))
  return Uint8Array.from(raw, c => c.charCodeAt(0))
}
const authHeader = async () => ({
  'Content-Type': 'application/json',
  Authorization: `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
})

export const isIOS = () => /iphone|ipad|ipod/i.test(navigator.userAgent)
export const isStandalone = () => window.matchMedia?.('(display-mode: standalone)').matches || window.navigator.standalone === true

// 'unsupported' | 'needs-install' (iPhone, not added to the Home Screen) | 'denied' | 'subscribed' | 'available'
export async function getPushState() {
  if (!KEY || !('serviceWorker' in navigator) || !('Notification' in window)) {
    return isIOS() && !isStandalone() && KEY ? 'needs-install' : 'unsupported'
  }
  if (!('PushManager' in window)) return isIOS() && !isStandalone() ? 'needs-install' : 'unsupported'
  if (Notification.permission === 'denied') return 'denied'
  try {
    const reg = await navigator.serviceWorker.ready
    if (await reg.pushManager.getSubscription()) return Notification.permission === 'granted' ? 'subscribed' : 'available'
  } catch { /* fall through */ }
  return 'available'
}

// Must be called from a tap (browsers require a user gesture to ask for permission).
export async function enablePush() {
  const permission = await Notification.requestPermission()
  if (permission !== 'granted') throw new Error('denied')
  const reg = await navigator.serviceWorker.ready
  const sub = (await reg.pushManager.getSubscription())
    || (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: toKey(KEY) }))
  const res = await fetch('/api/push-subscribe', { method: 'POST', headers: await authHeader(), body: JSON.stringify({ action: 'subscribe', subscription: sub.toJSON() }) })
  if (!res.ok) throw new Error('server')
}

export async function disablePush() {
  const reg = await navigator.serviceWorker.ready
  const sub = await reg.pushManager.getSubscription()
  if (!sub) return
  await fetch('/api/push-subscribe', { method: 'POST', headers: await authHeader(), body: JSON.stringify({ action: 'unsubscribe', endpoint: sub.endpoint }) })
  await sub.unsubscribe()
}
