import { formatMXN, formatDate, padNomina } from '@/lib/utils'
import type { PeriodoNomina, LineaNomina, ConceptoAdicional, Trabajador, Proyecto } from '@/types'
import { ATELIER, atelierPdfHeader, atelierTable, atelierTotales, atelierPdfFooter } from './atelier-theme'

export interface NominaExportData {
  nomina: PeriodoNomina
  proyecto: Proyecto | null
  lineas: LineaNomina[]
  conceptos: ConceptoAdicional[]
  empresaNombre: string
  tots: { manoObra: number; admins: number; concTotal: number; total: number }
}

async function buildDoc(data: NominaExportData) {
  const jsPDF = (await import('jspdf')).default
  const autoTable = (await import('jspdf-autotable')).default
  const { nomina, proyecto, lineas, conceptos, empresaNombre, tots } = data

  const doc = new jsPDF()

  let y = atelierPdfHeader(doc, {
    titulo: 'Nómina',
    subtitulo: padNomina(nomina.numero_nomina),
    empresa: empresaNombre,
    derecha: [
      `Estado: ${nomina.estado}`,
      `${formatDate(nomina.fecha_inicio)} — ${formatDate(nomina.fecha_fin)}`,
    ],
    meta: [
      `Proyecto: ${proyecto?.nombre || '-'}`,
      `Encargado: ${nomina.encargado || '-'}`,
    ],
  })

  // Workers table
  autoTable(doc, atelierTable({
    startY: y,
    head: [['Trabajador', 'Modalidad', 'Días', 'Horas', 'HE', 'Subtotal', 'Total HE', 'Desc.', 'Total']],
    body: lineas.map(l => {
      const t = l.trabajadores as Trabajador
      return [
        t?.nombre || '-',
        (t?.modalidad_pago || '-').replace('_', ' '),
        l.dias_trabajados,
        l.horas_trabajadas,
        l.horas_extra,
        formatMXN(l.subtotal),
        formatMXN(l.total_horas_extra),
        formatMXN(l.descuentos),
        formatMXN(l.total),
      ]
    }),
    columnStyles: {
      5: { halign: 'right' },
      6: { halign: 'right' },
      7: { halign: 'right' },
      8: { halign: 'right', fontStyle: 'bold' },
    },
  }))

  const docWithTable = doc as typeof doc & { lastAutoTable: { finalY: number } }
  y = docWithTable.lastAutoTable.finalY + 9

  // Conceptos adicionales
  if (conceptos.length > 0) {
    doc.setFont('times', 'bold')
    doc.setFontSize(10)
    doc.setTextColor(...ATELIER.bosque600)
    doc.text('Conceptos adicionales', 14, y)
    y += 3

    autoTable(doc, atelierTable({
      startY: y,
      head: [['Concepto', 'Tipo', 'Monto']],
      body: conceptos.map(c => [
        c.nombre,
        c.tipo === 'suma' ? '+ Suma' : '- Descuento',
        `${c.tipo === 'suma' ? '+' : '-'}${formatMXN(c.monto)}`,
      ]),
      columnStyles: { 2: { halign: 'right' } },
    }))
    y = docWithTable.lastAutoTable.finalY + 9
  }

  // Totals
  y = atelierTotales(doc, y, [
    ['Mano de obra', formatMXN(tots.manoObra)],
    ['Administrativos', formatMXN(tots.admins)],
    ['Conceptos', `${tots.concTotal >= 0 ? '+' : ''}${formatMXN(tots.concTotal)}`],
  ], ['TOTAL NÓMINA', formatMXN(tots.total)])

  // Actividades
  if (nomina.observaciones_actividades) {
    y += 6
    doc.setFont('times', 'bold')
    doc.setFontSize(9)
    doc.setTextColor(...ATELIER.bosque600)
    doc.text('Actividades realizadas', 14, y)
    y += 5
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8)
    doc.setTextColor(...ATELIER.tinta)
    const lines = doc.splitTextToSize(nomina.observaciones_actividades, 180)
    doc.text(lines, 14, y)
  }

  atelierPdfFooter(doc)
  return doc
}

export async function descargarNominaPDF(data: NominaExportData): Promise<void> {
  const doc = await buildDoc(data)
  doc.save(`nomina-${padNomina(data.nomina.numero_nomina)}.pdf`)
}

export async function getNominaPDFBytes(data: NominaExportData): Promise<Uint8Array> {
  const doc = await buildDoc(data)
  return new Uint8Array(doc.output('arraybuffer') as ArrayBuffer)
}
