import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { sendEmail } from '@/lib/email/resend'
import { captureApiError, reportAnomaly } from '@/lib/server-error'
import { formatMXN, formatDate, padNomina } from '@/lib/utils'
import { createRateLimiter, createDailyLimiter } from '@/lib/rate-limit'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const limiter = createRateLimiter(3, 60_000)
// Resend free tier is 100 emails/day for the whole account; cap each empresa well
// below that so one tenant cannot exhaust the shared quota for everyone.
const dailyLimiter = createDailyLimiter(50)

interface ReciboEmailData {
  trabajadorId: string
  nombre: string
  email: string
  modalidad: string
  diasTrabajados: number
  diasFestivos: number
  horasExtra: number
  subtotalBase: number
  totalHorasExtra: number
  conceptosSuma: number
  conceptosDescuento: number
  anticiposDescontados: number
  imssObrero: number
  isrRetenido: number
  totalNeto: number
}

interface RequestBody {
  nominaId: string
  numeroNomina: number
  fechaInicio: string
  fechaFin: string
  proyectoNombre: string
  empresaNombre: string
  trabajadores: ReciboEmailData[]
}

// Escape any string that lands inside the receipt HTML. Identity fields are now
// read from the DB, but escaping is cheap defense-in-depth against stored values
// that may contain markup (e.g. a worker name typed with angle brackets).
function escapeHtml(s: string): string {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function buildReciboHtml(r: ReciboEmailData, meta: Pick<RequestBody, 'numeroNomina' | 'fechaInicio' | 'fechaFin' | 'proyectoNombre' | 'empresaNombre'>): string {
  const deduccionesRows = [
    r.anticiposDescontados > 0 ? `<tr><td>Anticipos</td><td style="text-align:right;color:#c0392b">-${formatMXN(r.anticiposDescontados)}</td></tr>` : '',
    r.conceptosDescuento > 0 ? `<tr><td>Descuentos adicionales</td><td style="text-align:right;color:#c0392b">-${formatMXN(r.conceptosDescuento)}</td></tr>` : '',
    r.imssObrero > 0 ? `<tr><td>Cuota IMSS obrero</td><td style="text-align:right;color:#c0392b">-${formatMXN(r.imssObrero)}</td></tr>` : '',
    r.isrRetenido > 0 ? `<tr><td>ISR retenido (Art. 96)</td><td style="text-align:right;color:#c0392b">-${formatMXN(r.isrRetenido)}</td></tr>` : '',
  ].filter(Boolean).join('')

  return `<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f5f5f0;font-family:Arial,sans-serif">
<table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:32px 16px">
<table width="560" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08)">
  <tr><td style="background:#1e1e1e;padding:20px 28px">
    <table width="100%"><tr>
      <td style="color:#fff;font-size:11px;font-weight:bold;letter-spacing:1px">RECIBO DE NOMINA &nbsp;${padNomina(meta.numeroNomina)}</td>
      <td align="right" style="color:#aaa;font-size:10px">${formatDate(meta.fechaInicio)} &mdash; ${formatDate(meta.fechaFin)}</td>
    </tr></table>
  </td></tr>
  <tr><td style="padding:24px 28px 12px">
    <p style="margin:0 0 4px;font-size:16px;font-weight:bold;color:#1e1e1e">${escapeHtml(r.nombre.toUpperCase())}</p>
    <p style="margin:0;font-size:11px;color:#888">${escapeHtml(meta.proyectoNombre)} &nbsp;&bull;&nbsp; ${escapeHtml(r.modalidad.replace(/_/g,' '))}</p>
  </td></tr>
  <tr><td style="padding:0 28px 16px">
    <p style="margin:0 0 8px;font-size:10px;font-weight:bold;color:#3a4e2e;letter-spacing:1px">PERCEPCIONES</p>
    <table width="100%" style="font-size:13px;color:#333;border-collapse:collapse">
      <tr><td>Salario (${r.diasTrabajados} dias${r.diasFestivos > 0 ? ` + ${r.diasFestivos} festivos` : ''})</td><td align="right">${formatMXN(r.subtotalBase)}</td></tr>
      ${r.horasExtra > 0 ? `<tr><td>Horas extra (${r.horasExtra}h)</td><td align="right">${formatMXN(r.totalHorasExtra)}</td></tr>` : ''}
      ${r.conceptosSuma > 0 ? `<tr><td>Bonos adicionales</td><td align="right">${formatMXN(r.conceptosSuma)}</td></tr>` : ''}
    </table>
  </td></tr>
  ${deduccionesRows ? `<tr><td style="padding:0 28px 16px">
    <p style="margin:0 0 8px;font-size:10px;font-weight:bold;color:#a04e3e;letter-spacing:1px">DEDUCCIONES</p>
    <table width="100%" style="font-size:13px;color:#333;border-collapse:collapse">${deduccionesRows}</table>
  </td></tr>` : ''}
  <tr><td style="padding:0 28px 24px">
    <table width="100%" style="background:#3a4e2e;border-radius:8px"><tr>
      <td style="padding:14px 20px;color:#fff;font-size:11px;letter-spacing:0.5px">NETO A PAGAR</td>
      <td align="right" style="padding:14px 20px;color:#fff;font-size:18px;font-weight:bold">${formatMXN(r.totalNeto)}</td>
    </tr></table>
  </td></tr>
  <tr><td style="padding:16px 28px 24px;font-size:10px;color:#aaa;border-top:1px solid #f0f0f0">
    Emitido por ${escapeHtml(meta.empresaNombre)} via NomiExtra
  </td></tr>
</table>
</td></tr></table>
</body></html>`
}

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
  if (!rl.allowed) return NextResponse.json({ error: 'Demasiadas solicitudes.' }, { status: 429, headers: { 'Retry-After': String(rl.retryAfter) } })

  const daily = await dailyLimiter.check(`recibos-day:${empresaId}`)
  if (!daily.allowed) {
    reportAnomaly('spend.recibos-email', `Tope diario de envío de recibos alcanzado (empresa ${empresaId})`)
    return NextResponse.json({ error: 'Alcanzaste el límite diario de envíos de recibos. Intenta de nuevo mañana.' }, { status: 429, headers: { 'Retry-After': String(daily.retryAfter) } })
  }

  let body: RequestBody
  try { body = await req.json() } catch { return NextResponse.json({ error: 'JSON invalido' }, { status: 400 }) }

  const { nominaId, trabajadores } = body
  if (!nominaId || !trabajadores?.length) return NextResponse.json({ error: 'Faltan parametros' }, { status: 400 })

  // Identity and metadata are read from the DB scoped to this empresa — never from
  // the client body — so this endpoint can only send a worker's real receipt to
  // that worker's registered address, instead of acting as an open mail relay.
  const { data: nomina } = await supabase.from('periodos_nomina')
    .select('numero_nomina, fecha_inicio, fecha_fin, proyectos(nombre)')
    .eq('id', nominaId).eq('empresa_id', empresaId).single()
  if (!nomina) return NextResponse.json({ error: 'Nomina no encontrada' }, { status: 404 })

  const { data: empresaRow } = await supabase.from('empresas')
    .select('nombre').eq('id', empresaId).single()

  const proyectoRel = Array.isArray(nomina.proyectos) ? nomina.proyectos[0] : nomina.proyectos
  const meta = {
    numeroNomina: nomina.numero_nomina as number,
    fechaInicio: nomina.fecha_inicio as string,
    fechaFin: nomina.fecha_fin as string,
    proyectoNombre: (proyectoRel as { nombre?: string } | null)?.nombre ?? '—',
    empresaNombre: empresaRow?.nombre ?? 'Tu empresa',
  }

  // Resolve the requested workers from the DB, scoped to this empresa. Any id not
  // owned by the empresa is dropped, and the email used is always the registered one.
  const trabIds = [...new Set(trabajadores.map(t => t.trabajadorId).filter(Boolean))]
  const { data: trabRows } = await supabase.from('trabajadores')
    .select('id, nombre, email, modalidad_pago')
    .eq('empresa_id', empresaId)
    .in('id', trabIds)
  const trabById = new Map((trabRows ?? []).map(t => [t.id, t]))

  // Amounts still come from the client (computed by the same engine the user
  // controls); coerce to finite numbers so no string can slip into the HTML.
  const num = (v: unknown) => (typeof v === 'number' && isFinite(v) ? v : 0)

  const enviados: string[] = []
  const fallidos: { nombre: string; error: string }[] = []

  for (const t of trabajadores) {
    const dbTrab = trabById.get(t.trabajadorId)
    if (!dbTrab) {
      fallidos.push({ nombre: String(t.nombre ?? t.trabajadorId), error: 'Trabajador no pertenece a la empresa' })
      continue
    }
    if (!dbTrab.email?.includes('@')) {
      fallidos.push({ nombre: dbTrab.nombre, error: 'Sin email valido' })
      continue
    }
    const recibo: ReciboEmailData = {
      trabajadorId: dbTrab.id,
      nombre: dbTrab.nombre,
      email: dbTrab.email,
      modalidad: dbTrab.modalidad_pago ?? '',
      diasTrabajados: num(t.diasTrabajados),
      diasFestivos: num(t.diasFestivos),
      horasExtra: num(t.horasExtra),
      subtotalBase: num(t.subtotalBase),
      totalHorasExtra: num(t.totalHorasExtra),
      conceptosSuma: num(t.conceptosSuma),
      conceptosDescuento: num(t.conceptosDescuento),
      anticiposDescontados: num(t.anticiposDescontados),
      imssObrero: num(t.imssObrero),
      isrRetenido: num(t.isrRetenido),
      totalNeto: num(t.totalNeto),
    }
    try {
      const html = buildReciboHtml(recibo, meta)
      await sendEmail({
        to: dbTrab.email,
        subject: `Tu recibo de nomina #${padNomina(meta.numeroNomina)} - ${meta.empresaNombre}`,
        html,
      })
      await supabase.from('recibos_enviados').insert({
        empresa_id: empresaId,
        nomina_id: nominaId,
        trabajador_id: dbTrab.id,
        canal: 'email',
      })
      enviados.push(dbTrab.id)
    } catch (err) {
      captureApiError('nomina/enviar-recibos-email', err, { trabajadorId: dbTrab.id })
      fallidos.push({ nombre: dbTrab.nombre, error: 'Error al enviar' })
    }
  }

  return NextResponse.json({ enviados: enviados.length, fallidos })
}
