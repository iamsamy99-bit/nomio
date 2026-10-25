import { NextResponse } from 'next/server'
import { timingSafeEqual } from 'node:crypto'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// Relays Sentry alert webhooks to a Telegram chat. Sentry has no native Telegram
// integration, so configure a Sentry alert action of type "Webhook" pointing at:
//   https://<app>/api/alerts/telegram?key=<SENTRY_ALERT_WEBHOOK_SECRET>
// Required env: TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID, SENTRY_ALERT_WEBHOOK_SECRET.

function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a)
  const bb = Buffer.from(b)
  if (ab.length !== bb.length) return false
  try {
    return timingSafeEqual(ab, bb)
  } catch {
    return false
  }
}

function escapeHtml(s: string): string {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

const LEVEL_ICON: Record<string, string> = {
  fatal: '🟥', error: '🔴', warning: '🟡', info: '🔵', debug: '⚪',
}

// Sentry webhook payloads vary by integration type; pull the useful bits from
// whichever shape arrived without assuming a single schema.
function extract(payload: Record<string, unknown>): { level: string; title: string; url?: string; project?: string } {
  const data = (payload.data ?? {}) as Record<string, unknown>
  const event = (data.event ?? payload.event ?? {}) as Record<string, unknown>
  const level = String(
    (event.level as string) || (payload.level as string) || 'error',
  ).toLowerCase()
  const title =
    (event.title as string) ||
    (payload.message as string) ||
    (event.message as string) ||
    (payload.culprit as string) ||
    'Alerta de Sentry'
  const url =
    (data.url as string) ||
    (payload.url as string) ||
    (event.web_url as string) ||
    undefined
  const project =
    (payload.project_name as string) ||
    (payload.project as string) ||
    undefined
  return { level, title, url, project }
}

export async function POST(req: Request) {
  const secret = process.env.SENTRY_ALERT_WEBHOOK_SECRET
  const botToken = process.env.TELEGRAM_BOT_TOKEN
  const chatId = process.env.TELEGRAM_CHAT_ID

  if (!secret || !botToken || !chatId) {
    // Misconfigured: do not reveal which piece is missing.
    return NextResponse.json({ error: 'not configured' }, { status: 503 })
  }

  const key = new URL(req.url).searchParams.get('key') ?? ''
  if (!safeEqual(key, secret)) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  let payload: Record<string, unknown>
  try {
    payload = await req.json()
  } catch {
    return NextResponse.json({ error: 'invalid json' }, { status: 400 })
  }

  const { level, title, url, project } = extract(payload)
  const icon = LEVEL_ICON[level] ?? '🔔'
  const lines = [
    `${icon} <b>${escapeHtml(level.toUpperCase())}</b>${project ? ` — ${escapeHtml(project)}` : ''}`,
    escapeHtml(title).slice(0, 600),
  ]
  if (url) lines.push(escapeHtml(url))
  const text = lines.join('\n')

  try {
    const tgRes = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: 'HTML',
        disable_web_page_preview: true,
      }),
      signal: AbortSignal.timeout(8_000),
    })
    if (!tgRes.ok) {
      // Surface Telegram API failures with status only (never the bot token).
      console.error('telegram relay: sendMessage failed', { status: tgRes.status })
      return NextResponse.json({ error: 'telegram send failed' }, { status: 502 })
    }
  } catch {
    return NextResponse.json({ error: 'telegram unreachable' }, { status: 502 })
  }

  return NextResponse.json({ ok: true })
}
