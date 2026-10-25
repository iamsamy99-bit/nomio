import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { recalcularYPersistir } from '@/lib/payroll/engine'
import { createRateLimiter } from '@/lib/rate-limit'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// 30 requests per minute per empresa (wizard calls this on each step)
const limiter = createRateLimiter(30, 60_000)

// POST /api/payroll/recalcular
// Body: { periodoNominaId: string }
export async function POST(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  const { data: eu } = await supabase
    .from('empresa_users')
    .select('empresa_id, rol')
    .eq('user_id', user.id)
    .eq('activo', true)
    .single()
  if (!eu) return NextResponse.json({ error: 'Empresa no encontrada' }, { status: 404 })
  if (eu.rol === 'capataz') return NextResponse.json({ error: 'No autorizado' }, { status: 403 })

  const rl = await limiter.check(eu.empresa_id)
  if (!rl.allowed) {
    return NextResponse.json(
      { error: 'Demasiadas solicitudes. Espera un momento e intenta de nuevo.' },
      { status: 429, headers: { 'Retry-After': String(rl.retryAfter) } }
    )
  }

  let body: { periodoNominaId?: string }
  try { body = await req.json() } catch {
    return NextResponse.json({ error: 'JSON inválido' }, { status: 400 })
  }

  const { periodoNominaId } = body
  if (!periodoNominaId) {
    return NextResponse.json({ error: 'Falta periodoNominaId' }, { status: 400 })
  }

  const { data, error } = await recalcularYPersistir(supabase, eu.empresa_id, periodoNominaId)
  if (error) return NextResponse.json({ error }, { status: 400 })

  return NextResponse.json({
    ok: true,
    result: data,
    trabajadores: data!.lines.length,
    total_nomina: data!.total_nomina,
    anticipos_descontados: data!.anticipos_marcados.length,
  })
}
