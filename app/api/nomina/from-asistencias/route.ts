import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createRateLimiter } from '@/lib/rate-limit'
import { recalcularYPersistir } from '@/lib/payroll/engine'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// 5 requests per minute per empresa (creates DB records, shouldn't be spammed)
const limiter = createRateLimiter(5, 60_000)

// POST /api/nomina/from-asistencias
// Body: { proyectoId, fechaInicio (YYYY-MM-DD), fechaFin (YYYY-MM-DD), encargado? }
export async function POST(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  const { data: eu } = await supabase.from('empresa_users')
    .select('empresa_id, rol').eq('user_id', user.id).eq('activo', true).single()
  if (!eu) return NextResponse.json({ error: 'Empresa no encontrada' }, { status: 404 })
  if (eu.rol === 'capataz') return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
  const empresaId = eu.empresa_id

  const rl = await limiter.check(empresaId)
  if (!rl.allowed) {
    return NextResponse.json(
      { error: 'Demasiadas solicitudes. Espera un momento e intenta de nuevo.' },
      { status: 429, headers: { 'Retry-After': String(rl.retryAfter) } }
    )
  }

  let body: { proyectoId?: string; fechaInicio?: string; fechaFin?: string; encargado?: string }
  try { body = await req.json() } catch { return NextResponse.json({ error: 'JSON inválido' }, { status: 400 }) }

  const { proyectoId, fechaInicio, fechaFin, encargado: encargadoRaw } = body
  const encargado = encargadoRaw ? String(encargadoRaw).trim().slice(0, 200) : undefined
  if (!proyectoId || !fechaInicio || !fechaFin) {
    return NextResponse.json({ error: 'Faltan parámetros: proyectoId, fechaInicio, fechaFin' }, { status: 400 })
  }

  // Validate date range
  const startDate = new Date(fechaInicio)
  const endDate = new Date(fechaFin)
  if (isNaN(startDate.getTime()) || isNaN(endDate.getTime()) || startDate > endDate) {
    return NextResponse.json({ error: 'Rango de fechas inválido' }, { status: 400 })
  }

  // Validate project belongs to this empresa
  const { data: proyecto } = await supabase.from('proyectos')
    .select('id').eq('id', proyectoId).eq('empresa_id', empresaId).single()
  if (!proyecto) {
    return NextResponse.json({ error: 'Proyecto no encontrado' }, { status: 404 })
  }

  // Guard: if a period already exists for this exact project+date range, return it (idempotency).
  const { data: existente } = await supabase
    .from('periodos_nomina')
    .select('id, numero_nomina, total_nomina')
    .eq('empresa_id', empresaId)
    .eq('proyecto_id', proyectoId)
    .eq('fecha_inicio', fechaInicio)
    .eq('fecha_fin', fechaFin)
    .neq('estado', 'pagada')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (existente) {
    return NextResponse.json({
      nominaId: existente.id,
      numeroNomina: existente.numero_nomina,
      totalNomina: existente.total_nomina,
      reutilizada: true,
    })
  }

  // Guard: block partial range overlaps (different dates, same period coverage).
  const { data: solapada } = await supabase
    .from('periodos_nomina')
    .select('id, numero_nomina, fecha_inicio, fecha_fin')
    .eq('empresa_id', empresaId)
    .eq('proyecto_id', proyectoId)
    .lte('fecha_inicio', fechaFin)
    .gte('fecha_fin', fechaInicio)
    .neq('estado', 'pagada')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (solapada) {
    return NextResponse.json(
      {
        error: 'Ya existe una nómina que cubre ese período',
        solapadaId: solapada.id,
        solapada: {
          numero_nomina: solapada.numero_nomina,
          fecha_inicio: solapada.fecha_inicio,
          fecha_fin: solapada.fecha_fin,
        },
      },
      { status: 409 }
    )
  }

  // 1. Verify attendance records exist for early "no records" check
  const { data: asistencias } = await supabase.from('registros_asistencia')
    .select('id, asistio')
    .eq('empresa_id', empresaId)
    .eq('proyecto_id', proyectoId)
    .gte('fecha', fechaInicio).lte('fecha', fechaFin)

  if (!asistencias?.length) {
    return NextResponse.json({ error: 'No hay asistencias registradas en este período' }, { status: 400 })
  }

  if (!asistencias.some(a => a.asistio)) {
    return NextResponse.json({ error: 'No hay asistencias marcadas como presente' }, { status: 400 })
  }

  // 2. Número de nómina (MAX instead of COUNT to avoid gaps after deletions)
  const { data: maxRow } = await supabase
    .from('periodos_nomina')
    .select('numero_nomina')
    .eq('empresa_id', empresaId)
    .order('numero_nomina', { ascending: false })
    .limit(1)
    .maybeSingle()
  const nextNum = ((maxRow?.numero_nomina as number | null) ?? 0) + 1

  // 3. Create period with zeroed totals; engine will update them.
  const { data: periodo, error: periodoErr } = await supabase.from('periodos_nomina').insert({
    empresa_id: empresaId, proyecto_id: proyectoId,
    numero_nomina: nextNum,
    encargado: encargado || 'Auto-generado desde asistencias',
    fecha_inicio: fechaInicio, fecha_fin: fechaFin,
    estado: 'en_progreso',
    subtotal_mano_obra: 0,
    subtotal_administrativos: 0,
    subtotal_conceptos: 0,
    total_nomina: 0,
    observaciones_actividades: `Generada automáticamente desde asistencias del ${fechaInicio} al ${fechaFin}`,
  }).select().single()

  if (periodoErr || !periodo) {
    return NextResponse.json({ error: `Error: ${periodoErr?.message}` }, { status: 500 })
  }

  // 4. Run the payroll engine — populates nomina_lineas_calculadas, syncs lineas_nomina, marks anticipos.
  const { data: engineResult, error: engineErr } = await recalcularYPersistir(supabase, empresaId, periodo.id)
  if (engineErr || !engineResult) {
    await supabase.from('periodos_nomina').delete().eq('id', periodo.id)
    return NextResponse.json({ error: engineErr ?? 'Error al calcular nómina' }, { status: 500 })
  }

  return NextResponse.json({
    nominaId: periodo.id,
    numeroNomina: nextNum,
    totalNomina: engineResult.total_nomina,
    trabajadores: engineResult.lines.length,
    anticiposDescontados: engineResult.anticipos_marcados.length,
  })
}
