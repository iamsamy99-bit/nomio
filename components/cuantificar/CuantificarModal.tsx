'use client'
import { useState } from 'react'
import { Sparkles, X, AlertCircle, CheckCircle, Plus, TriangleAlert } from 'lucide-react'
import MicButton from '@/components/ui/MicButton'

export interface MaterialItem {
  nombre: string
  cantidad: number
  unidad: string
  costo_unitario: number
  costo_total: number
}

export interface CuantificarResultado {
  cantidad: number
  unidad: string
  descripcion: string
  supuestos: string
  materiales: MaterialItem[]
  costo_total_estimado: number
  recomendacion: string
}

interface Props {
  onClose: () => void
  onAgregar: (item: CuantificarResultado) => void
  contexto?: string
  actionLabel?: string
}

import { UNIDADES } from '@/lib/constants'

export default function CuantificarModal({ onClose, onAgregar, contexto, actionLabel = 'Agregar a cotización' }: Props) {
  const [descripcion, setDescripcion] = useState('')
  const [loading, setLoading] = useState(false)
  const [resultado, setResultado] = useState<CuantificarResultado | null>(null)
  const [requerido, setRequerido] = useState('')
  const [error, setError] = useState('')

  const [editCantidad, setEditCantidad] = useState('')
  const [editUnidad, setEditUnidad] = useState('')
  const [editDescripcion, setEditDescripcion] = useState('')

  const handleCuantificar = async () => {
    if (!descripcion.trim()) return
    setLoading(true)
    setResultado(null)
    setRequerido('')
    setError('')

    try {
      const res = await fetch('/api/cuantificar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ descripcion: descripcion.trim(), contexto }),
      })
      const data = await res.json()

      if (!res.ok) {
        setError(data.error ?? 'Error al cuantificar. Intenta de nuevo.')
        return
      }

      if (data.error && data.requerido) {
        setRequerido(data.requerido)
        return
      }

      if (data.cantidad && data.unidad) {
        setResultado(data as CuantificarResultado)
        setEditCantidad(String(data.cantidad))
        setEditUnidad(data.unidad)
        setEditDescripcion(data.descripcion)
      } else {
        setError('Respuesta inesperada. Intenta reformular la descripción.')
      }
    } catch {
      setError('Error de conexión. Intenta de nuevo.')
    } finally {
      setLoading(false)
    }
  }

  const handleAgregar = () => {
    if (!resultado) return
    onAgregar({
      cantidad: parseFloat(editCantidad) || resultado.cantidad,
      unidad: editUnidad || resultado.unidad,
      descripcion: editDescripcion || resultado.descripcion,
      supuestos: resultado.supuestos,
      materiales: resultado.materiales,
      costo_total_estimado: resultado.costo_total_estimado,
      recomendacion: resultado.recomendacion,
    })
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto" style={{ background: 'var(--surface)' }}>
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b" style={{ borderColor: 'var(--border)' }}>
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-amber-500" />
            <h2 className="font-display font-semibold" style={{ color: 'var(--tinta)' }}>Cuantificar con IA</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
            style={{ color: 'var(--tinta-500)' }}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {/* Input */}
          <div>
            <label className="label">Describe el trabajo a cuantificar</label>
            <div className="relative">
              <textarea
                value={descripcion}
                onChange={e => setDescripcion(e.target.value)}
                placeholder="Ej: Piso de cerámica en sala de 4.5m x 6m, incluye zócalo de 10cm..."
                className="input h-28 resize-none pr-11"
                maxLength={800}
                disabled={loading}
              />
              <div className="absolute top-2 right-2">
                <MicButton
                  onTranscript={t => setDescripcion(t.slice(0, 800))}
                  disabled={loading}
                />
              </div>
            </div>
            <p className="text-xs mt-1" style={{ color: 'var(--tinta-500)' }}>{descripcion.length}/800 caracteres</p>
          </div>

          {/* Error */}
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm p-3 rounded-lg flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Necesita más información */}
          {requerido && !resultado && (
            <div className="bg-amber-50 border border-amber-200 text-amber-800 text-sm p-3 rounded-lg">
              <p className="font-semibold mb-1">Necesito más información:</p>
              <p>{requerido}</p>
            </div>
          )}

          {/* Resultado editable */}
          {resultado && (
            <div className="border rounded-xl p-4 space-y-3" style={{ background: 'var(--bosque-50)', borderColor: 'var(--bosque-200)' }}>
              <div className="flex items-center gap-2 mb-1">
                <CheckCircle className="w-4 h-4" style={{ color: 'var(--verde-ok)' }} />
                <span className="text-sm font-semibold" style={{ color: 'var(--bosque-600)' }}>Cuantificación lista</span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label text-xs">Cantidad</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={editCantidad}
                    onChange={e => setEditCantidad(e.target.value)}
                    className="input text-sm font-mono"
                  />
                </div>
                <div>
                  <label className="label text-xs">Unidad</label>
                  <select
                    value={editUnidad}
                    onChange={e => setEditUnidad(e.target.value)}
                    className="input text-sm"
                  >
                    {UNIDADES.map(u => <option key={u}>{u}</option>)}
                  </select>
                </div>
              </div>

              <div>
                <label className="label text-xs">Concepto</label>
                <input
                  value={editDescripcion}
                  onChange={e => setEditDescripcion(e.target.value)}
                  className="input text-sm"
                  maxLength={100}
                />
              </div>

              {resultado.supuestos && (
                <p className="text-xs rounded-lg p-2" style={{ background: 'var(--bosque-50)', color: 'var(--bosque-600)', border: '1px solid var(--bosque-200)' }}>
                  <span className="font-semibold">Supuestos: </span>{resultado.supuestos}
                </p>
              )}

              {resultado.materiales.length > 0 && (
                <div className="mt-1">
                  <p className="text-xs font-semibold mb-1.5" style={{ color: 'var(--bosque-700)' }}>Material necesario</p>
                  <div className="rounded-lg overflow-hidden border" style={{ borderColor: 'var(--bosque-200)' }}>
                    <table className="w-full text-xs">
                      <thead>
                        <tr style={{ background: 'var(--bosque-100)', color: 'var(--bosque-700)' }}>
                          <th className="text-left px-2 py-1.5 font-semibold">Material</th>
                          <th className="text-right px-2 py-1.5 font-semibold">Cant.</th>
                          <th className="text-right px-2 py-1.5 font-semibold">P. Unit.</th>
                          <th className="text-right px-2 py-1.5 font-semibold">Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        {resultado.materiales.map((m, i) => (
                          <tr key={i} className="border-t" style={{ borderColor: 'var(--bosque-100)', background: i % 2 === 0 ? 'white' : 'var(--bosque-50)' }}>
                            <td className="px-2 py-1.5" style={{ color: 'var(--tinta)' }}>{m.nombre}</td>
                            <td className="px-2 py-1.5 text-right font-mono" style={{ color: 'var(--tinta-500)' }}>{m.cantidad} {m.unidad}</td>
                            <td className="px-2 py-1.5 text-right font-mono" style={{ color: 'var(--tinta-500)' }}>${m.costo_unitario.toLocaleString('es-MX')}</td>
                            <td className="px-2 py-1.5 text-right font-mono font-semibold" style={{ color: 'var(--bosque-700)' }}>${m.costo_total.toLocaleString('es-MX')}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {resultado.costo_total_estimado > 0 && (
                    <div className="flex justify-between items-center mt-1.5 px-2 py-1 rounded-lg" style={{ background: 'var(--bosque-100)' }}>
                      <span className="text-xs font-semibold" style={{ color: 'var(--bosque-700)' }}>Costo total estimado (materiales)</span>
                      <span className="text-sm font-bold font-mono" style={{ color: 'var(--bosque-700)' }}>${resultado.costo_total_estimado.toLocaleString('es-MX')} MXN</span>
                    </div>
                  )}
                </div>
              )}

              {resultado.recomendacion && (
                <div className="flex items-start gap-2 rounded-lg p-2.5 mt-1" style={{ background: '#fffbeb', border: '1px solid #fcd34d' }}>
                  <TriangleAlert className="w-3.5 h-3.5 shrink-0 mt-0.5" style={{ color: '#b45309' }} />
                  <p className="text-xs" style={{ color: '#92400e' }}>
                    <span className="font-semibold">Revisa: </span>{resultado.recomendacion}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Disclaimer */}
          <div className="bg-amber-50 border border-amber-200 text-amber-800 text-xs p-3 rounded-lg">
            Resultado generado por IA. Puede contener errores. Verifica siempre antes de cotizar.
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            {!resultado ? (
              <>
                <button type="button" onClick={onClose} className="btn-secondary flex-1 text-sm">
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleCuantificar}
                  disabled={loading || !descripcion.trim()}
                  className="btn-primary flex-1 text-sm flex items-center justify-center gap-2"
                >
                  <Sparkles className="w-4 h-4" />
                  {loading ? 'Calculando...' : 'Cuantificar'}
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => { setResultado(null); setRequerido('') }}
                  className="btn-secondary flex-1 text-sm"
                >
                  Volver
                </button>
                <button
                  type="button"
                  onClick={handleAgregar}
                  className="btn-primary flex-1 text-sm flex items-center justify-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  {actionLabel}
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
