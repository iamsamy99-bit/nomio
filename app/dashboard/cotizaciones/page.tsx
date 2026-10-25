'use client'
import React, { useEffect, useState, useCallback, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useEmpresa } from '@/components/layout/EmpresaContext'
import Link from 'next/link'
import { Plus, Receipt, Trash2, Loader2 } from 'lucide-react'
import { formatMXN, formatDate } from '@/lib/utils'

type Cotizacion = {
  id: string
  numero_cotizacion: number
  titulo: string
  cliente_nombre: string
  fecha_emision: string
  estado: string
  total: number
  moneda: string
  created_at: string
}

type EmpresaInfo = { suscripcion_tier: string; limite_cotizaciones_mes: number }

const ESTADOS = ['todas', 'borrador', 'enviada', 'aceptada', 'rechazada'] as const
type EstadoFilter = (typeof ESTADOS)[number]

const estadoStyle = (e: string): React.CSSProperties => ({
  borrador:  { background: 'var(--cuero-100)',   color: 'var(--tinta-500)' },
  enviada:   { background: 'var(--petroleo-50)', color: 'var(--petroleo-300)' },
  aceptada:  { background: 'var(--bosque-50)',   color: 'var(--bosque-600)' },
  rechazada: { background: '#F5DAD5',            color: 'var(--rojo-falta)' },
} as Record<string, React.CSSProperties>)[e] || { background: 'var(--cuero-100)', color: 'var(--tinta-500)' }

const estadoLabel = (e: string): string => ({
  borrador:  'Borrador',
  enviada:   'Enviada',
  aceptada:  'Aceptada',
  rechazada: 'Rechazada',
} as Record<string, string>)[e] || e

export default function CotizacionesPage() {
  const supabase = useMemo(() => createClient(), [])
  const { empresaId, empresa: empresaCtx } = useEmpresa()
  const empresa = empresaCtx as unknown as EmpresaInfo
  const [cotizaciones, setCotizaciones] = useState<Cotizacion[]>([])
  const [loading, setLoading] = useState(true)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [confirmTarget, setConfirmTarget] = useState<Cotizacion | null>(null)
  const [filtroEstado, setFiltroEstado] = useState<EstadoFilter>('todas')

  const loadData = useCallback(async () => {
    const { data } = await supabase.from('cotizaciones').select('*')
      .eq('empresa_id', empresaId)
      .order('created_at', { ascending: false })
    setCotizaciones(data || [])
    setLoading(false)
  }, [supabase, empresaId])

  useEffect(() => { loadData() }, [loadData])

  const handleDeleteConfirmed = async () => {
    if (!confirmTarget) return
    const cot = confirmTarget
    setConfirmTarget(null)
    setDeleting(cot.id)
    const { error: itemsErr } = await supabase.from('cotizacion_items').delete().eq('cotizacion_id', cot.id)
    if (itemsErr) { setDeleting(null); return }
    const { error } = await supabase.from('cotizaciones').delete().eq('id', cot.id)
    if (error) { setDeleting(null); return }
    setCotizaciones(prev => prev.filter(c => c.id !== cot.id))
    setDeleting(null)
  }

  const start = new Date(); start.setDate(1); start.setHours(0, 0, 0, 0)
  const cotsMes = cotizaciones.filter(c => new Date(c.created_at) >= start).length
  const limit = empresa?.limite_cotizaciones_mes || 10
  const isPyme = empresa?.suscripcion_tier === 'pyme'
  const atLimit = !isPyme && cotsMes >= limit

  const filtered = filtroEstado === 'todas' ? cotizaciones : cotizaciones.filter(c => c.estado === filtroEstado)

  void empresaId

  if (loading) return (
    <div className="max-w-4xl mx-auto space-y-3">
      <div className="flex items-center justify-between mb-6">
        <div className="h-8 w-36 rounded-xl" style={{ background: 'var(--surface-3)' }} />
        <div className="h-9 w-44 rounded-xl" style={{ background: 'var(--surface-3)' }} />
      </div>
      <div className="h-10 w-full rounded-xl" style={{ background: 'var(--surface-3)' }} />
      {[1, 2, 3].map(i => (
        <div key={i} className="flex items-center gap-4 px-5 py-4 rounded-xl" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
          <div className="flex-1 space-y-2">
            <div className="h-3 w-24 rounded" style={{ background: 'var(--surface-3)' }} />
            <div className="h-4 w-56 rounded" style={{ background: 'var(--surface-3)' }} />
            <div className="h-3 w-40 rounded" style={{ background: 'var(--surface-3)' }} />
          </div>
          <div className="h-5 w-24 rounded shrink-0" style={{ background: 'var(--surface-3)' }} />
        </div>
      ))}
    </div>
  )

  return (
    <>
      {/* Delete confirmation modal */}
      {confirmTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setConfirmTarget(null)} />
          <div
            className="relative rounded-2xl p-6 w-full max-w-sm animate-scale-in"
            style={{ background: 'var(--surface)', border: '1px solid var(--border)', boxShadow: '0 20px 60px rgba(0,0,0,0.20)' }}
          >
            <div
              className="w-11 h-11 rounded-xl flex items-center justify-center mb-4"
              style={{ background: 'rgba(239,68,68,0.10)', border: '1px solid rgba(239,68,68,0.20)' }}
            >
              <Trash2 className="w-5 h-5" style={{ color: 'var(--error)' }} />
            </div>
            <h3 className="font-semibold text-base mb-1" style={{ color: 'var(--text)' }}>
              Eliminar cotización
            </h3>
            <p className="text-sm mb-1 truncate font-medium" style={{ color: 'var(--text)' }}>{confirmTarget.titulo}</p>
            <p className="text-sm mb-5" style={{ color: 'var(--text-muted)' }}>
              Esta acción eliminará la cotización y todos sus ítems. No se puede deshacer.
            </p>
            <div className="flex gap-2">
              <button onClick={() => setConfirmTarget(null)} className="btn-secondary flex-1">Cancelar</button>
              <button
                onClick={handleDeleteConfirmed}
                disabled={!!deleting}
                className="flex-1 flex items-center justify-center gap-2 font-semibold px-4 py-2 rounded-xl text-sm cursor-pointer transition-all duration-200 disabled:opacity-50"
                style={{ background: 'var(--error)', color: '#fff' }}
              >
                {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
          <div>
            <h1 className="font-display text-2xl font-bold" style={{ color: 'var(--text)' }}>Cotizaciones</h1>
            <p className="text-sm mt-0.5" style={{ color: 'var(--text-muted)' }}>
              {cotsMes} de {isPyme ? 'ilimitadas' : limit} este mes
            </p>
          </div>
          <Link
            href={atLimit ? '/dashboard/planes' : '/dashboard/cotizaciones/nueva'}
            className="btn-primary flex items-center gap-2"
          >
            <Plus className="w-4 h-4" /> Nueva cotización
          </Link>
        </div>

        {/* Estado filter toggles */}
        <div className="flex items-center gap-1.5 mb-5 flex-wrap">
          {ESTADOS.map(e => {
            const active = filtroEstado === e
            const count = e === 'todas' ? cotizaciones.length : cotizaciones.filter(c => c.estado === e).length
            return (
              <button
                key={e}
                onClick={() => setFiltroEstado(e)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-150"
                style={active
                  ? e === 'todas'
                    ? { background: 'var(--primary)', color: '#fff' }
                    : { ...estadoStyle(e), border: '1px solid currentColor' }
                  : { background: 'var(--surface-2)', color: 'var(--text-muted)', border: '1px solid var(--border)' }
                }
              >
                {e === 'todas' ? 'Todas' : estadoLabel(e)}
                <span
                  className="text-[10px] font-mono rounded-full px-1 py-0.5 leading-none"
                  style={{ background: active ? 'rgba(255,255,255,0.20)' : 'var(--surface-3)', color: 'inherit' }}
                >
                  {count}
                </span>
              </button>
            )
          })}
        </div>

        {atLimit && (
          <div className="rounded-xl p-4 mb-5 flex items-center justify-between gap-3" style={{ background: 'rgba(184,149,106,0.10)', border: '1px solid rgba(184,149,106,0.30)' }}>
            <p className="text-sm" style={{ color: 'var(--text)' }}>
              <strong>Límite alcanzado.</strong> Usaste las {limit} cotizaciones del mes.
              Actualiza a PYME para cotizaciones ilimitadas.
            </p>
            <Link href="/dashboard/planes" className="btn-accent shrink-0 text-xs">Actualizar</Link>
          </div>
        )}

        {!filtered.length ? (
          <div className="tile text-center py-16">
            <div
              className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4"
              style={{ background: 'var(--surface-2)', border: '1px solid var(--border)' }}
            >
              <Receipt className="w-7 h-7" style={{ color: 'var(--text-muted)' }} />
            </div>
            <p className="text-sm mb-4" style={{ color: 'var(--text-muted)' }}>
              {filtroEstado === 'todas' ? 'No hay cotizaciones aún.' : `No hay cotizaciones con estado "${estadoLabel(filtroEstado)}".`}
            </p>
            {filtroEstado === 'todas' && (
              <Link href="/dashboard/cotizaciones/nueva" className="btn-primary">Crear cotización</Link>
            )}
          </div>
        ) : (
          <div className="tile p-0 overflow-hidden">
            <div className="divide-y" style={{ borderColor: 'var(--divider)' }}>
              {filtered.map(c => (
                <div key={c.id} className="flex items-center gap-4 px-5 py-4 hover:bg-[var(--table-hover)] transition-colors">
                  <Link href={`/dashboard/cotizaciones/${c.id}`} className="flex-1 min-w-0 flex items-center gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className="text-xs" style={{ fontFamily: "'JetBrains Mono', monospace", color: 'var(--text-muted)' }}>
                          COT-{String(c.numero_cotizacion).padStart(4, '0')}
                        </span>
                        <span
                          className="inline-flex px-2 py-0.5 rounded text-xs font-medium"
                          style={estadoStyle(c.estado)}
                        >
                          {estadoLabel(c.estado)}
                        </span>
                      </div>
                      <p className="font-medium text-sm truncate" style={{ color: 'var(--text)' }}>{c.titulo}</p>
                      <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Para: {c.cliente_nombre} · {formatDate(c.fecha_emision)}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="font-bold" style={{ fontFamily: "'JetBrains Mono', monospace", color: 'var(--accent)' }}>
                        {formatMXN(c.total)}
                      </p>
                      <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{c.moneda}</p>
                    </div>
                  </Link>
                  <button
                    onClick={() => setConfirmTarget(c)}
                    disabled={deleting === c.id}
                    className="p-2 rounded-lg transition-colors shrink-0 disabled:opacity-50"
                    style={{ color: 'var(--text-muted)' }}
                    onMouseEnter={e => (e.currentTarget.style.color = 'var(--error)', e.currentTarget.style.background = 'rgba(239,68,68,0.08)')}
                    onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-muted)', e.currentTarget.style.background = 'transparent')}
                    title="Eliminar cotización"
                  >
                    {deleting === c.id
                      ? <Loader2 className="w-4 h-4 animate-spin" />
                      : <Trash2 className="w-4 h-4" />
                    }
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </>
  )
}
