import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { formatMXN, formatDate, padNomina } from '@/lib/utils'
import type { ReciboTrabajadorInput } from './recibo-trabajador'
import { ATELIER, atelierPdfHeader, atelierPdfFooter } from './atelier-theme'

export function generarReciboPDF(r: ReciboTrabajadorInput): Blob {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const W = doc.internal.pageSize.getWidth()
  const gris = ATELIER.tinta500
  const verde = ATELIER.bosque
  const tinta = ATELIER.tinta

  atelierPdfHeader(doc, {
    titulo: 'Recibo de nómina',
    subtitulo: `No. ${padNomina(r.numeroNomina)}`,
    empresa: r.empresaNombre,
    derecha: [`${formatDate(r.fechaInicio)} - ${formatDate(r.fechaFin)}`],
  })

  // Worker section
  doc.setTextColor(...tinta)
  doc.setFontSize(14)
  doc.setFont('helvetica', 'bold')
  doc.text(r.trabajadorNombre.toUpperCase(), 14, 30)

  doc.setFontSize(8)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(...gris)
  const meta: string[] = [
    `Modalidad: ${r.modalidad.replace(/_/g, ' ')}`,
    r.nss ? `NSS: ${'*'.repeat(Math.max(0, r.nss.length - 4))}${r.nss.slice(-4)}` : '',
    `Proyecto: ${r.proyectoNombre}`,
  ].filter(Boolean)
  doc.text(meta.join('   |   '), 14, 36)

  // Divider
  doc.setDrawColor(220, 220, 220)
  doc.line(14, 40, W - 14, 40)

  // Percepciones table
  doc.setFontSize(9)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...verde)
  doc.text('PERCEPCIONES', 14, 47)

  const percepciones: [string, string][] = [
    [`Salario (${r.diasTrabajados} dias${r.diasFestivos > 0 ? ` + ${r.diasFestivos} festivos` : ''})`, formatMXN(r.subtotalBase)],
  ]
  if (r.horasExtra > 0) percepciones.push([`Horas extra (${r.horasExtra}h)`, formatMXN(r.totalHorasExtra)])
  if (r.conceptosSuma > 0) percepciones.push(['Bonos adicionales', formatMXN(r.conceptosSuma)])

  autoTable(doc, {
    startY: 50,
    head: [],
    body: percepciones,
    theme: 'plain',
    styles: { fontSize: 8, textColor: tinta, cellPadding: { top: 2, bottom: 2, left: 2, right: 2 } },
    columnStyles: { 0: { cellWidth: 130 }, 1: { cellWidth: 40, halign: 'right' } },
    margin: { left: 14, right: 14 },
  })

  const afterPerc = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 6

  // Deducciones table
  const deducciones: [string, string][] = []
  if (r.anticiposDescontados > 0) deducciones.push(['Anticipos', formatMXN(r.anticiposDescontados)])
  if (r.conceptosDescuento > 0) deducciones.push(['Descuentos adicionales', formatMXN(r.conceptosDescuento)])
  if ((r.imssObrero ?? 0) > 0) deducciones.push(['Cuota IMSS obrero', formatMXN(r.imssObrero!)])
  if ((r.isrRetenido ?? 0) > 0) deducciones.push(['ISR retenido (Art. 96)', formatMXN(r.isrRetenido!)])

  if (deducciones.length > 0) {
    doc.setFontSize(9)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(160, 78, 62)
    doc.text('DEDUCCIONES', 14, afterPerc)

    autoTable(doc, {
      startY: afterPerc + 3,
      head: [],
      body: deducciones,
      theme: 'plain',
      styles: { fontSize: 8, textColor: tinta, cellPadding: { top: 2, bottom: 2, left: 2, right: 2 } },
      columnStyles: { 0: { cellWidth: 130 }, 1: { cellWidth: 40, halign: 'right' } },
      margin: { left: 14, right: 14 },
    })
  }

  const afterDed = deducciones.length > 0
    ? (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 8
    : afterPerc + 8

  // Net total box
  doc.setFillColor(...verde)
  doc.roundedRect(14, afterDed, W - 28, 18, 3, 3, 'F')
  doc.setTextColor(255, 255, 255)
  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  doc.text('NETO A PAGAR', 22, afterDed + 7)
  doc.setFontSize(14)
  doc.setFont('helvetica', 'bold')
  doc.text(formatMXN(r.totalNeto), W - 22, afterDed + 11, { align: 'right' })

  // Signature line
  const sigY = afterDed + 36
  doc.setDrawColor(180, 180, 180)
  doc.line(14, sigY, 80, sigY)
  doc.setFontSize(7)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(...gris)
  doc.text('Firma del trabajador', 14, sigY + 4)

  atelierPdfFooter(doc)

  return doc.output('blob')
}

export function nombreArchivoRecibo(nombreTrabajador: string, numeroNomina: number): string {
  const slug = nombreTrabajador.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
  return `recibo-${padNomina(numeroNomina)}-${slug}.pdf`
}
