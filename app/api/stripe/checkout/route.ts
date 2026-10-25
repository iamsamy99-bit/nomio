import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { PLANES } from '@/lib/plan-limits'
import { createRateLimiter } from '@/lib/rate-limit'
import { captureApiError } from '@/lib/server-error'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 30

const limiter = createRateLimiter(3, 60_000)

export async function POST(req: Request) {
  const stripeKey = process.env.STRIPE_SECRET_KEY?.trim()
  const appUrl = (process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000').trim()

  if (!stripeKey) {
    console.error('checkout: STRIPE_SECRET_KEY no configurada')
    return NextResponse.json({ error: 'Error de configuración del servidor' }, { status: 500 })
  }

  let body: { tier?: string }
  try { body = await req.json() } catch { body = {} }

  const TIERS_COMPRABLES = ['basico', 'pro', 'premium'] as const
  const tierKey = (TIERS_COMPRABLES as readonly string[]).includes(body.tier ?? '') ? body.tier! : 'pro'
  const plan = PLANES[tierKey]

  const priceIdEnv = plan.envPriceId ? process.env[plan.envPriceId]?.trim() : undefined
  // Fallback: legacy STRIPE_PYME_PRICE_ID maps to pro
  let priceId = priceIdEnv || (tierKey === 'pro' ? process.env.STRIPE_PYME_PRICE_ID?.trim() : undefined)

  // If no price ID env var set but we have a product ID, resolve the active price from Stripe
  if (!priceId && plan.stripeProductId) {
    const priceRes = await fetch(
      `https://api.stripe.com/v1/prices?product=${plan.stripeProductId}&active=true&type=recurring&limit=1`,
      { headers: { Authorization: `Bearer ${stripeKey}` } }
    )
    const priceData = await priceRes.json()
    if (!priceRes.ok) {
      const stripeMsg = priceData?.error?.message ?? 'Error desconocido de Stripe'
      console.error(`checkout: Stripe prices lookup failed for product "${plan.stripeProductId}": ${stripeMsg}`)
      return NextResponse.json({ error: `Error al obtener precio de Stripe: ${stripeMsg}` }, { status: 500 })
    }
    priceId = priceData?.data?.[0]?.id as string | undefined
    if (!priceId) {
      console.error(`checkout: no active recurring price for product "${plan.stripeProductId}" (tier "${tierKey}")`)
      return NextResponse.json({
        error: `El producto "${plan.nombre}" no tiene un precio recurrente activo en Stripe. Agrega un precio mensual al producto ${plan.stripeProductId} en tu dashboard de Stripe.`
      }, { status: 500 })
    }
  }

  if (!priceId) {
    console.error(`checkout: price ID env var not set for tier "${tierKey}" (${plan.envPriceId})`)
    return NextResponse.json({ error: 'Error de configuración: falta el price ID de Stripe' }, { status: 500 })
  }
  if (!priceId.startsWith('price_')) {
    console.error(`checkout: price ID invalido para tier "${tierKey}": "${priceId.substring(0, 8)}..."`)
    return NextResponse.json({ error: `Price ID invalido: "${priceId.substring(0, 12)}..." — debe empezar con price_` }, { status: 500 })
  }

  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

    const { allowed, retryAfter } = await limiter.check(user.id)
    if (!allowed) return NextResponse.json({ error: 'Demasiadas solicitudes. Intenta de nuevo.' }, { status: 429, headers: { 'Retry-After': String(retryAfter) } })

    const { data: eu } = await supabase
      .from('empresa_users')
      .select('empresa_id, empresas(id, nombre, stripe_customer_id)')
      .eq('user_id', user.id)
      .eq('activo', true)
      .single()

    if (!eu) return NextResponse.json({ error: 'Empresa no encontrada' }, { status: 404 })
    const empresa = eu.empresas as unknown as { id: string; nombre: string; stripe_customer_id?: string } | null
    if (!empresa) return NextResponse.json({ error: 'Empresa no encontrada' }, { status: 404 })

    let customerId = empresa.stripe_customer_id
    if (!customerId) {
      const custRes = await fetch('https://api.stripe.com/v1/customers', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${stripeKey}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          email: user.email ?? '',
          name: empresa.nombre,
          'metadata[empresa_id]': eu.empresa_id,
          'metadata[user_id]': user.id,
        }),
      })
      if (!custRes.ok) {
        const err = await custRes.json().catch(() => ({}))
        captureApiError('stripe/checkout', new Error('Stripe customer creation failed'), { message: err?.error?.message })
        return NextResponse.json({ error: 'Error al procesar el pago. Intenta de nuevo.' }, { status: 500 })
      }
      const customer = await custRes.json()
      customerId = customer.id
      await supabase.from('empresas').update({ stripe_customer_id: customerId }).eq('id', eu.empresa_id)
    }

    const sessionRes = await fetch('https://api.stripe.com/v1/checkout/sessions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${stripeKey}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        customer: customerId!,
        mode: 'subscription',
        'payment_method_types[0]': 'card',
        'line_items[0][price]': priceId,
        'line_items[0][quantity]': '1',
        'subscription_data[trial_period_days]': '14',
        'subscription_data[metadata][empresa_id]': eu.empresa_id,
        'subscription_data[metadata][tier]': tierKey,
        'metadata[empresa_id]': eu.empresa_id,
        'metadata[tier]': tierKey,
        allow_promotion_codes: 'true',
        success_url: `${appUrl}/dashboard/planes?success=1`,
        cancel_url: `${appUrl}/dashboard/planes?canceled=1`,
      }),
    })

    const session = await sessionRes.json()
    if (!sessionRes.ok) {
      const stripeMsg = session?.error?.message ?? 'Error desconocido'
      captureApiError('stripe/checkout', new Error('Stripe session error'), { message: stripeMsg })
      return NextResponse.json({ error: 'Error al crear sesión de pago. Intenta de nuevo.' }, { status: 500 })
    }

    return NextResponse.json({ url: session.url })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    captureApiError('stripe/checkout', err)
    return NextResponse.json({ error: 'Error inesperado. Intenta de nuevo.' }, { status: 500 })
  }
}
