import type { TipoContacto } from '@/types'

export const TIPOS_CONTACTO: { value: TipoContacto; label: string; desc: string }[] = [
  { value: 'cliente', label: 'Cliente', desc: 'Quien recibe cotizaciones y obras' },
  { value: 'proveedor', label: 'Proveedor', desc: 'Materiales, ferreteria, insumos' },
  { value: 'subcontratista', label: 'Subcontratista', desc: 'Oficios o paquetes de obra' },
  { value: 'arquitecto', label: 'Arquitecto / diseno', desc: 'Despacho, proyecto, supervision' },
  { value: 'otro', label: 'Otro', desc: 'Contacto general de obra' },
]

export function tipoContactoLabel(tipo: TipoContacto | string | undefined): string {
  return TIPOS_CONTACTO.find((t) => t.value === tipo)?.label ?? 'Contacto'
}

export function normalizeTipoContacto(raw: string): TipoContacto {
  const v = raw.toLowerCase().trim()
  if (v.includes('prov')) return 'proveedor'
  if (v.includes('sub') || v.includes('contrat')) return 'subcontratista'
  if (v.includes('arquitect') || v.includes('disen')) return 'arquitecto'
  if (v.includes('client')) return 'cliente'
  if (TIPOS_CONTACTO.some((t) => t.value === v)) return v as TipoContacto
  return 'otro'
}

export function tipoBadgeClass(tipo: TipoContacto | string): string {
  switch (tipo) {
    case 'cliente':        return 'bg-[var(--bosque-50)] text-[var(--bosque-600)] border-[rgba(42,58,34,0.20)]'
    case 'proveedor':      return 'bg-[var(--petroleo-50)] text-[var(--petroleo-500)] border-[rgba(45,70,81,0.25)]'
    case 'subcontratista': return 'bg-[var(--cuero-100)] text-[var(--tinta-500)] border-[rgba(107,95,82,0.20)]'
    case 'arquitecto':     return 'bg-[rgba(217,164,65,0.12)] text-[var(--tinta-700)] border-[rgba(217,164,65,0.30)]'
    default:               return 'bg-[var(--surface-3)] text-[var(--tinta-500)] border-[rgba(26,23,20,0.12)]'
  }
}
