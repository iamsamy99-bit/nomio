import { NextResponse } from 'next/server'

export const runtime = 'edge'

export async function GET() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !anonKey) {
    return NextResponse.json(
      { status: 'error', db_latency_ms: null, ts: new Date().toISOString(), error: 'missing_config' },
      { status: 500, headers: { 'Cache-Control': 'no-store' } }
    )
  }

  const start = Date.now()
  let status: 'ok' | 'degraded' | 'error' = 'ok'
  let errorMsg: string | undefined

  try {
    // Any HTTP response (even 401/404 from the REST root) means Supabase answered
    // and is reachable; we only measure round-trip latency here. A thrown fetch
    // (network failure / timeout) is the real outage signal, handled below.
    await fetch(`${supabaseUrl}/rest/v1/`, {
      headers: {
        apikey: anonKey,
        Authorization: `Bearer ${anonKey}`,
      },
      signal: AbortSignal.timeout(5000),
    })
  } catch (err) {
    status = 'error'
    errorMsg = err instanceof Error ? err.message : 'unknown'
  }

  const latency = Date.now() - start
  if (status === 'ok' && latency > 2000) status = 'degraded'

  const httpStatus = status === 'error' ? 503 : 200

  return NextResponse.json(
    { status, db_latency_ms: latency, ts: new Date().toISOString(), ...(errorMsg && { error: errorMsg }) },
    { status: httpStatus, headers: { 'Cache-Control': 'no-store' } }
  )
}
