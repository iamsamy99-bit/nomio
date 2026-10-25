/**
 * Cálculo de finiquito y liquidación (LFT México). Es una ESTIMACIÓN con
 * supuestos editables; no sustituye el cálculo de un contador.
 *
 * Finiquito (siempre se debe, sea renuncia o término):
 *  - Días trabajados pendientes
 *  - Aguinaldo proporcional
 *  - Vacaciones proporcionales pendientes + prima vacacional
 *
 * Liquidación (solo despido injustificado), además:
 *  - Indemnización constitucional: 90 días (3 meses) de salario diario integrado
 *  - 20 días por año de servicio (SDI)
 *  - Prima de antigüedad: 12 días por año, salario topado a 2x salario mínimo
 *    (en renuncia solo aplica con antigüedad ≥ 15 años)
 */

export type TipoBaja = 'renuncia' | 'despido_injustificado'

export interface FiniquitoInput {
  salarioDiario: number
  fechaIngreso: string        // YYYY-MM-DD
  fechaBaja: string           // YYYY-MM-DD
  tipoBaja: TipoBaja
  diasPendientes: number      // días trabajados no pagados del periodo en curso
  vacacionesTomadas: number   // días de vacaciones ya tomados del año en curso
  aguinaldoDias: number       // mínimo de ley: 15
  primaVacacionalPct: number  // mínimo de ley: 0.25
  salarioMinimo: number       // salario mínimo diario (tope prima de antigüedad)
  sdi?: number                // salario diario integrado (si no, se calcula)
}

export interface FiniquitoLinea {
  concepto: string
  dias?: number
  monto: number
  grupo: 'finiquito' | 'liquidacion'
}

export interface FiniquitoResult {
  antiguedadAnios: number
  antiguedadTexto: string
  diasVacacionesAnuales: number
  sdi: number
  lineas: FiniquitoLinea[]
  totalFiniquito: number
  totalLiquidacion: number
  total: number
}

const MS_DIA = 86_400_000

function dias(desde: string, hasta: string): number {
  const a = new Date(desde + 'T00:00:00Z').getTime()
  const b = new Date(hasta + 'T00:00:00Z').getTime()
  return Math.max(0, Math.round((b - a) / MS_DIA))
}

/** Días de vacaciones anuales por años cumplidos (reforma LFT 2023). */
export function diasVacacionesPorAnio(aniosCumplidos: number): number {
  const a = Math.max(1, Math.floor(aniosCumplidos))
  if (a <= 5) return 10 + a * 2          // año1=12 ... año5=20
  return 20 + Math.ceil((a - 5) / 5) * 2 // 6-10=22, 11-15=24, ...
}

function round2(n: number): number {
  return Math.round(n * 100) / 100
}

export function calcularFiniquito(input: FiniquitoInput): FiniquitoResult {
  const sd = Math.max(0, input.salarioDiario)
  const totalDiasAntig = dias(input.fechaIngreso, input.fechaBaja)
  const anios = totalDiasAntig / 365.25
  const aniosCumplidos = Math.floor(anios)

  // SDI: factor de integración = 1 + aguinaldo/365 + (primaVac% * vacAnuales)/365
  const diasVacAnuales = diasVacacionesPorAnio(aniosCumplidos + 1)
  const factorInt = 1 + input.aguinaldoDias / 365 + (input.primaVacacionalPct * diasVacAnuales) / 365
  const sdi = input.sdi && input.sdi > 0 ? input.sdi : round2(sd * factorInt)

  const lineas: FiniquitoLinea[] = []

  // --- FINIQUITO ---
  // Días pendientes
  if (input.diasPendientes > 0) {
    lineas.push({ concepto: 'Días trabajados pendientes', dias: input.diasPendientes, monto: round2(input.diasPendientes * sd), grupo: 'finiquito' })
  }

  // Aguinaldo proporcional (días del año en curso trabajados / 365)
  const anioBaja = input.fechaBaja.slice(0, 4)
  const inicioAnio = `${anioBaja}-01-01`
  const desdeAguinaldo = input.fechaIngreso > inicioAnio ? input.fechaIngreso : inicioAnio
  const diasAnioTrabajados = dias(desdeAguinaldo, input.fechaBaja)
  const aguinaldoDiasProp = (input.aguinaldoDias * diasAnioTrabajados) / 365
  if (aguinaldoDiasProp > 0) {
    lineas.push({ concepto: 'Aguinaldo proporcional', dias: round2(aguinaldoDiasProp), monto: round2(aguinaldoDiasProp * sd), grupo: 'finiquito' })
  }

  // Vacaciones proporcionales pendientes (desde el último aniversario)
  const fIngreso = new Date(input.fechaIngreso + 'T00:00:00Z')
  const ultimoAniv = new Date(Date.UTC(
    new Date(input.fechaBaja + 'T00:00:00Z').getUTCFullYear(),
    fIngreso.getUTCMonth(),
    fIngreso.getUTCDate(),
  ))
  let ultimoAnivISO = ultimoAniv.toISOString().slice(0, 10)
  if (ultimoAnivISO > input.fechaBaja) {
    ultimoAniv.setUTCFullYear(ultimoAniv.getUTCFullYear() - 1)
    ultimoAnivISO = ultimoAniv.toISOString().slice(0, 10)
  }
  const fraccionAnio = Math.min(1, dias(ultimoAnivISO, input.fechaBaja) / 365)
  const vacDiasProp = Math.max(0, diasVacAnuales * fraccionAnio - input.vacacionesTomadas)
  const vacMonto = round2(vacDiasProp * sd)
  if (vacDiasProp > 0) {
    lineas.push({ concepto: 'Vacaciones pendientes', dias: round2(vacDiasProp), monto: vacMonto, grupo: 'finiquito' })
    lineas.push({ concepto: `Prima vacacional (${Math.round(input.primaVacacionalPct * 100)}%)`, monto: round2(vacMonto * input.primaVacacionalPct), grupo: 'finiquito' })
  }

  // --- LIQUIDACIÓN (despido injustificado) ---
  const esDespido = input.tipoBaja === 'despido_injustificado'
  if (esDespido) {
    lineas.push({ concepto: 'Indemnización constitucional (90 días)', dias: 90, monto: round2(90 * sdi), grupo: 'liquidacion' })
    const dias20 = 20 * anios
    lineas.push({ concepto: '20 días por año de servicio', dias: round2(dias20), monto: round2(dias20 * sdi), grupo: 'liquidacion' })
  }

  // Prima de antigüedad: despido siempre; renuncia solo si ≥15 años
  if (esDespido || aniosCumplidos >= 15) {
    const salarioTope = Math.min(sd, 2 * input.salarioMinimo)
    const diasPrima = 12 * anios
    lineas.push({ concepto: 'Prima de antigüedad (12 días/año, tope 2x mínimo)', dias: round2(diasPrima), monto: round2(diasPrima * salarioTope), grupo: 'liquidacion' })
  }

  const totalFiniquito = round2(lineas.filter(l => l.grupo === 'finiquito').reduce((s, l) => s + l.monto, 0))
  const totalLiquidacion = round2(lineas.filter(l => l.grupo === 'liquidacion').reduce((s, l) => s + l.monto, 0))

  const aniosTxt = aniosCumplidos > 0
    ? `${aniosCumplidos} año${aniosCumplidos === 1 ? '' : 's'}${totalDiasAntig % 365 > 30 ? ` ${Math.floor((totalDiasAntig - aniosCumplidos * 365) / 30)} meses` : ''}`
    : `${Math.floor(totalDiasAntig / 30)} meses`

  return {
    antiguedadAnios: round2(anios),
    antiguedadTexto: aniosTxt,
    diasVacacionesAnuales: diasVacAnuales,
    sdi,
    lineas,
    totalFiniquito,
    totalLiquidacion,
    total: round2(totalFiniquito + totalLiquidacion),
  }
}

/** Salario diario base según la modalidad de pago del trabajador. */
export function salarioDiarioDeModalidad(t: {
  modalidad_pago: string
  tarifa_dia?: number | null
  tarifa_hora?: number | null
  sueldo_fijo?: number | null
}): number {
  switch (t.modalidad_pago) {
    case 'por_dia':
    case 'mixto':       return Number(t.tarifa_dia ?? 0)
    case 'por_hora':    return Number(t.tarifa_hora ?? 0) * 8
    case 'sueldo_fijo': return round2(Number(t.sueldo_fijo ?? 0) / 30)
    default:            return 0
  }
}
