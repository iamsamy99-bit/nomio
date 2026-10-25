import { formatMXN } from '@/lib/utils'

export type CotizacionShareInput = {
  id: string
  titulo: string
  numero_cotizacion: number
  total: number
  moneda?: string
  cliente_nombre: string
  estado?: string
}

/** Telefono Mexico para wa.me (solo digitos, con lada 52 si falta). */
export function normalizeWhatsAppPhone(telefono: string): string | null {
  const digits = telefono.replace(/\D/g, '')
  if (digits.length < 10) return null
  if (digits.length === 10) return `52${digits}`
  if (digits.startsWith('52') && digits.length >= 12) return digits
  return digits
}

export function buildCotizacionShareText(
  cot: CotizacionShareInput,
  empresaNombre: string,
  appBaseUrl: string,
): string {
  const num = String(cot.numero_cotizacion).padStart(4, '0')
  const link = `${appBaseUrl.replace(/\/$/, '')}/dashboard/cotizaciones/${cot.id}`
  const lines = [
    `*Cotizacion #COT-${num}* — ${empresaNombre}`,
    cot.titulo,
    `Para: ${cot.cliente_nombre}`,
    `Total: ${formatMXN(cot.total)} ${cot.moneda || 'MXN'}`,
    ``,
    `Ver detalle y exportar PDF:`,
    link,
  ]
  return lines.join('\n')
}

export function openWhatsAppShare(telefono: string, text: string): string | null {
  const phone = normalizeWhatsAppPhone(telefono)
  if (!phone) return 'Telefono invalido para WhatsApp (minimo 10 digitos).'
  window.open(`https://wa.me/${phone}?text=${encodeURIComponent(text)}`, '_blank')
  return null
}

export function openEmailShare(email: string, subject: string, body: string): void {
  window.location.href = `mailto:${encodeURIComponent(email)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
}

export function cotizacionEmailSubject(cot: CotizacionShareInput, empresaNombre: string): string {
  const num = String(cot.numero_cotizacion).padStart(4, '0')
  return `Cotizacion #COT-${num} — ${empresaNombre}`
}
