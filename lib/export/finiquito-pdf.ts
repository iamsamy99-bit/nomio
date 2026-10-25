import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { formatMXN, formatDate } from '@/lib/utils'
import { ATELIER, atelierPdfHeader, atelierTable, atelierTotales, atelierPdfFooter } from './atelier-theme'
import type { FiniquitoResult, TipoBaja } from '@/lib/payroll/finiquito'

export interface FiniquitoPdfInput {
  empresaNombre: string
  trabajadorNombre: string
  puesto?: string | null
  fechaIngreso: string
  fechaBaja: string
  tipoBaja: TipoBaja
  result: FiniquitoResult
}

export function descargarFiniquitoPDF(d: FiniquitoPdfInput): void {
  const esDespido = d.tipoBaja === 'despido_injustificado'
  const doc = new jsPDF()

  let y = atelierPdfHeader(doc, {
    titulo: esDespido ? 'Liquidación' : 'Finiquito',
    subtitulo: d.trabajadorNombre,
    empresa: d.empresaNombre,
    derecha: [`Ingreso: ${formatDate(d.fechaIngreso)}`, `Baja: ${formatDate(d.fechaBaja)}`],
    meta: [
      `Trabajador: ${d.trabajadorNombre}${d.puesto ? ` — ${d.puesto}` : ''}`,
      `Antigüedad: ${d.result.antiguedadTexto}  ·  SDI: ${formatMXN(d.result.sdi)}`,
      `Tipo de baja: ${esDespido ? 'Despido injustificado' : 'Renuncia / término de obra'}`,
    ],
  })

  autoTable(doc, atelierTable({
    startY: y,
    head: [['Concepto', 'Días', 'Importe']],
    body: d.result.lineas.map(l => [l.concepto, l.dias != null ? String(l.dias) : '—', formatMXN(l.monto)]),
    columnStyles: { 1: { halign: 'center' }, 2: { halign: 'right' } },
  }))

  y = (doc as typeof doc & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 9

  const filas: [string, string][] = [['Subtotal finiquito', formatMXN(d.result.totalFiniquito)]]
  if (d.result.totalLiquidacion > 0) filas.push(['Subtotal liquidación', formatMXN(d.result.totalLiquidacion)])
  y = atelierTotales(doc, y, filas, ['TOTAL A PAGAR', formatMXN(d.result.total)])

  // Firma
  y += 18
  const W = doc.internal.pageSize.getWidth()
  doc.setDrawColor(...ATELIER.tinta500)
  doc.setLineWidth(0.3)
  doc.line(20, y, 90, y)
  doc.line(W - 90, y, W - 20, y)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  doc.setTextColor(...ATELIER.tinta500)
  doc.text('Firma del trabajador', 22, y + 5)
  doc.text('Por la empresa', W - 88, y + 5)

  // Aviso
  y += 16
  doc.setFontSize(7)
  doc.setTextColor(...ATELIER.tinta500)
  const aviso = doc.splitTextToSize(
    'Documento estimativo generado con Nomio. Las cifras son una aproximación conforme a la LFT y pueden variar; valídalas con tu contador antes de realizar el pago.',
    W - 28,
  )
  doc.text(aviso, 14, y)

  atelierPdfFooter(doc)

  const slug = d.trabajadorNombre.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
  doc.save(`${esDespido ? 'liquidacion' : 'finiquito'}-${slug}.pdf`)
}
