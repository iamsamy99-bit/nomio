import { formatDate, padNomina } from '@/lib/utils'
import type { NominaExportData } from './nomina-pdf'
import type { Trabajador } from '@/types'

function esc(val: string | number): string {
  const s = String(val)
  if (s.includes(',') || s.includes('"') || s.includes('\n')) {
    return `"${s.replace(/"/g, '""')}"`
  }
  return s
}

function row(cells: (string | number)[]): string {
  return cells.map(esc).join(',')
}

export function descargarNominaCSV(data: NominaExportData): void {
  const { nomina, proyecto, lineas, conceptos, empresaNombre, tots } = data

  const lines: string[] = []

  lines.push(row([`NOMINA ${padNomina(nomina.numero_nomina)}`, empresaNombre]))
  lines.push(row(['Proyecto', proyecto?.nombre || '-']))
  lines.push(row(['Periodo', `${formatDate(nomina.fecha_inicio)} - ${formatDate(nomina.fecha_fin)}`]))
  lines.push(row(['Encargado', nomina.encargado]))
  lines.push(row(['Estado', nomina.estado]))
  lines.push(row(['Generado', new Date().toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' })]))
  lines.push('')
  lines.push(row(['Trabajador', 'Modalidad', 'Dias trabajados', 'Horas trabajadas', 'H. Extra', 'Subtotal', 'Total H. Extra', 'Descuentos', 'Total']))

  for (const l of lineas) {
    const t = l.trabajadores as Trabajador
    lines.push(row([
      t?.nombre || '-',
      (t?.modalidad_pago || '-').replace('_', ' '),
      l.dias_trabajados,
      l.horas_trabajadas,
      l.horas_extra,
      l.subtotal,
      l.total_horas_extra,
      l.descuentos,
      l.total,
    ]))
  }

  if (conceptos.length > 0) {
    lines.push('')
    lines.push(row(['CONCEPTOS ADICIONALES']))
    lines.push(row(['Concepto', 'Tipo', 'Aplica a', 'Monto']))
    for (const c of conceptos) {
      lines.push(row([
        c.nombre,
        c.tipo === 'suma' ? 'Suma' : 'Descuento',
        c.aplica_a === 'nomina_total' ? 'Total nomina' : 'Trabajador',
        c.tipo === 'suma' ? c.monto : -c.monto,
      ]))
    }
  }

  lines.push('')
  lines.push(row(['Mano de obra', tots.manoObra]))
  lines.push(row(['Administrativos', tots.admins]))
  lines.push(row(['Conceptos', tots.concTotal]))
  lines.push(row(['TOTAL NOMINA', tots.total]))

  const csv = lines.join('\r\n')
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `nomina-${padNomina(nomina.numero_nomina)}.csv`
  a.click()
  URL.revokeObjectURL(url)
}
