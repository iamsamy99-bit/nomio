import type { AnomalyResult } from '@/types/wizard'
import type { EngineResult } from '@/lib/payroll/engine'

interface AnomalyInput {
  engineResult: EngineResult
  horasExtra: Record<string, { horas: number }>
  previousTotal: number | null
  trabajadores: { id: string; nombre: string }[]
}

export function detectAnomalies({
  engineResult,
  horasExtra,
  previousTotal,
  trabajadores,
}: AnomalyInput): AnomalyResult[] {
  const anomalies: AnomalyResult[] = []

  for (const line of engineResult.lines) {
    const nombre = trabajadores.find(t => t.id === line.trabajador_id)?.nombre ?? line.trabajador_nombre

    if (line.dias_trabajados === 0) {
      anomalies.push({
        level: 'warning',
        code: 'ZERO_ATTENDANCE',
        message: `${nombre} no tiene días trabajados registrados.`,
        trabajadorId: line.trabajador_id,
        trabajadorNombre: nombre,
      })
    }

    if (line.tarifa_aplicada === 0) {
      anomalies.push({
        level: 'error',
        code: 'ZERO_TARIFA',
        message: `${nombre} tiene tarifa $0. Verifica su configuración.`,
        trabajadorId: line.trabajador_id,
        trabajadorNombre: nombre,
      })
    }

    const extra = horasExtra[line.trabajador_id]
    const totalOvertime = extra?.horas ?? 0
    if (totalOvertime > 18) {
      anomalies.push({
        level: 'error',
        code: 'OVERTIME_EXCEEDED',
        message: `${nombre} tiene ${totalOvertime}h de horas extra (máximo recomendado: 18h).`,
        trabajadorId: line.trabajador_id,
        trabajadorNombre: nombre,
      })
    }
  }

  if (previousTotal !== null && previousTotal > 0) {
    const increase = (engineResult.total_nomina - previousTotal) / previousTotal
    if (increase > 0.3) {
      anomalies.push({
        level: 'warning',
        code: 'LARGE_INCREASE',
        message: `El total de esta nómina (${(increase * 100).toFixed(0)}% mayor) supera por más del 30% el período anterior.`,
      })
    }
  }

  return anomalies
}
