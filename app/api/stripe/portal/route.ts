import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createRateLimiter } from '@/lib/rate-limit'
import { captureApiError } from '@/lib/server-error'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const limiter = createRateLimiter(5, 60_000)

export async function POST() {
  const stripeKey = process.env.STRIPE_SECRET_KEY
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
  if (!stripeKey) return NextResponse.json({ error: 'STRIPE_SECRET_KEY no configurada' }, { status: 500 })

  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

    const { allowed, retryAfter } = await limiter.check(user.id)
    if (!allowed) return NextResponse.json({ error: 'Demasiadas solicitudes. Intenta de nuevo.' }, { status: 429, headers: { 'Retry-After': String(retryAfter) } })

    const { data: eu } = await supabase
      .from('empresa_users')
      .select('empresa_id, empresas(stripe_customer_id)')
      .eq('user_id', user.id)
      .eq('activo', true)
      .single()

    const empresa = eu?.empresas as unknown as { stripe_customer_id?: string } | null
    if (!empresa?.stripe_customer_id) {
      return NextResponse.json({ error: 'No hay suscripción activa' }, { status: 404 })
    }

    const portalRes = await fetch('https://api.stripe.com/v1/billing_portal/sessions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${stripeKey}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        customer: empresa.stripe_customer_id,
        return_url: `${appUrl}/dashboard/planes`,
      }),
    })

    const portal = await portalRes.json()
    if (!portalRes.ok) {
      captureApiError('stripe/portal', new Error(portal?.error?.message ?? 'Stripe portal error'))
      return NextResponse.json({ error: 'Error al acceder al portal. Intenta de nuevo.' }, { status: 500 })
    }

    return NextResponse.json({ url: portal.url })

  } catch (err: unknown) {
    captureApiError('stripe/portal', err)
    return NextResponse.json({ error: 'Error inesperado. Intenta de nuevo.' }, { status: 500 })
  }
}
