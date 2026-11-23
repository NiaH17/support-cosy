// Installers who use the app without a login are recognised only by a random secret kept on their device.
// Clearing the browser data (or switching phone) loses access to the saved list; the installs themselves are not deleted.
const KEY = 'sc_device_token'

export function getDeviceToken() {
  try {
    let t = localStorage.getItem(KEY)
    if (!/^[0-9a-f]{64}$/.test(t || '')) {
      t = Array.from(crypto.getRandomValues(new Uint8Array(32)), b => b.toString(16).padStart(2, '0')).join('')
      localStorage.setItem(KEY, t)
    }
    return t
  } catch {
    return null // storage blocked (private mode)
  }
}

export async function anonCall(body) {
  const token = getDeviceToken()
  if (!token) throw new Error("Impossible d'enregistrer sur cet appareil (navigation privée ?)")
  const res = await fetch('/api/anon-installs', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...body, token }),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.error || 'Erreur serveur')
  return data
}
