// Slack notifications for the UK team (new support requests and replies). Optional: does nothing unless
// SLACK_WEBHOOK_URL is set in Vercel. Never throws: a Slack problem must not stop a request or reply being saved.
const esc = s => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
const clip = (s, n = 600) => { const t = String(s ?? '').trim(); return t.length > n ? t.slice(0, n) + '…' : t }

export const APP_URL = process.env.APP_URL || 'https://support-cosy.vercel.app'

export async function notifySlack({ title, lines = [], url }) {
  const hook = process.env.SLACK_WEBHOOK_URL
  if (!hook) return
  try {
    const text = [`*${esc(title)}*`, ...lines.filter(Boolean).map(esc), url ? `<${url}|Open in Support Cosy>` : ''].filter(Boolean).join('\n')
    const ctrl = new AbortController()
    const timer = setTimeout(() => ctrl.abort(), 4000)
    await fetch(hook, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text }), signal: ctrl.signal })
    clearTimeout(timer)
  } catch (err) {
    console.error('slack notify failed:', err?.message)
  }
}
export { clip }
