import { NextResponse } from 'next/server'
import { timingSafeEqual } from 'node:crypto'
import { createClient } from '@/lib/supabase/server'
import { PLANES, GRATUITO_DB } from '@/lib/plan-limits'
import { captureApiError } from '@/lib/server-error'
import { cacheGet, cacheSet } from '@/lib/redis-cache'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

async function verifyStripeSignature(
  payload: string,
  sigHeader: string,
  secret: string
): Promise<boolean> {
  const parts = sigHeader.split(',').reduce((acc, part) => {
    const [k, v] = part.split('=')
    acc[k] = v
    return acc
  }, {} as Record<string, string>)

  const timestamp = parts.t
  const receivedSig = parts.v1
  if (!timestamp || !receivedSig) return false

  const age = Math.abs(Date.now() - parseInt(timestamp) * 1000)
  if (age > 300_000) return false

  const signedPayload = `${timestamp}.${payload}`
  const encoder = new TextEncoder()
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  )
  const sigBytes = await crypto.subtle.sign('HMAC', key, encoder.encode(signedPayload))
  const expectedSig = Array.from(new Uint8Array(sigBytes))
    .map(b => b.toString(16).padStart(2, '0')).join('')
  // Use constant-time comparison to prevent timing attacks
  try {
    return timingSafeEqual(Buffer.from(expectedSig, 'utf8'), Buffer.from(receivedSig, 'utf8'))
  } catch {
    return false
  }
}

function dbFieldsForTier(tier: string, fallbackTier?: string): Record<string, unknown> {
  const plan = PLANES[tier] ?? PLANES[fallbackTier ?? '']
  if (plan) return plan.db
  // pyme (legacy) maps to pro
  if (tier === 'pyme' || fallbackTier === 'pyme') return PLANES.pro.db
  return PLANES.pro.db
}

function nextVencimiento(): string {
  const v = new Date()
  v.setDate(v.getDate() + 30)
  return v.toISOString().split('T')[0]
}

export async function POST(request: Request) {
  const body = await request.text()
  const sig = request.headers.get('stripe-signature')
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET

  if (!sig || !webhookSecret) {
    return NextResponse.json({ error: 'Config missing' }, { status: 400 })
  }

  const valid = await verifyStripeSignature(body, sig, webhookSecret)
  if (!valid) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  interface StripeEvent { id: string; type: string; data: { object: Record<string, unknown> } }
  const event: StripeEvent = JSON.parse(body)

  // Stripe retries deliveries, so the same event.id can arrive multiple times.
  // Skip anything already processed. Best-effort: if the cache is unavailable the
  // handlers below are idempotent (they set tier state), so a replay is harmless.
  const dedupeKey = event.id ? `stripe:evt:${event.id}` : null
  if (dedupeKey) {
    try {
      if (await cacheGet(dedupeKey)) return NextResponse.json({ received: true, duplicate: true })
    } catch { /* cache down — fall through and process */ }
  }

  const supabase = await createClient()

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as {
          metadata?: { empresa_id?: string; tier?: string }
          subscription?: string
        }
        const empresaId = session.metadata?.empresa_id
        if (!empresaId) {
          captureApiError('stripe/webhook', new Error('checkout.session.completed: missing empresa_id in metadata'))
          break
        }
        const tier = session.metadata?.tier ?? 'pro'
        const { error: dbErr } = await supabase.from('empresas').update({
          ...dbFieldsForTier(tier),
          stripe_subscription_id: session.subscription,
          fecha_vencimiento: nextVencimiento(),
        }).eq('id', empresaId)
        if (dbErr) throw new Error(`DB update failed for checkout.session.completed: ${dbErr.message}`)
        break
      }
      case 'invoice.paid': {
        const inv = event.data.object as {
          customer?: string
          subscription_details?: { metadata?: { tier?: string } }
          lines?: { data?: Array<{ price?: { metadata?: { tier?: string } } }> }
        }
        if (!inv.customer) break
        const { data: emp } = await supabase.from('empresas')
          .select('id, suscripcion_tier')
          .eq('stripe_customer_id', inv.customer)
          .single()
        if (!emp) {
          captureApiError('stripe/webhook', new Error('invoice.paid: empresa not found'), { customer: inv.customer })
          break
        }
        // Resolve tier: subscription metadata > line item price metadata > current DB tier
        const tier =
          inv.subscription_details?.metadata?.tier ??
          inv.lines?.data?.[0]?.price?.metadata?.tier ??
          emp.suscripcion_tier
        const { error: dbErr } = await supabase.from('empresas').update({
          ...dbFieldsForTier(tier, emp.suscripcion_tier),
          fecha_vencimiento: nextVencimiento(),
        }).eq('id', emp.id)
        if (dbErr) throw new Error(`DB update failed for invoice.paid: ${dbErr.message}`)
        break
      }
      case 'customer.subscription.deleted':
      case 'invoice.payment_failed': {
        const obj = event.data.object as { customer?: string }
        if (!obj.customer) break
        const { data: emp } = await supabase.from('empresas')
          .select('id')
          .eq('stripe_customer_id', obj.customer)
          .single()
        if (!emp) break
        const { error: dbErr } = await supabase.from('empresas').update(GRATUITO_DB).eq('id', emp.id)
        if (dbErr) throw new Error(`DB update failed for ${event.type}: ${dbErr.message}`)
        break
      }
    }
  } catch (err) {
    captureApiError('stripe/webhook', err)
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 })
  }

  // Mark processed only after a clean run so a failed attempt can still be retried.
  if (dedupeKey) await cacheSet(dedupeKey, '1', 7 * 24 * 60 * 60).catch(() => {})

  return NextResponse.json({ received: true })
}
