import { formatDate, padNomina } from '@/lib/utils'
import type { NominaExportData } from './nomina-pdf'
import type { Trabajador } from '@/types'
import { aplicarEstiloFila, xlsxTitleStyle, xlsxHeaderStyle, xlsxTotalStyle } from './atelier-theme'

export async function descargarNominaXLSX(data: NominaExportData): Promise<void> {
  const XLSX = await import('xlsx-js-style')
  const { nomina, proyecto, lineas, conceptos, empresaNombre, tots } = data

  const wb = XLSX.utils.book_new()

  // --- Sheet 1: Trabajadores ---
  const trabajadoresRows: (string | number)[][] = [
    [`NÓMINA ${padNomina(nomina.numero_nomina)} — ${empresaNombre}`],
    [`Proyecto: ${proyecto?.nombre || '-'}`],
    [`Período: ${formatDate(nomina.fecha_inicio)} — ${formatDate(nomina.fecha_fin)}`],
    [`Encargado: ${nomina.encargado}`],
    [`Estado: ${nomina.estado}`],
    [`Generado: ${new Date().toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' })}`],
    [],
    ['Trabajador', 'Modalidad', 'Días trabajados', 'Horas trabajadas', 'H. Extra', 'Subtotal', 'Total H. Extra', 'Descuentos', 'Total'],
  ]

  for (const l of lineas) {
    const t = l.trabajadores as Trabajador
    trabajadoresRows.push([
      t?.nombre || '-',
      (t?.modalidad_pago || '-').replace('_', ' '),
      l.dias_trabajados,
      l.horas_trabajadas,
      l.horas_extra,
      l.subtotal,
      l.total_horas_extra,
      l.descuentos,
      l.total,
    ])
  }

  trabajadoresRows.push([])
  trabajadoresRows.push(['', '', '', '', '', '', '', 'Mano de obra', tots.manoObra])
  trabajadoresRows.push(['', '', '', '', '', '', '', 'Administrativos', tots.admins])
  trabajadoresRows.push(['', '', '', '', '', '', '', 'Conceptos', tots.concTotal])
  trabajadoresRows.push(['', '', '', '', '', '', '', 'TOTAL NÓMINA', tots.total])

  const wsTrab = XLSX.utils.aoa_to_sheet(trabajadoresRows)

  // Column widths
  wsTrab['!cols'] = [
    { wch: 30 }, { wch: 14 }, { wch: 16 }, { wch: 16 },
    { wch: 10 }, { wch: 14 }, { wch: 14 }, { wch: 14 }, { wch: 14 },
  ]

  // Estilos Atelier: título, fila de encabezados (índice 7) y 4 filas de totales.
  const NCOLS = 9
  aplicarEstiloFila(wsTrab, 0, 1, xlsxTitleStyle)
  aplicarEstiloFila(wsTrab, 7, NCOLS, xlsxHeaderStyle)
  for (let r = trabajadoresRows.length - 4; r < trabajadoresRows.length; r++) {
    aplicarEstiloFila(wsTrab, r, NCOLS, xlsxTotalStyle)
  }

  XLSX.utils.book_append_sheet(wb, wsTrab, 'Trabajadores')

  // --- Sheet 2: Conceptos adicionales ---
  if (conceptos.length > 0) {
    const concRows: (string | number)[][] = [
      ['Concepto', 'Tipo', 'Aplica a', 'Monto'],
      ...conceptos.map(c => [
        c.nombre,
        c.tipo === 'suma' ? 'Suma' : 'Descuento',
        c.aplica_a === 'nomina_total' ? 'Total nómina' : 'Trabajador',
        c.tipo === 'suma' ? c.monto : -c.monto,
      ]),
    ]
    const wsConc = XLSX.utils.aoa_to_sheet(concRows)
    wsConc['!cols'] = [{ wch: 28 }, { wch: 12 }, { wch: 16 }, { wch: 14 }]
    aplicarEstiloFila(wsConc, 0, 4, xlsxHeaderStyle)
    XLSX.utils.book_append_sheet(wb, wsConc, 'Conceptos')
  }

  const fileName = `nomina-${padNomina(nomina.numero_nomina)}.xlsx`
  XLSX.writeFile(wb, fileName)
}
