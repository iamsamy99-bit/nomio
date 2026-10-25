'use client'
import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Shield, ChevronDown } from 'lucide-react'

type AuditEntry = {
  id: number
  created_at: string
  user_id: string
  tabla: string
  operacion: string
  registro_id: string | null
  payload: Record<string, unknown> | null
}

const OPERACION_LABELS: Record<string, string> = {
  nomina_generada:      'Nómina generada',
  nomina_pagada:        'Nómina marcada como pagada',
  trabajador_creado:    'Trabajador creado',
  trabajador_eliminado: 'Trabajador eliminado',
  cotizacion_enviada:   'Cotización enviada',
  cotizacion_aceptada:  'Cotización aceptada',
  cotizacion_rechazada: 'Cotización rechazada',
  anticipo_aprobado:    'Anticipo aprobado',
  anticipo_rechazado:   'Anticipo rechazado',
}

const OPERACION_COLORS: Record<string, { bg: string; text: string }> = {
  nomina_generada:      { bg: 'rgba(27,108,168,0.10)',   text: 'var(--primary)' },
  nomina_pagada:        { bg: 'rgba(111,138,79,0.12)',   text: 'var(--verde-ok)' },
  trabajador_creado:    { bg: 'rgba(27,108,168,0.08)',   text: 'var(--primary)' },
  trabajador_eliminado: { bg: 'rgba(239,68,68,0.10)',    text: '#EF4444' },
  cotizacion_enviada:   { bg: 'rgba(217,164,65,0.12)',   text: 'var(--ambar)' },
  cotizacion_aceptada:  { bg: 'rgba(111,138,79,0.12)',   text: 'var(--verde-ok)' },
  cotizacion_rechazada: { bg: 'rgba(239,68,68,0.10)',    text: '#EF4444' },
  anticipo_aprobado:    { bg: 'rgba(111,138,79,0.12)',   text: 'var(--verde-ok)' },
  anticipo_rechazado:   { bg: 'rgba(239,68,68,0.10)',    text: '#EF4444' },
}

const PAGE_SIZE = 30

function formatTs(iso: string) {
  const d = new Date(iso)
  return d.toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' })
    + ' ' + d.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })
}

export default function AuditoriaPage() {
  const supabase = createClient()
  const [entries, setEntries] = useState<AuditEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [filtroOp, setFiltroOp] = useState<string>('todos')
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(0)
  const [expandedId, setExpandedId] = useState<number | null>(null)

  const loadEntries = useCallback(async (operacion: string, p: number) => {
    setLoading(true)
    let q = supabase
      .from('audit_log')
      .select('id, created_at, user_id, tabla, operacion, registro_id, payload', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(p * PAGE_SIZE, (p + 1) * PAGE_SIZE - 1)

    if (operacion !== 'todos') q = q.eq('operacion', operacion)

    const { data, count } = await q
    setEntries(data as AuditEntry[] ?? [])
    setTotal(count ?? 0)
    setLoading(false)
  }, [supabase])

  useEffect(() => { loadEntries(filtroOp, page) }, [loadEntries, filtroOp, page])

  const handleFiltro = (op: string) => { setFiltroOp(op); setPage(0) }

  const totalPages = Math.ceil(total / PAGE_SIZE)

  return (
    <div className="max-w-4xl mx-auto space-y-5">
      <div className="mb-2">
        <h1 className="font-display text-2xl font-bold" style={{ color: 'var(--tinta)' }}>Auditoría</h1>
        <p className="text-sm mt-0.5" style={{ color: 'var(--tinta-500)' }}>
          Registro de acciones importantes realizadas en tu empresa
        </p>
      </div>

      {/* Filter bar */}
      <div className="card p-3 flex flex-wrap gap-2">
        {(['todos', ...Object.keys(OPERACION_LABELS)] as string[]).map(op => (
          <button
            key={op}
            onClick={() => handleFiltro(op)}
            className="text-xs px-3 py-1.5 rounded-full font-medium transition-all"
            style={filtroOp === op
              ? { background: 'var(--primary)', color: '#fff' }
              : { background: 'var(--bosque-50)', color: 'var(--tinta-500)', border: '1px solid var(--border)' }
            }
          >
            {op === 'todos' ? 'Todos' : OPERACION_LABELS[op]}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="card p-0 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-48">
            <div className="w-6 h-6 border-2 rounded-full animate-spin" style={{ borderColor: 'var(--border)', borderTopColor: 'var(--primary)' }} />
          </div>
        ) : entries.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <Shield className="w-10 h-10" style={{ color: 'var(--tinta-500)', opacity: 0.4 }} />
            <p className="text-sm" style={{ color: 'var(--tinta-500)' }}>
              {filtroOp === 'todos' ? 'Aún no hay acciones registradas.' : 'No hay registros para este filtro.'}
            </p>
          </div>
        ) : (
          <div className="divide-y" style={{ borderColor: 'var(--border)' }}>
            {entries.map(entry => {
              const colors = OPERACION_COLORS[entry.operacion] ?? { bg: 'var(--bosque-50)', text: 'var(--tinta)' }
              const label = OPERACION_LABELS[entry.operacion] ?? entry.operacion
              const isExpanded = expandedId === entry.id
              const hasPayload = entry.payload && Object.keys(entry.payload).length > 0

              return (
                <div key={entry.id}>
                  <button
                    onClick={() => hasPayload ? setExpandedId(isExpanded ? null : entry.id) : undefined}
                    className="w-full flex items-center justify-between px-4 py-3 text-left"
                    style={{ cursor: hasPayload ? 'pointer' : 'default' }}
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <span
                        className="text-xs font-semibold px-2.5 py-1 rounded-full whitespace-nowrap shrink-0"
                        style={{ background: colors.bg, color: colors.text }}
                      >
                        {label}
                      </span>
                      <span className="text-xs truncate" style={{ color: 'var(--tinta-500)' }}>
                        {entry.registro_id ? `ID: ${entry.registro_id.slice(0, 8)}…` : entry.tabla}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 shrink-0 ml-3">
                      <span className="text-xs font-mono" style={{ color: 'var(--tinta-500)' }}>
                        {formatTs(entry.created_at)}
                      </span>
                      {hasPayload && (
                        <ChevronDown
                          className="w-3.5 h-3.5 transition-transform"
                          style={{ color: 'var(--tinta-500)', transform: isExpanded ? 'rotate(180deg)' : 'none' }}
                        />
                      )}
                    </div>
                  </button>

                  {isExpanded && entry.payload && (
                    <div className="px-4 pb-3">
                      <pre className="text-xs rounded-lg p-3 overflow-x-auto font-mono"
                        style={{ background: 'var(--bosque-50)', color: 'var(--bosque-600)', border: '1px solid var(--bosque-200)' }}>
                        {JSON.stringify(entry.payload, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm" style={{ color: 'var(--tinta-500)' }}>
          <span>{total} registros</span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage(p => Math.max(0, p - 1))}
              disabled={page === 0}
              className="btn-secondary py-1 px-3 text-xs disabled:opacity-40"
            >
              Anterior
            </button>
            <span className="text-xs">{page + 1} / {totalPages}</span>
            <button
              onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
              disabled={page >= totalPages - 1}
              className="btn-secondary py-1 px-3 text-xs disabled:opacity-40"
            >
              Siguiente
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
