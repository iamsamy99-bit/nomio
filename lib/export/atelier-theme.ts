/**
 * Identidad visual Atelier para todas las exportaciones (PDF y Excel).
 * Centraliza paleta, tipografía y helpers para no duplicar estilos por archivo.
 *
 * - PDF: jsPDF + jspdf-autotable. Se usa la serif integrada ('times') como
 *   sustituto de Fraunces y 'helvetica' para el cuerpo (Inter Tight).
 * - XLSX: objetos de estilo para xlsx-js-style (fill/font/border) + helper
 *   para aplicarlos a una fila. Sin importar XLSX aquí, para no inflar los
 *   bundles que solo generan PDF.
 */
import type jsPDF from 'jspdf'
import type { UserOptions } from 'jspdf-autotable'

type RGB = [number, number, number]

// Paleta Atelier (de app/globals.css)
export const ATELIER: Record<string, RGB> = {
  tinta:     [26, 23, 20],    // #1A1714
  tinta500:  [107, 95, 82],   // #6B5F52
  bosque:    [58, 78, 46],    // #3A4E2E (bosque-500)
  bosque600: [42, 58, 34],    // #2A3A22
  cuero50:   [250, 246, 239], // #FAF6EF
  cuero100:  [242, 235, 221], // #F2EBDD
  cuero200:  [232, 221, 200], // #E8DDC8
  petroleo:  [45, 70, 81],    // #2D4651
  ambar:     [217, 164, 65],  // #D9A441
  rojo:      [160, 78, 62],   // #A04E3E
  blanco:    [255, 255, 255],
}

const FECHA_GEN = () =>
  new Date().toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' })

export interface PdfHeaderOpts {
  titulo: string
  subtitulo?: string
  empresa?: string
  meta?: string[]      // líneas bajo el título (izquierda)
  derecha?: string[]   // líneas en la barra, a la derecha (bajo empresa)
}

/** Dibuja la barra de encabezado Atelier y devuelve la Y donde continuar. */
export function atelierPdfHeader(doc: jsPDF, opts: PdfHeaderOpts): number {
  const W = doc.internal.pageSize.getWidth()

  doc.setFillColor(...ATELIER.tinta)
  doc.rect(0, 0, W, 22, 'F')

  doc.setFont('times', 'bold')
  doc.setFontSize(16)
  doc.setTextColor(...ATELIER.cuero50)
  doc.text(opts.titulo, 14, 11)

  if (opts.subtitulo) {
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(7.5)
    doc.setTextColor(...ATELIER.cuero100)
    doc.text(opts.subtitulo.toUpperCase(), 14, 17)
  }

  if (opts.empresa) {
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(9)
    doc.setTextColor(...ATELIER.cuero50)
    doc.text(opts.empresa.toUpperCase(), W - 14, 10, { align: 'right' })
  }
  if (opts.derecha?.length) {
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(7.5)
    doc.setTextColor(...ATELIER.cuero100)
    opts.derecha.forEach((l, i) => doc.text(l, W - 14, 15 + i * 4, { align: 'right' }))
  }

  let y = 30
  if (opts.meta?.length) {
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8.5)
    doc.setTextColor(...ATELIER.tinta500)
    for (const l of opts.meta) { doc.text(l, 14, y); y += 5 }
    y += 2
  }
  return y
}

/** Opciones base de autoTable con el look Atelier. El consumidor pasa startY/head/body/columnStyles. */
export function atelierTable(opts: UserOptions): UserOptions {
  return {
    headStyles: { fillColor: ATELIER.bosque, textColor: ATELIER.blanco, fontStyle: 'bold', fontSize: 8 },
    bodyStyles: { fontSize: 8, textColor: ATELIER.tinta },
    alternateRowStyles: { fillColor: ATELIER.cuero50 },
    styles: { font: 'helvetica', cellPadding: 2.5, lineColor: ATELIER.cuero200, lineWidth: 0.1 },
    margin: { left: 14, right: 14 },
    ...opts,
  }
}

/** Bloque de totales alineado a la derecha. Devuelve la Y final. */
export function atelierTotales(
  doc: jsPDF,
  y: number,
  filas: [string, string][],
  total: [string, string],
): number {
  const W = doc.internal.pageSize.getWidth()
  const xLabel = W - 95
  const xVal = W - 14

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8.5)
  doc.setTextColor(...ATELIER.tinta500)
  for (const [l, v] of filas) {
    doc.text(l, xLabel, y)
    doc.text(v, xVal, y, { align: 'right' })
    y += 5.5
  }

  doc.setDrawColor(...ATELIER.bosque)
  doc.setLineWidth(0.4)
  doc.line(xLabel, y, xVal, y)
  y += 6

  doc.setFont('times', 'bold')
  doc.setFontSize(11)
  doc.setTextColor(...ATELIER.bosque600)
  doc.text(total[0], xLabel, y)
  doc.text(total[1], xVal, y, { align: 'right' })
  return y + 6
}

/** Pie de página con marca y fecha de generación. */
export function atelierPdfFooter(doc: jsPDF): void {
  const W = doc.internal.pageSize.getWidth()
  const H = doc.internal.pageSize.getHeight()
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(7)
  doc.setTextColor(...ATELIER.tinta500)
  doc.text('Nomio — Gestión de nómina', 14, H - 8)
  doc.text(`Generado ${FECHA_GEN()}`, W - 14, H - 8, { align: 'right' })
}

// ----------------------------------------------------------------------------
// XLSX (xlsx-js-style) — objetos de estilo + helper para aplicarlos a una fila.
// ----------------------------------------------------------------------------

const HEX = {
  tinta: '1A1714', bosque: '3A4E2E', cuero50: 'FAF6EF', cuero100: 'F2EBDD',
  cuero200: 'E8DDC8', blanco: 'FFFFFF',
}
const borde = { style: 'thin', color: { rgb: HEX.cuero200 } }
const bordeCompleto = { top: borde, bottom: borde, left: borde, right: borde }

export const xlsxTitleStyle = {
  font: { bold: true, sz: 14, color: { rgb: HEX.tinta }, name: 'Arial' },
}
export const xlsxMetaStyle = {
  font: { sz: 9, color: { rgb: '6B5F52' }, name: 'Arial' },
}
export const xlsxHeaderStyle = {
  font: { bold: true, sz: 10, color: { rgb: HEX.blanco }, name: 'Arial' },
  fill: { fgColor: { rgb: HEX.bosque } },
  alignment: { horizontal: 'left', vertical: 'center' },
  border: bordeCompleto,
}
export const xlsxTotalStyle = {
  font: { bold: true, sz: 10, color: { rgb: HEX.tinta }, name: 'Arial' },
  fill: { fgColor: { rgb: HEX.cuero100 } },
  border: bordeCompleto,
}

// Dirección de celda A1 a partir de (fila, col) base 0 — evita importar XLSX aquí.
function cellAddr(row0: number, col0: number): string {
  let s = ''
  let c = col0 + 1
  while (c > 0) {
    const m = (c - 1) % 26
    s = String.fromCharCode(65 + m) + s
    c = Math.floor((c - 1) / 26)
  }
  return `${s}${row0 + 1}`
}

type SheetLike = Record<string, { s?: unknown } | unknown>

/** Aplica un estilo a todas las celdas existentes de una fila (base 0). */
export function aplicarEstiloFila(ws: SheetLike, row0: number, ncols: number, style: unknown): void {
  for (let c = 0; c < ncols; c++) {
    const addr = cellAddr(row0, c)
    const cell = (ws as Record<string, { s?: unknown }>)[addr]
    if (cell) cell.s = style
  }
}
