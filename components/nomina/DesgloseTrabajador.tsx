'use client'
import { useState } from 'react'
import { ChevronDown, Info } from 'lucide-react'
import { formatMXN } from '@/lib/utils'

/**
 * Desglose transparente del pago de un trabajador.
 * Comparte forma con CalculatedLine (motor) y con nomina_lineas_calculadas,
 * para usarse tanto en la Revisión del wizard como en la vista de resultado.
 */
export interface DesgloseLinea {
  trabajador_id: string
  trabajador_nombre: string
  modalidad_aplicada: string
  dias_trabajados: number
  dias_festivos: number
  horas_trabajadas: number
  horas_extra: number
  tarifa_aplicada?: number
  subtotal_base: number
  total_horas_extra: number
  anticipos_descontados: number
  conceptos_suma: number
  conceptos_descuento: number
  imss_obrero: number
  isr_retenido: number
  total_neto: number
}

function initials(nombre: string): string {
  const parts = nombre.trim().split(/\s+/)
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase()
  return nombre.slice(0, 2).toUpperCase()
}

function Row({ label, value, hint, tone = 'neutral', strong = false }: {
  label: string
  value: number
  hint?: string
  tone?: 'add' | 'sub' | 'neutral'
  strong?: boolean
}) {
  if (value === 0 && tone !== 'neutral') return null
  const color = tone === 'add' ? 'var(--bosque-600)' : tone === 'sub' ? 'var(--rojo-falta, #c0392b)' : 'var(--tinta)'
  const sign = tone === 'add' ? '+' : tone === 'sub' ? '-' : ''
  return (
    <div className="flex items-center justify-between gap-3 py-1">
      <span className="flex items-center gap-1.5 text-xs" style={{ color: strong ? 'var(--tinta)' : 'var(--tinta-500)' }}>
        {label}
        {hint && (
          <span className="group/hint relative inline-flex">
            <Info className="w-3 h-3 opacity-50 cursor-help" />
            <span className="pointer-events-none absolute left-1/2 -translate-x-1/2 bottom-full mb-1 w-44 rounded-lg px-2 py-1.5 text-[10px] leading-snug opacity-0 group-hover/hint:opacity-100 transition-opacity z-20"
              style={{ background: 'var(--tinta)', color: 'var(--surface)' }}>
              {hint}
            </span>
          </span>
        )}
      </span>
      <span className={`font-mono ${strong ? 'text-sm font-bold' : 'text-xs'}`} style={{ color }}>
        {sign}{formatMXN(Math.abs(value))}
      </span>
    </div>
  )
}

interface Props {
  linea: DesgloseLinea
  /** Acción opcional a la derecha del header (ej. enviar recibo). */
  action?: React.ReactNode
  defaultOpen?: boolean
}

export default function DesgloseTrabajador({ linea: l, action, defaultOpen = false }: Props) {
  const [open, setOpen] = useState(defaultOpen)
  const conceptosNeto = l.conceptos_suma - l.conceptos_descuento

  return (
    <div className="rounded-2xl border overflow-hidden transition-colors" style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}>
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-[var(--table-hover,rgba(0,0,0,0.02))]"
      >
        <div className="w-9 h-9 rounded-xl flex items-center justify-center text-[11px] font-bold shrink-0"
          style={{ background: 'var(--primary-glow, var(--bosque-50))', color: 'var(--primary, var(--bosque-600))' }}>
          {initials(l.trabajador_nombre)}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-medium text-sm truncate" style={{ color: 'var(--tinta)' }}>{l.trabajador_nombre}</p>
          <p className="text-[11px]" style={{ color: 'var(--tinta-500)' }}>
            {l.modalidad_aplicada?.replace(/_/g, ' ')} · {l.dias_trabajados}d
            {l.horas_trabajadas > 0 ? ` · ${l.horas_trabajadas}h` : ''}
            {l.horas_extra > 0 ? ` · ${l.horas_extra}h extra` : ''}
            {l.dias_festivos > 0 ? ` · ${l.dias_festivos} fest.` : ''}
          </p>
        </div>
        <div className="text-right shrink-0">
          <p className="text-[10px] uppercase tracking-wider font-semibold" style={{ color: 'var(--tinta-500)' }}>Neto</p>
          <p className="font-mono font-bold text-sm" style={{ color: 'var(--tinta)' }}>{formatMXN(l.total_neto)}</p>
        </div>
        {action && <div onClick={e => e.stopPropagation()} className="shrink-0">{action}</div>}
        <ChevronDown className={`w-4 h-4 shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} style={{ color: 'var(--tinta-500)' }} />
      </button>

      {open && (
        <div className="px-4 pb-3 pt-1 border-t" style={{ borderColor: 'var(--divider, var(--border))' }}>
          <Row label="Sueldo base" value={l.subtotal_base} />
          <Row label="Horas extra" value={l.total_horas_extra} tone="add" />
          <Row label="Conceptos (suma)" value={l.conceptos_suma} tone="add" />
          <Row label="Conceptos (descuento)" value={l.conceptos_descuento} tone="sub" />
          <Row label="Anticipos" value={l.anticipos_descontados} tone="sub" />
          <Row label="IMSS obrero" hint="Cuota obrera del IMSS: 3.275% del salario base de cotización del período." value={l.imss_obrero} tone="sub" />
          <Row label="ISR retenido" hint="Retención de ISR según la tabla del SAT aplicada al ingreso del período." value={l.isr_retenido} tone="sub" />
          {conceptosNeto === 0 && l.conceptos_suma === 0 && l.conceptos_descuento === 0 ? null : null}
          <div className="mt-1.5 pt-1.5 border-t" style={{ borderColor: 'var(--divider, var(--border))' }}>
            <Row label="Neto a pagar" value={l.total_neto} strong />
          </div>
        </div>
      )}
    </div>
  )
}
