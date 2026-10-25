'use client'
import { useState } from 'react'
import { Plus, Trash2, Send, ChevronDown, X } from 'lucide-react'
import { formatMXN } from '@/lib/utils'
import type { LineaNomina, Trabajador } from '@/types'

export type LineaCalculada = {
  id: string
  trabajador_id: string
  trabajador_nombre: string
  modalidad_aplicada: string
  dias_trabajados: number
  dias_festivos: number
  horas_trabajadas: number
  horas_extra: number
  subtotal_base: number
  total_horas_extra: number
  anticipos_descontados: number
  conceptos_suma: number
  conceptos_descuento: number
  imss_obrero: number
  isr_retenido: number
  total_neto: number
  calculo_dirty: boolean
  calculado_at: string | null
}

export default function NominaLineasTable({
  lineas,
  lineasCalculadas,
  trabajadoresDisp,
  updateLinea,
  setLineaTotal,
  onAddTrabajador,
  onRemoveLinea,
  openRecibo,
}: {
  lineas: LineaNomina[]
  lineasCalculadas: LineaCalculada[]
  trabajadoresDisp: Trabajador[]
  updateLinea: (id: string, field: string, value: number) => void
  setLineaTotal: (id: string, value: number) => void
  onAddTrabajador: (trab: Trabajador) => Promise<void>
  onRemoveLinea: (linId: string) => Promise<void>
  openRecibo: (lc: LineaCalculada) => void
}) {
  const [showLineasManuales, setShowLineasManuales] = useState(false)
  const [showAddTrab, setShowAddTrab] = useState(false)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)

  const handleAdd = async (trab: Trabajador) => {
    await onAddTrabajador(trab)
    setShowAddTrab(false)
  }

  const handleRemove = async (linId: string) => {
    await onRemoveLinea(linId)
    setConfirmDeleteId(null)
  }

  return (
    <>
      {/* Desktop */}
      <div className="card mb-4 overflow-x-auto hidden md:block">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowLineasManuales(v => !v)}
              className="font-display font-semibold text-ink flex items-center gap-1.5 hover:opacity-80 transition-opacity"
            >
              <ChevronDown className={`w-4 h-4 transition-transform ${showLineasManuales ? '' : '-rotate-90'}`} />
              Ajustes manuales
            </button>
            {!showLineasManuales && lineas.length > 0 && (
              <span className="text-xs" style={{ color: 'var(--tinta-500)' }}>
                {lineas.length} trabajador{lineas.length !== 1 ? 'es' : ''}
              </span>
            )}
          </div>
          <button onClick={() => setShowAddTrab(true)} className="btn-secondary flex items-center gap-1 py-1.5 text-xs">
            <Plus className="w-3.5 h-3.5" /> Agregar
          </button>
        </div>
        {!showLineasManuales && (
          <p className="text-xs pb-1" style={{ color: 'var(--tinta-500)' }}>
            Expande para editar días, horas y totales individuales. Los cambios afectan el resumen tras recalcular.
          </p>
        )}
        {showLineasManuales && (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-xs text-ink-soft uppercase tracking-wide">
                <th className="text-left py-2 font-semibold">Nombre</th>
                <th className="text-right py-2 font-semibold w-20">Días</th>
                <th className="text-right py-2 font-semibold w-20">Horas</th>
                <th className="text-right py-2 font-semibold w-20">HE</th>
                <th className="text-right py-2 font-semibold w-24">Subtotal</th>
                <th className="text-right py-2 font-semibold w-24">Total HE</th>
                <th className="text-right py-2 font-semibold w-24">Total</th>
                <th className="w-8" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {lineas.map(l => {
                const t = l.trabajadores as Trabajador
                return (
                  <tr key={l.id} className="hover:bg-bg">
                    <td className="py-2.5 pr-2">
                      <p className="font-medium text-ink">{t?.nombre}</p>
                      <p className="text-xs" style={{ color: 'var(--tinta-500)' }}>{t?.modalidad_pago?.replace('_', ' ')}</p>
                    </td>
                    <td className="py-2.5 text-right">
                      <input type="number" min="0" max="31" step="0.5" value={l.dias_trabajados}
                        onChange={e => updateLinea(l.id, 'dias_trabajados', parseFloat(e.target.value) || 0)}
                        className="w-16 text-right input py-1 text-xs"
                        disabled={t?.modalidad_pago === 'por_hora' || t?.modalidad_pago === 'sueldo_fijo'} />
                    </td>
                    <td className="py-2.5 text-right">
                      <input type="number" min="0" max="999" step="0.5" value={l.horas_trabajadas}
                        onChange={e => updateLinea(l.id, 'horas_trabajadas', parseFloat(e.target.value) || 0)}
                        className="w-16 text-right input py-1 text-xs"
                        disabled={t?.modalidad_pago === 'por_dia' || t?.modalidad_pago === 'sueldo_fijo'} />
                    </td>
                    <td className="py-2.5 text-right">
                      <input type="number" min="0" max="999" step="0.5" value={l.horas_extra}
                        onChange={e => updateLinea(l.id, 'horas_extra', parseFloat(e.target.value) || 0)}
                        className="w-16 text-right input py-1 text-xs" />
                    </td>
                    <td className="py-2.5 text-right font-mono text-xs text-ink">{formatMXN(l.subtotal)}</td>
                    <td className="py-2.5 text-right font-mono text-xs text-ink">{formatMXN(l.total_horas_extra)}</td>
                    <td className="py-2.5 text-right">
                      <input type="number" min="0" step="0.01" value={l.total}
                        onChange={e => setLineaTotal(l.id, parseFloat(e.target.value) || 0)}
                        title="Editable: ajusta el total final si la suma automática no es la correcta"
                        className="w-28 text-right input py-1 text-xs font-mono font-semibold text-accent" />
                    </td>
                    <td className="py-2.5 pl-2">
                      <div className="flex items-center gap-1">
                        {lineasCalculadas.find(lc => lc.trabajador_id === l.trabajador_id) && (
                          <button
                            onClick={() => {
                              const lc = lineasCalculadas.find(x => x.trabajador_id === l.trabajador_id)
                              if (lc) openRecibo(lc)
                            }}
                            title="Recibo WhatsApp"
                            className="p-1 rounded transition-colors hover:bg-green-50"
                            style={{ color: '#16A34A' }}
                          >
                            <Send className="w-3.5 h-3.5" />
                          </button>
                        )}
                        {confirmDeleteId === l.id ? (
                          <span className="inline-flex items-center gap-1">
                            <button onClick={() => handleRemove(l.id)} className="text-xs text-red-600 font-semibold hover:underline">Eliminar</button>
                            <button onClick={() => setConfirmDeleteId(null)} className="text-xs hover:underline" style={{ color: 'var(--tinta-500)' }}>Cancelar</button>
                          </span>
                        ) : (
                          <button onClick={() => setConfirmDeleteId(l.id)} className="p-1 rounded" style={{ color: 'var(--tinta-500)' }} aria-label="Eliminar trabajador de la nomina">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Mobile */}
      <div className="md:hidden card mb-4">
        <div className="flex items-center justify-between mb-3">
          <button
            onClick={() => setShowLineasManuales(v => !v)}
            className="font-display font-semibold text-ink flex items-center gap-1.5"
          >
            <ChevronDown className={`w-4 h-4 transition-transform ${showLineasManuales ? '' : '-rotate-90'}`} />
            Ajustes manuales
            {!showLineasManuales && lineas.length > 0 && (
              <span className="text-xs font-normal ml-1" style={{ color: 'var(--tinta-500)' }}>({lineas.length})</span>
            )}
          </button>
          <button onClick={() => setShowAddTrab(true)} className="btn-secondary py-1.5 text-xs flex items-center gap-1">
            <Plus className="w-3.5 h-3.5" />Agregar
          </button>
        </div>
        {showLineasManuales && (
          <div className="space-y-3">
            {lineas.map(l => {
              const t = l.trabajadores as Trabajador
              return (
                <div key={l.id} className="border border-border rounded-lg p-3">
                  <div className="flex items-center justify-between mb-2 gap-2">
                    <p className="font-medium text-sm text-ink flex-1">{t?.nombre}</p>
                    <input type="number" min="0" step="0.01" value={l.total}
                      onChange={e => setLineaTotal(l.id, parseFloat(e.target.value) || 0)}
                      title="Total editable"
                      className="w-24 text-right input py-1 text-xs font-mono font-semibold text-accent shrink-0" />
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="text-xs text-ink-soft">Días</label>
                      <input type="number" min="0" step="0.5" value={l.dias_trabajados}
                        onChange={e => updateLinea(l.id, 'dias_trabajados', parseFloat(e.target.value) || 0)}
                        className="input py-1 text-sm mt-0.5"
                        disabled={t?.modalidad_pago === 'por_hora' || t?.modalidad_pago === 'sueldo_fijo'} />
                    </div>
                    <div>
                      <label className="text-xs text-ink-soft">Horas</label>
                      <input type="number" min="0" step="0.5" value={l.horas_trabajadas}
                        onChange={e => updateLinea(l.id, 'horas_trabajadas', parseFloat(e.target.value) || 0)}
                        className="input py-1 text-sm mt-0.5"
                        disabled={t?.modalidad_pago === 'por_dia' || t?.modalidad_pago === 'sueldo_fijo'} />
                    </div>
                    <div>
                      <label className="text-xs text-ink-soft">HE</label>
                      <input type="number" min="0" step="0.5" value={l.horas_extra}
                        onChange={e => updateLinea(l.id, 'horas_extra', parseFloat(e.target.value) || 0)}
                        className="input py-1 text-sm mt-0.5" />
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Add trabajador modal */}
      {showAddTrab && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/40">
          <div className="bg-surface rounded-2xl w-full max-w-md">
            <div className="flex items-center justify-between p-4 border-b border-border">
              <h3 className="font-display font-semibold">Agregar trabajador</h3>
              <button onClick={() => setShowAddTrab(false)}><X className="w-5 h-5 text-ink-soft" /></button>
            </div>
            <div className="p-4 max-h-72 overflow-y-auto divide-y divide-border">
              {trabajadoresDisp.length === 0
                ? <p className="text-sm text-ink-soft py-4 text-center">Todos los trabajadores ya están incluidos.</p>
                : trabajadoresDisp.map(t => (
                  <button key={t.id} onClick={() => handleAdd(t)} className="w-full text-left px-2 py-3 hover:bg-bg rounded transition-colors">
                    <p className="text-sm font-medium text-ink">{t.nombre}</p>
                    <p className="text-xs text-ink-soft">{t.modalidad_pago?.replace('_', ' ')}</p>
                  </button>
                ))}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
