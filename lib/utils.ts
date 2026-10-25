import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatMXN(amount: number): string {
  return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(amount)
}

export function formatDate(dateStr: string): string {
  return new Date(dateStr + 'T12:00:00').toLocaleDateString('es-MX', {
    day: '2-digit', month: 'short', year: 'numeric',
  })
}

/** Fecha en YYYY-MM-DD usando la zona horaria LOCAL del dispositivo.
 * No usar new Date().toISOString(): en Mexico (UTC-6) despues de las 6pm
 * devuelve la fecha de manana. */
export function toISOLocal(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

/** Hoy en YYYY-MM-DD en hora local del dispositivo. */
export function hoyISO(): string {
  return toISOLocal(new Date())
}

export function padNomina(n: number): string {
  return `#NO ${String(n).padStart(3, '0')}`
}

export function sanitizeText(input: string): string {
  return input
    .replace(/[<>"';]/g, '')
    .trim()
    .slice(0, 500)
}

export function calcularSubtotal(
  modalidad: string,
  dias: number,
  horas: number,
  tarifaDia?: number,
  tarifaHora?: number,
  sueldoFijo?: number
): number {
  switch (modalidad) {
    case 'por_dia':   return Math.round((dias * (tarifaDia || 0)) * 100) / 100
    case 'por_hora':  return Math.round((horas * (tarifaHora || 0)) * 100) / 100
    case 'mixto':     return Math.round(((dias * (tarifaDia || 0)) + (horas * (tarifaHora || 0))) * 100) / 100
    case 'sueldo_fijo': return sueldoFijo || 0
    default: return 0
  }
}
