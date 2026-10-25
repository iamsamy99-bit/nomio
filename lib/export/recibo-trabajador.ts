import { formatMXN, formatDate, padNomina } from '@/lib/utils'
import { normalizeWhatsAppPhone } from '@/lib/crm/share-cotizacion'

export interface ReciboTrabajadorInput {
  // nomina
  numeroNomina: number
  fechaInicio: string
  fechaFin: string
  proyectoNombre: string
  empresaNombre: string
  // trabajador
  trabajadorNombre: string
  nss?: string
  modalidad: string
  diasTrabajados: number
  diasFestivos: number
  horasTrabajadas: number
  horasExtra: number
  subtotalBase: number
  totalHorasExtra: number
  anticiposDescontados: number
  conceptosSuma: number
  conceptosDescuento: number
  imssObrero?: number
  isrRetenido?: number
  totalNeto: number
}

export function buildReciboText(r: ReciboTrabajadorInput): string {
  const periodo = `${formatDate(r.fechaInicio)} — ${formatDate(r.fechaFin)}`
  const modalidadLabel = r.modalidad.replace(/_/g, ' ')

  const lines: string[] = [
    `*Recibo de Nómina* — ${padNomina(r.numeroNomina)}`,
    `📋 Período: ${periodo}`,
    `🏗️ Proyecto: ${r.proyectoNombre}`,
    ``,
    `👷 *${r.trabajadorNombre.toUpperCase()}*`,
  ]

  if (r.nss) lines.push(`NSS: ${'*'.repeat(Math.max(0, r.nss.length - 4))}${r.nss.slice(-4)}`)
  lines.push(`Modalidad: ${modalidadLabel}`)
  lines.push(`Días trabajados: ${r.diasTrabajados}${r.diasFestivos > 0 ? ` (+ ${r.diasFestivos} festivos pagados)` : ''}`)

  if (r.horasTrabajadas > 0) lines.push(`Horas trabajadas: ${r.horasTrabajadas}`)
  if (r.horasExtra > 0) lines.push(`Horas extra: ${r.horasExtra} → ${formatMXN(r.totalHorasExtra)}`)

  lines.push(`Subtotal: ${formatMXN(r.subtotalBase)}`)

  if (r.anticiposDescontados > 0) lines.push(`Anticipos descontados: -${formatMXN(r.anticiposDescontados)}`)
  if (r.conceptosSuma > 0) lines.push(`Bonos adicionales: +${formatMXN(r.conceptosSuma)}`)
  if (r.conceptosDescuento > 0) lines.push(`Descuentos adicionales: -${formatMXN(r.conceptosDescuento)}`)
  if ((r.imssObrero ?? 0) > 0) lines.push(`Cuota IMSS obrero: -${formatMXN(r.imssObrero!)}`)
  if ((r.isrRetenido ?? 0) > 0) lines.push(`ISR retenido: -${formatMXN(r.isrRetenido!)}`)

  lines.push(``)
  lines.push(`💰 *Total a pagar: ${formatMXN(r.totalNeto)}*`)
  lines.push(``)
  lines.push(`_Emitido por ${r.empresaNombre} | Nomiextra_`)

  return lines.join('\n')
}

/** Opens WhatsApp with the receipt text. Returns error string or null. */
export function enviarReciboWhatsApp(telefono: string, text: string): string | null {
  const phone = normalizeWhatsAppPhone(telefono)
  if (!phone) return 'Teléfono inválido (mínimo 10 dígitos).'
  window.open(`https://wa.me/${phone}?text=${encodeURIComponent(text)}`, '_blank')
  return null
}
