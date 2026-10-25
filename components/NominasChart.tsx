'use client'
import { useMemo, useState } from 'react'
import { TrendingUp, TrendingDown, Minus, Calendar } from 'lucide-react'
import { formatMXN } from '@/lib/utils'

type N = { total_nomina: number | null; fecha_inicio: string; fecha_fin: string; estado: string }
type Rango = '6m' | '12m' | 'ytd' | 'custom'

const RANGOS: { key: Rango; label: string }[] = [
  { key: '6m',  label: '6 meses'  },
  { key: '12m', label: '12 meses' },
  { key: 'ytd', label: 'Año actual' },
]

export default function NominasChart({ data, totalPagado }: { data: N[]; totalPagado: number }) {
  const [rango, setRango] = useState<Rango>('6m')
  const [customStart, setCustomStart] = useState('')
  const [customEnd, setCustomEnd] = useState('')

  const { meses, max, total, count, trend } = useMemo(() => {
    const ahora = new Date()
    let desde: Date

    if (rango === '6m')        { desde = new Date(ahora.getFullYear(), ahora.getMonth() - 5, 1) }
    else if (rango === '12m')  { desde = new Date(ahora.getFullYear(), ahora.getMonth() - 11, 1) }
    else if (rango === 'ytd')  { desde = new Date(ahora.getFullYear(), 0, 1) }
    else if (rango === 'custom' && customStart && customEnd) { desde = new Date(customStart) }
    else { desde = new Date(ahora.getFullYear(), ahora.getMonth() - 5, 1) }

    const hasta = rango === 'custom' && customEnd ? new Date(customEnd) : ahora

    const mesesObj: Record<string, { label: string; total: number; count: number }> = {}
    const cursor = new Date(desde.getFullYear(), desde.getMonth(), 1)
    while (cursor <= hasta) {
      const k = `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, '0')}`
      mesesObj[k] = {
        label: cursor.toLocaleDateString('es-MX', { month: 'short' }).replace('.', ''),
        total: 0,
        count: 0,
      }
      cursor.setMonth(cursor.getMonth() + 1)
    }

    let totalRango = 0, countRango = 0
    for (const n of data) {
      const f = new Date(n.fecha_inicio)
      if (f < desde || f > hasta) continue
      const k = `${f.getFullYear()}-${String(f.getMonth() + 1).padStart(2, '0')}`
      if (!mesesObj[k]) continue
      const monto = Number(n.total_nomina || 0)
      mesesObj[k].total += monto
      mesesObj[k].count++
      totalRango += monto
      countRango++
    }

    const mesesArr = Object.entries(mesesObj).map(([k, v]) => ({ key: k, ...v }))
    const max = Math.max(...mesesArr.map(m => m.total), 1)

    // Trending: compare last full month vs the month before it
    const filled = mesesArr.filter(m => m.total > 0)
    const lastMes = filled[filled.length - 1]?.total ?? 0
    const prevMes = filled[filled.length - 2]?.total ?? 0
    const trend = prevMes > 0 ? ((lastMes - prevMes) / prevMes) * 100 : null

    return { meses: mesesArr, max, total: totalRango, count: countRango, trend }
  }, [data, rango, customStart, customEnd])

  return (
    <div className="tile">
      <div className="flex items-start justify-between mb-5 flex-wrap gap-3">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <TrendingUp className="w-4 h-4 text-primary" />
            <h2 className="font-display font-semibold">Nóminas por mes</h2>
            {trend !== null && (
              <span className={`inline-flex items-center gap-0.5 text-[11px] font-semibold px-2 py-0.5 rounded-full ${
                trend > 0 ? 'bg-green-500/10 text-green-500' : trend < 0 ? 'bg-red-500/10 text-red-500' : 'bg-stone-100 text-stone-400'
              }`}>
                {trend > 0 ? <TrendingUp className="w-3 h-3" /> : trend < 0 ? <TrendingDown className="w-3 h-3" /> : <Minus className="w-3 h-3" />}
                {trend > 0 ? '+' : ''}{trend.toFixed(1)}% vs mes ant.
              </span>
            )}
          </div>
          <p className="text-xs" style={{ color: 'var(--tinta-500)' }}>
            <span className="font-mono font-semibold" style={{ color: 'var(--accent)' }}>{formatMXN(total)}</span>
            {' · '}{count} nómina(s) en el rango
            {totalPagado > 0 && <> · Pagado: <span className="font-semibold" style={{ color: 'var(--verde-ok)' }}>{formatMXN(totalPagado)}</span></>}
          </p>
        </div>
        <div className="flex items-center gap-1.5 flex-wrap">
          {RANGOS.map(r => (
            <button key={r.key} onClick={() => setRango(r.key)}
              className={`text-xs px-3 py-1.5 rounded-full font-medium transition-all ${
                rango === r.key ? 'text-white shadow-sm' : 'hover:bg-surface/80 border border-border backdrop-blur-sm'
              }`}
              style={rango === r.key ? { background: 'var(--primary)' } : { background: 'var(--surface-2)', color: 'var(--tinta-500)' }}
              >{r.label}</button>
          ))}
          <button onClick={() => setRango('custom')}
            className={`text-xs px-3 py-1.5 rounded-full font-medium transition-all flex items-center gap-1 ${
              rango === 'custom' ? 'text-white shadow-sm' : 'hover:bg-surface/80 border border-border backdrop-blur-sm'
            }`}
            style={rango === 'custom' ? { background: 'var(--primary)' } : { background: 'var(--surface-2)', color: 'var(--tinta-500)' }}
            >
            <Calendar className="w-3 h-3" /> Personalizado
          </button>
        </div>
      </div>

      {rango === 'custom' && (
        <div className="flex items-center gap-2 mb-4 flex-wrap text-xs">
          <input type="date" value={customStart} onChange={e => setCustomStart(e.target.value)} className="input max-w-[160px]" />
          <span className="text-stone-400">a</span>
          <input type="date" value={customEnd} onChange={e => setCustomEnd(e.target.value)} className="input max-w-[160px]" />
        </div>
      )}

      {meses.length === 0 ? (
        <div className="text-center py-12 text-stone-400 text-sm">Selecciona un rango válido</div>
      ) : (
        <div className="relative">
          <div className="flex items-end gap-2 h-48 overflow-x-auto pb-2">
            {meses.map((m, i) => {
              const altura = max > 0 ? (m.total / max) * 100 : 0
              const tieneData = m.total > 0
              return (
                <div key={m.key} className="flex-1 min-w-[40px] flex flex-col items-center gap-1.5 group">
                  <div className="relative w-full flex items-end h-40">
                    <div
                    className={`w-full rounded-t-lg transition-all duration-500 ${tieneData ? 'opacity-90 group-hover:opacity-100' : 'opacity-30'}`}
                    style={{
                      height: tieneData ? `${Math.max(altura, 3)}%` : '3%',
                      animationDelay: `${i * 50}ms`,
                      background: tieneData ? 'linear-gradient(to top, var(--bosque-500), var(--bosque-200))' : 'var(--surface-3)',
                    }}
                  >
                      {tieneData && (
                        <div className="absolute -top-7 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity text-[10px] font-mono px-2 py-0.5 rounded whitespace-nowrap pointer-events-none z-10" style={{ background: 'var(--tinta)', color: '#fff' }}>
                          {formatMXN(m.total)}
                        </div>
                      )}
                    </div>
                  </div>
                  <span className="text-[10px] font-semibold uppercase" style={{ color: 'var(--tinta-500)' }}>{m.label}</span>
                  {tieneData && <span className="text-[9px] font-mono" style={{ color: 'var(--bosque-500)' }}>{m.count}</span>}
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
