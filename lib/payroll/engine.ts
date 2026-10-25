/**
 * Payroll calculation engine.
 *
 * Reads registros_asistencia linked to a periodo_nomina, computes per-worker
 * totals, and upserts the results into nomina_lineas_calculadas.
 *
 * Idempotent: safe to call multiple times for the same period. Each call
 * overwrites the previous calculated lines and marks them as clean.
 */
import type { SupabaseClient } from '@supabase/supabase-js'
import { getDiasFestivosEnRango } from '@/lib/dias-festivos'
import { calcularIMSSObrero, calcularISRPeriodo } from '@/lib/payroll/imss-isr'
import { HORAS_JORNADA } from '@/lib/constants'

export interface CalculatedLine {
  trabajador_id: string
  trabajador_nombre: string
  modalidad_aplicada: string
  dias_trabajados: number
  dias_festivos: number
  horas_trabajadas: number
  horas_extra: number
  tarifa_aplicada: number
  subtotal_base: number
  total_horas_extra: number
  anticipos_descontados: number
  conceptos_suma: number
  conceptos_descuento: number
  imss_obrero: number
  isr_retenido: number
  total_neto: number
}

export interface EngineResult {
  lines: CalculatedLine[]
  subtotal_mano_obra: number
  subtotal_administrativos: number
  subtotal_conceptos: number
  total_nomina: number
  anticipos_marcados: string[]
}

export async function calcularNomina(
  supabase: SupabaseClient,
  empresaId: string,
  periodoNominaId: string
): Promise<{ data: EngineResult | null; error: string | null }> {
  // 1. Fetch the period to get date range and project
  const { data: periodo, error: periodoErr } = await supabase
    .from('periodos_nomina')
    .select('id, empresa_id, proyecto_id, fecha_inicio, fecha_fin')
    .eq('id', periodoNominaId)
    .eq('empresa_id', empresaId)
    .single()

  if (periodoErr || !periodo) {
    return { data: null, error: periodoErr?.message ?? 'Periodo no encontrado' }
  }

  const { fecha_inicio, fecha_fin } = periodo

  // 2. Empresa settings
  const { data: empresa } = await supabase
    .from('empresas')
    .select('pagar_dias_festivos, aplica_imss, aplica_isr')
    .eq('id', empresaId)
    .single()
  const pagarFestivos = empresa?.pagar_dias_festivos ?? false
  const aplicaIMSS = empresa?.aplica_imss ?? false
  const aplicaISR = empresa?.aplica_isr ?? false

  // 3. Link any unlinked attendance records in this project/date range to this period.
  // Records saved from the asistencias page arrive with periodo_nomina_id = null.
  await supabase
    .from('registros_asistencia')
    .update({ periodo_nomina_id: periodoNominaId })
    .eq('empresa_id', empresaId)
    .eq('proyecto_id', periodo.proyecto_id)
    .gte('fecha', fecha_inicio)
    .lte('fecha', fecha_fin)
    .is('periodo_nomina_id', null)

  // 4. Fetch ALL attendance for this project/date range (not just linked ones).
  // Reading by range instead of periodo_nomina_id handles records that were
  // previously claimed by another period (e.g., an earlier from-asistencias run).
  const { data: asistencias, error: asistErr } = await supabase
    .from('registros_asistencia')
    .select('trabajador_id, fecha, asistio, horas_calculadas')
    .eq('empresa_id', empresaId)
    .eq('proyecto_id', periodo.proyecto_id)
    .gte('fecha', fecha_inicio)
    .lte('fecha', fecha_fin)

  if (asistErr) return { data: null, error: asistErr.message }
  if (!asistencias?.length) {
    return { data: null, error: 'No hay asistencias en este período. Registra asistencias en la página de Asistencias primero.' }
  }

  // 4. Collect unique worker IDs from the attendance records
  const workerIds = [...new Set(asistencias.map(a => a.trabajador_id))]

  // 5. Fetch worker data
  const { data: trabajadores, error: trabErr } = await supabase
    .from('trabajadores')
    .select('id, nombre, modalidad_pago, tarifa_dia, tarifa_hora, sueldo_fijo, tarifa_hora_extra, es_administrativo, sbc_diario')
    .eq('empresa_id', empresaId)
    .in('id', workerIds)

  if (trabErr) return { data: null, error: trabErr.message }

  const trabMap = new Map((trabajadores ?? []).map(t => [t.id, t]))

  // 6. Advances to deduct: approved ones, plus the ones THIS period already
  // discounted in a previous recalc (descontado_en_nomina_id = this period).
  // Without the second condition a re-run would drop the deduction and
  // silently inflate the total.
  const { data: anticiposRaw } = await supabase
    .from('anticipos')
    .select('id, trabajador_id, monto, estado, descontado_en_nomina_id')
    .eq('empresa_id', empresaId)
    .in('estado', ['aprobado', 'descontado'])
    .in('trabajador_id', workerIds)
  const anticipos = (anticiposRaw ?? []).filter(
    a => a.estado === 'aprobado' || a.descontado_en_nomina_id === periodoNominaId
  )

  // 6b. Overtime hours entered in Step 3 (stored in lineas_nomina.horas_extra)
  const { data: lineasNomina } = await supabase
    .from('lineas_nomina')
    .select('trabajador_id, horas_extra')
    .eq('nomina_id', periodoNominaId)
    .eq('empresa_id', empresaId)
  const horasExtraMap = new Map<string, number>(
    (lineasNomina ?? []).map(l => [l.trabajador_id, Number(l.horas_extra ?? 0)])
  )

  // 7. Per-worker additional concepts
  const { data: conceptos } = await supabase
    .from('conceptos_adicionales')
    .select('trabajador_id, tipo, monto, aplica_a')
    .eq('nomina_id', periodoNominaId)
    .eq('empresa_id', empresaId)

  // 8. Holiday bonus calculation
  const festivos = pagarFestivos ? getDiasFestivosEnRango(fecha_inicio, fecha_fin) : []
  const festivosSet = new Set(festivos)

  // 9. Aggregate attendance per worker
  // dias = días presentes reales (días cotizados para IMSS y festivos).
  // diasEfectivos = jornadas equivalentes según horas: un día de 4h sobre una
  // jornada de 8h cuenta 0.5. Se usa para prorratear el pago por día/mixto.
  type WorkerAgg = { dias: number; diasEfectivos: number; horasTrabajadas: number; fechasTrabajadas: Set<string> }
  const agg = new Map<string, WorkerAgg>()

  for (const reg of asistencias) {
    if (!reg.asistio) continue
    let entry = agg.get(reg.trabajador_id)
    if (!entry) {
      entry = { dias: 0, diasEfectivos: 0, horasTrabajadas: 0, fechasTrabajadas: new Set() }
      agg.set(reg.trabajador_id, entry)
    }
    const h = Number(reg.horas_calculadas ?? 0)
    entry.dias++
    // Si hay horas registradas, prorratea (cap a 1 jornada; el excedente va por
    // horas extra). Si no hay horas pero está presente, cuenta jornada completa.
    entry.diasEfectivos += h > 0 ? Math.min(h / HORAS_JORNADA, 1) : 1
    entry.horasTrabajadas += h
    entry.fechasTrabajadas.add(reg.fecha)
  }

  // Period length in calendar days (for sueldo_fijo proration)
  const dtMs = new Date(fecha_fin).getTime() - new Date(fecha_inicio).getTime()
  const dtDias = Math.ceil(dtMs / 86_400_000) + 1

  // 10. Compute per-worker totals
  const lines: CalculatedLine[] = []
  const anticiposMarcados: string[] = []
  let subtotalManoObra = 0
  let subtotalAdmin = 0

  // nomina-level concepts (aplica_a = 'nomina_total')
  const nominaConceptosSuma = (conceptos ?? [])
    .filter(c => c.aplica_a === 'nomina_total' && c.tipo === 'suma')
    .reduce((s, c) => s + Number(c.monto), 0)
  const nominaConceptosDescuento = (conceptos ?? [])
    .filter(c => c.aplica_a === 'nomina_total' && c.tipo === 'descuento')
    .reduce((s, c) => s + Number(c.monto), 0)

  for (const [tid, data] of agg) {
    const t = trabMap.get(tid)
    if (!t) continue

    const tarifa = (() => {
      switch (t.modalidad_pago) {
        case 'por_dia': return Number(t.tarifa_dia ?? 0)
        case 'por_hora': return Number(t.tarifa_hora ?? 0)
        case 'sueldo_fijo': return Number(t.sueldo_fijo ?? 0)
        case 'mixto': return Number(t.tarifa_dia ?? 0)
        default: return 0
      }
    })()

    let subtotalBase = 0
    switch (t.modalidad_pago) {
      case 'por_dia':
        // Prorratea por horas: un día de 4h paga medio día.
        subtotalBase = data.diasEfectivos * Number(t.tarifa_dia ?? 0)
        break
      case 'por_hora':
        subtotalBase = data.horasTrabajadas * Number(t.tarifa_hora ?? 0)
        break
      case 'sueldo_fijo':
        // Prorratea por jornadas efectivas: un día de 4h cuenta medio día.
        subtotalBase = dtDias > 0 ? (Number(t.sueldo_fijo ?? 0) / dtDias) * data.diasEfectivos : 0
        break
      case 'mixto':
        // El componente de día se prorratea; el de hora ya es por horas reales.
        subtotalBase =
          data.diasEfectivos * Number(t.tarifa_dia ?? 0) +
          data.horasTrabajadas * Number(t.tarifa_hora ?? 0)
        break
    }

    // Festivo bonus: days in the festivo set that the worker DID NOT work
    let diasFestivos = 0
    if (pagarFestivos && (t.modalidad_pago === 'por_dia' || t.modalidad_pago === 'mixto')) {
      for (const f of festivosSet) {
        if (!data.fechasTrabajadas.has(f)) {
          diasFestivos++
          subtotalBase += Number(t.tarifa_dia ?? 0)
        }
      }
    }

    // Per-worker concepts
    const trabConceptosSuma = (conceptos ?? [])
      .filter(c => c.trabajador_id === tid && c.tipo === 'suma' && c.aplica_a === 'trabajador_individual')
      .reduce((s, c) => s + Number(c.monto), 0)
    const trabConceptosDescuento = (conceptos ?? [])
      .filter(c => c.trabajador_id === tid && c.tipo === 'descuento' && c.aplica_a === 'trabajador_individual')
      .reduce((s, c) => s + Number(c.monto), 0)

    // Approved advances
    const trabAnticipes = (anticipos ?? []).filter(a => a.trabajador_id === tid)
    const anticiposDescontados = trabAnticipes.reduce((s, a) => s + Number(a.monto), 0)
    trabAnticipes.forEach(a => anticiposMarcados.push(a.id))

    // Overtime: hours entered in Step 3, paid at worker's tarifa_hora_extra
    const horasExtra = horasExtraMap.get(tid) ?? 0
    const tarifaHoraExtra = Number(t.tarifa_hora_extra ?? 0)
    const totalHorasExtra = horasExtra * tarifaHoraExtra

    // SBC: usa el campo explícito; si no, deriva de la modalidad para no dejar en 0 a trabajadores sin tarifa_dia
    const sbcDiario = (() => {
      if (t.sbc_diario != null) return Number(t.sbc_diario)
      switch (t.modalidad_pago) {
        case 'por_dia':
        case 'mixto':    return Number(t.tarifa_dia ?? 0)
        case 'sueldo_fijo': return round2(Number(t.sueldo_fijo ?? 0) / 30)
        case 'por_hora': return round2(Number(t.tarifa_hora ?? 0) * 8)
        default:         return 0
      }
    })()

    const imssObrero = aplicaIMSS ? calcularIMSSObrero(sbcDiario, data.dias) : 0
    // Base fiscal del período = ingreso bruto real (base + horas extra + conceptos
    // de suma), no solo sbcDiario*30, para no subestimar el ISR (Art. 96 LISR).
    const ingresoBrutoPeriodo = subtotalBase + totalHorasExtra + trabConceptosSuma
    const isrRetenido = aplicaISR ? calcularISRPeriodo(ingresoBrutoPeriodo, data.dias) : 0

    const totalNeto = Math.max(
      0,
      subtotalBase +
      trabConceptosSuma +
      totalHorasExtra -
      trabConceptosDescuento -
      anticiposDescontados -
      imssObrero -
      isrRetenido
    )

    if (t.es_administrativo) subtotalAdmin += totalNeto
    else subtotalManoObra += totalNeto

    lines.push({
      trabajador_id: tid,
      trabajador_nombre: t.nombre,
      modalidad_aplicada: t.modalidad_pago,
      dias_trabajados: data.dias,
      dias_festivos: diasFestivos,
      horas_trabajadas: data.horasTrabajadas,
      horas_extra: horasExtra,
      tarifa_aplicada: round2(tarifa),
      subtotal_base: round2(subtotalBase),
      total_horas_extra: round2(totalHorasExtra),
      anticipos_descontados: round2(anticiposDescontados),
      conceptos_suma: round2(trabConceptosSuma),
      conceptos_descuento: round2(trabConceptosDescuento),
      imss_obrero: round2(imssObrero),
      isr_retenido: round2(isrRetenido),
      total_neto: round2(totalNeto),
    })
  }

  const subtotalConceptos = round2(nominaConceptosSuma - nominaConceptosDescuento)
  const totalNomina = round2(subtotalManoObra + subtotalAdmin + subtotalConceptos)

  return {
    data: {
      lines,
      subtotal_mano_obra: round2(subtotalManoObra),
      subtotal_administrativos: round2(subtotalAdmin),
      subtotal_conceptos: subtotalConceptos,
      total_nomina: totalNomina,
      anticipos_marcados: anticiposMarcados,
    },
    error: null,
  }
}

/**
 * Calculates and persists nomina_lineas_calculadas for the given period.
 * Updates periodos_nomina totals as well.
 * Marks anticipos as 'descontado' (non-blocking).
 */
export async function recalcularYPersistir(
  supabase: SupabaseClient,
  empresaId: string,
  periodoNominaId: string
): Promise<{ data: EngineResult | null; error: string | null }> {
  const { data: result, error } = await calcularNomina(supabase, empresaId, periodoNominaId)
  if (error || !result) return { data: null, error }

  // Upsert calculated lines
  const rows = result.lines.map(l => ({
    empresa_id: empresaId,
    periodo_nomina_id: periodoNominaId,
    trabajador_id: l.trabajador_id,
    dias_trabajados: l.dias_trabajados,
    dias_festivos: l.dias_festivos,
    horas_trabajadas: l.horas_trabajadas,
    horas_extra: l.horas_extra,
    tarifa_aplicada: l.tarifa_aplicada,
    modalidad_aplicada: l.modalidad_aplicada,
    subtotal_base: l.subtotal_base,
    total_horas_extra: l.total_horas_extra,
    anticipos_descontados: l.anticipos_descontados,
    conceptos_suma: l.conceptos_suma,
    conceptos_descuento: l.conceptos_descuento,
    imss_obrero: l.imss_obrero,
    isr_retenido: l.isr_retenido,
    total_neto: l.total_neto,
    calculo_dirty: false,
    calculado_at: new Date().toISOString(),
  }))

  const { error: upsertErr } = await supabase
    .from('nomina_lineas_calculadas')
    .upsert(rows, { onConflict: 'periodo_nomina_id,trabajador_id' })

  if (upsertErr) return { data: null, error: upsertErr.message }

  // Sync to lineas_nomina to make sure exports, reports, and detail page have all workers
  const lineasRows = result.lines.map(l => ({
    empresa_id: empresaId,
    nomina_id: periodoNominaId,
    trabajador_id: l.trabajador_id,
    dias_trabajados: l.dias_trabajados,
    horas_trabajadas: l.horas_trabajadas,
    horas_extra: l.horas_extra,
    total_horas_extra: l.total_horas_extra,
    subtotal: l.subtotal_base,
    descuentos: l.anticipos_descontados + l.conceptos_descuento + l.imss_obrero + l.isr_retenido,
    imss_obrero: l.imss_obrero,
    isr_retenido: l.isr_retenido,
    total: l.total_neto,
  }))

  const { error: lineasUpsertErr } = await supabase
    .from('lineas_nomina')
    .upsert(lineasRows, { onConflict: 'nomina_id,trabajador_id' })

  if (lineasUpsertErr) {
    console.error('[engine.ts] Error syncing to lineas_nomina:', lineasUpsertErr)
  }

  // Update period totals
  await supabase.from('periodos_nomina').update({
    subtotal_mano_obra: result.subtotal_mano_obra,
    subtotal_administrativos: result.subtotal_administrativos,
    subtotal_conceptos: result.subtotal_conceptos,
    total_nomina: result.total_nomina,
  }).eq('id', periodoNominaId).eq('empresa_id', empresaId)

  // Mark advances as descontado, linked to this period so future recalcs keep
  // deducting them and deleting the period releases them (DB trigger).
  if (result.anticipos_marcados.length) {
    await supabase.from('anticipos')
      .update({ estado: 'descontado', descontado_en_nomina_id: periodoNominaId })
      .in('id', result.anticipos_marcados)
  }

  return { data: result, error: null }
}

function round2(n: number): number {
  return Math.round(n * 100) / 100
}
