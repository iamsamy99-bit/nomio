'use client'

import { useEffect, useState, useCallback } from 'react'

type HealthStatus = 'ok' | 'degraded' | 'error' | 'loading'

interface HealthData {
  status: 'ok' | 'degraded' | 'error'
  db_latency_ms: number | null
  ts: string
  error?: string
}

const STATUS_CONFIG = {
  ok: {
    dot: 'bg-green-500',
    pulse: 'bg-green-400',
    text: 'Todos los sistemas operan con normalidad',
    badge: 'text-green-700 bg-green-50 border-green-200',
    label: 'Operacional',
  },
  degraded: {
    dot: 'bg-amber-500',
    pulse: 'bg-amber-400',
    text: 'Latencia elevada detectada',
    badge: 'text-amber-700 bg-amber-50 border-amber-200',
    label: 'Degradado',
  },
  error: {
    dot: 'bg-red-500',
    pulse: 'bg-red-400',
    text: 'Interrupcion de servicio detectada',
    badge: 'text-red-700 bg-red-50 border-red-200',
    label: 'Error',
  },
  loading: {
    dot: 'bg-gray-300',
    pulse: 'bg-gray-200',
    text: 'Verificando estado...',
    badge: 'text-gray-500 bg-gray-50 border-gray-200',
    label: 'Verificando',
  },
}

function formatTs(ts: string) {
  return new Date(ts).toLocaleString('es-MX', {
    dateStyle: 'medium',
    timeStyle: 'medium',
  })
}

export default function StatusPage() {
  const [data, setData] = useState<HealthData | null>(null)
  const [displayStatus, setDisplayStatus] = useState<HealthStatus>('loading')
  const [fetchError, setFetchError] = useState(false)

  const check = useCallback(async () => {
    try {
      const res = await fetch('/api/health', { cache: 'no-store' })
      const json: HealthData = await res.json()
      setData(json)
      setDisplayStatus(json.status)
      setFetchError(false)
    } catch {
      setFetchError(true)
      setDisplayStatus('error')
    }
  }, [])

  useEffect(() => {
    check()
    const interval = setInterval(check, 60_000)
    return () => clearInterval(interval)
  }, [check])

  const cfg = STATUS_CONFIG[displayStatus]

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center space-y-1">
          <p className="text-xs font-mono uppercase tracking-widest text-gray-400">Nomio — Estado del sistema</p>
          <h1 className="text-2xl font-semibold text-gray-900">{cfg.text}</h1>
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm divide-y divide-gray-100">
          <div className="px-6 py-4 flex items-center justify-between">
            <span className="text-sm text-gray-600">API / Base de datos</span>
            <span className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full border ${cfg.badge}`}>
              <span className="relative flex h-2 w-2">
                {displayStatus !== 'loading' && displayStatus !== 'error' && (
                  <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${cfg.pulse}`} />
                )}
                <span className={`relative inline-flex rounded-full h-2 w-2 ${cfg.dot}`} />
              </span>
              {cfg.label}
            </span>
          </div>

          {data && (
            <div className="px-6 py-4 flex items-center justify-between">
              <span className="text-sm text-gray-600">Latencia</span>
              <span className="text-sm font-mono text-gray-900">
                {data.db_latency_ms !== null ? `${data.db_latency_ms} ms` : '—'}
              </span>
            </div>
          )}

          <div className="px-6 py-4 flex items-center justify-between">
            <span className="text-sm text-gray-600">Ultimo check</span>
            <span className="text-sm font-mono text-gray-500">
              {data ? formatTs(data.ts) : '—'}
            </span>
          </div>
        </div>

        {fetchError && !data && (
          <p className="text-center text-xs text-red-500">
            No se pudo conectar con el servidor de monitoreo.
          </p>
        )}

        <p className="text-center text-xs text-gray-400">
          Se actualiza automaticamente cada 60 segundos.
        </p>
      </div>
    </div>
  )
}
