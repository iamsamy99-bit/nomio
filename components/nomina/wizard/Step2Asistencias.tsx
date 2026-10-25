'use client'
import { useMemo, useEffect, useState, useCallback } from 'react'
import { ArrowLeft, ArrowRight, Users, ExternalLink, CalendarDays, CheckCheck, Eraser, Zap } from 'lucide-react'
import Link from 'next/link'
import { useWizard } from './WizardContext'
import { formatMXN, hoyISO } from '@/lib/utils'
import { HORAS_JORNADA } from '@/lib/constants'
import { saveCelda } from '@/lib/payroll/wizard-autosave'
import type { Trabajador } from '@/types'

function getDatesInRange(start: string, end: string): string[] {
  const dates: string[] = []
  const cur = new Date(start + 'T12:00:00Z')
  const last = new Date(end + 'T12:00:00Z')
  while (cur <= last) {
    dates.push(cur.toISOString().slice(0, 10))
    cur.setUTCDate(cur.getUTCDate() + 1)
  }
  return dates
}

const DIAS_LABEL = ['LUN', 'MAR', 'MIE', 'JUE', 'VIE', 'SAB', 'DOM']
function getDayLabel(fecha: string): string {
  const d = new Date(fecha + 'T12:00:00Z')
  const dow = d.getUTCDay()
  return DIAS_LABEL[dow === 0 ? 6 : dow - 1]
}
function isWeekend(fecha: string): boolean {
  const dow = new Date(fecha + 'T12:00:00Z').getUTCDay()
  return dow === 0 || dow === 6
}
function dayNum(fecha: string): number {
  return new Date(fecha + 'T12:00:00Z').getUTCDate()
}
function formatHeaderRange(start: string, end: string): string {
  const s = new Date(start + 'T12:00:00Z')
  const e = new Date(end + 'T12:00:00Z')
  const mes = e.toLocaleDateString('es-MX', { month: 'short', timeZone: 'UTC' })
  return `${s.getUTCDate()}–${e.getUTCDate()} ${mes[0].toUpperCase() + mes.slice(1)}`
}
function initials(nombre: string): string {
  const parts = nombre.trim().split(/\s+/)
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase()
  return nombre.slice(0, 2).toUpperCase()
}
function cellStyle(h: number | null): React.CSSProperties {
  if (h === null) return { background: 'var(--surface-2)', color: 'var(--stone)', border: '1px dashed var(--border)' }
  if (h === 0) return { background: 'rgba(160,78,62,0.08)', color: 'var(--rojo-falta)', border: '1px solid rgba(160,78,62,0.25)' }
  if (h < 8) return { background: 'rgba(217,164,65,0.10)', color: 'var(--ambar)', border: '1px solid rgba(217,164,65,0.30)' }
  return { background: 'var(--bosque-50)', color: 'var(--bosque-600)', border: '1px solid var(--bosque-200)' }
}
function cellLabel(h: number | null): string {
  if (h === null) return '—'
  if (h === 0) return 'F'
  return h % 1 === 0 ? String(h) : h.toFixed(1)
}
function estimarPago(t: Trabajador, diasEfectivos: number, horas: number, totalDias: number): number {
  switch (t.modalidad_pago) {
    case 'por_dia':     return diasEfectivos * (t.tarifa_dia ?? 0)
    case 'por_hora':    return horas * (t.tarifa_hora ?? 0)
    case 'sueldo_fijo': return totalDias > 0 ? ((t.sueldo_fijo ?? 0) / totalDias) * diasEfectivos : 0
    case 'mixto':       return diasEfectivos * (t.tarifa_dia ?? 0) + horas * (t.tarifa_hora ?? 0)
    default:            return 0
  }
}

const PRESETS: { label: string; value: number | null }[] = [
  { label: 'Jornada (8h)', value: 8 },
  { label: '6 horas', value: 6 },
  { label: 'Medio día (4h)', value: 4 },
  { label: 'Falta', value: 0 },
  { label: 'Sin registro', value: null },
]

export default function Step2Asistencias() {
  const { state, dispatch, supabase, navigateToStep, stepIsValid } = useWizard()
  const [loading, setLoading] = useState(false)
  const [fetched, setFetched] = useState(false)
  const [activeFecha, setActiveFecha] = useState<string | null>(null)
  const [picker, setPicker] = useState<{ trabId: string; fecha: string; x: number; y: number } | null>(null)

  const dates = useMemo(
    () => (state.fechaInicio && state.fechaFin ? getDatesInRange(state.fechaInicio, state.fechaFin) : []),
    [state.fechaInicio, state.fechaFin]
  )

  useEffect(() => {
    if (dates.length > 0) {
      const hoy = hoyISO()
      setActiveFecha(dates.includes(hoy) ? hoy : dates[0])
    }
  }, [dates])

  const trabajadoresActivos = useMemo(
    () => state.trabajadores.filter(t => t.activo !== false),
    [state.trabajadores]
  )

  const setCelda = useCallback((trabId: string, fecha: string, horas: number | null) => {
    if (!state.nominaId || !state.empresaId || !state.proyectoId) return
    dispatch({ type: 'SET_HORAS_CELDA', trabId, fecha, horas })
    saveCelda(
      { nominaId: state.nominaId, empresaId: state.empresaId, proyectoId: state.proyectoId, trabajadorId: trabId, fecha, horas },
      supabase,
      dispatch
    )
  }, [state.nominaId, state.empresaId, state.proyectoId, supabase, dispatch])

  // Llenar todos los días laborables (lun-sab) de un trabajador con 8h
  const llenarSemana = useCallback((trabId: string) => {
    for (const d of dates) {
      if (!isWeekend(d)) setCelda(trabId, d, 8)
    }
  }, [dates, setCelda])

  // Marcar a todos presentes (8h) en un día
  const marcarDiaPresente = useCallback((fecha: string) => {
    for (const t of trabajadoresActivos) setCelda(t.id, fecha, 8)
  }, [trabajadoresActivos, setCelda])

  // Todos presentes en todos los días laborables
  const marcarTodoPresente = useCallback(() => {
    for (const t of trabajadoresActivos) for (const d of dates) if (!isWeekend(d)) setCelda(t.id, d, 8)
  }, [trabajadoresActivos, dates, setCelda])

  const limpiarTodo = useCallback(() => {
    for (const t of trabajadoresActivos) for (const d of dates) setCelda(t.id, d, null)
  }, [trabajadoresActivos, dates, setCelda])

  const setHorasExtra = useCallback(async (trabId: string, horas: number) => {
    const val = Math.max(0, horas)
    dispatch({ type: 'SET_HORAS_EXTRA', trabId, horas: val })
    if (!state.nominaId) return
    await supabase.from('lineas_nomina').upsert(
      { empresa_id: state.empresaId, nomina_id: state.nominaId, trabajador_id: trabId,
        horas_extra: val, horas_trabajadas: 0, dias_trabajados: 0,
        total_horas_extra: 0, subtotal: 0, descuentos: 0, total: 0 },
      { onConflict: 'nomina_id,trabajador_id' }
    )
  }, [state.nominaId, state.empresaId, supabase, dispatch])

  useEffect(() => {
    if (!state.proyectoId || !state.fechaInicio || !state.fechaFin || !state.empresaId || !state.nominaId) return
    let cancelled = false
    setFetched(false)
    setLoading(true)
    async function fetchAsistencias() {
      try {
        const { data } = await supabase
          .from('registros_asistencia')
          .select('trabajador_id, fecha, horas_calculadas')
          .eq('empresa_id', state.empresaId)
          .eq('proyecto_id', state.proyectoId)
          .gte('fecha', state.fechaInicio!)
          .lte('fecha', state.fechaFin!)
        if (!cancelled && data) {
          const patch: Record<string, Record<string, number | null>> = {}
          for (const r of data) {
            if (!patch[r.trabajador_id]) patch[r.trabajador_id] = {}
            patch[r.trabajador_id][r.fecha] = r.horas_calculadas ?? null
          }
          dispatch({ type: 'PATCH_HORAS_CELDA', patch })
        }
      } finally {
        if (!cancelled) { setLoading(false); setFetched(true) }
      }
    }
    fetchAsistencias()
    return () => { cancelled = true }
  }, [state.proyectoId, state.fechaInicio, state.fechaFin, state.empresaId, state.nominaId, supabase, dispatch])

  const workerStats = useMemo(() => {
    const map: Record<string, { dias: number; horas: number; estimado: number }> = {}
    for (const t of trabajadoresActivos) {
      const row = state.horasCelda[t.id] ?? {}
      let dias = 0, horas = 0, diasEfectivos = 0
      for (const h of Object.values(row)) {
        if (h !== null && h > 0) { dias++; horas += h; diasEfectivos += Math.min(h / HORAS_JORNADA, 1) }
      }
      map[t.id] = { dias, horas, estimado: estimarPago(t, diasEfectivos, horas, dates.length) }
    }
    return map
  }, [state.horasCelda, trabajadoresActivos, dates.length])

  const totalEst = Object.values(workerStats).reduce((s, w) => s + w.estimado, 0)
  const algunPresente = Object.values(workerStats).some(w => w.dias > 0)
  const canContinue = fetched && stepIsValid(2)
  const hasAnySaving = Object.values(state.savingCell).some(Boolean)
  const proyectoNombre = state.proyecto ? (state.proyecto as { nombre?: string }).nombre ?? '' : ''

  const openPicker = (e: React.MouseEvent, trabId: string, fecha: string) => {
    e.stopPropagation()
    setPicker({ trabId, fecha, x: e.clientX, y: e.clientY })
  }

  return (
    <div className="flex flex-col h-full" onClick={() => picker && setPicker(null)}>
      {/* Header */}
      <div className="shrink-0 px-5 py-3 border-b flex items-center justify-between gap-3"
        style={{ borderColor: 'var(--divider)', background: 'var(--surface)' }}>
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="font-display font-semibold text-sm sm:text-base" style={{ color: 'var(--ink)' }}>
              {proyectoNombre || 'Asistencias'}
            </h2>
            {state.fechaInicio && state.fechaFin && (
              <span className="text-xs font-medium" style={{ color: 'var(--stone)' }}>
                · {formatHeaderRange(state.fechaInicio, state.fechaFin)}
              </span>
            )}
            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border transition-colors ${
              state.saveError ? 'border-red-200 text-red-700 bg-red-50'
              : hasAnySaving ? 'border-amber-200 text-amber-600 bg-amber-50'
              : 'border-green-200 text-green-700 bg-green-50'
            }`}>
              {state.saveError ? 'Error al guardar' : hasAnySaving ? 'Guardando...' : 'Autoguardado'}
            </span>
          </div>
          <p className="text-xs mt-0.5" style={{ color: 'var(--stone)' }}>
            Toca una celda para elegir las horas o marca una falta.
          </p>
        </div>
        <Link href="/dashboard/asistencias" className="btn-secondary flex items-center gap-1.5 text-xs py-1.5 px-3 shrink-0">
          <ExternalLink className="w-3.5 h-3.5" /> Ver asistencias
        </Link>
      </div>

      {state.saveError && (
        <div className="shrink-0 px-5 py-2 text-xs font-medium border-b"
          style={{ background: 'rgba(160,78,62,0.08)', borderColor: 'rgba(160,78,62,0.25)', color: 'var(--rojo-falta)' }}>
          {state.saveError}
        </div>
      )}

      {/* Body */}
      {trabajadoresActivos.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center gap-3 py-16 text-stone-400">
          <Users className="w-12 h-12 opacity-30" />
          <p className="text-sm font-medium">Sin trabajadores asignados al proyecto</p>
          <p className="text-xs text-center max-w-xs">
            Agrega trabajadores a tu empresa o asígnalos al proyecto para poder registrar asistencias.
          </p>
          <Link href="/dashboard/trabajadores" className="btn-primary text-xs py-2 px-4">
            Ir a Trabajadores
          </Link>
        </div>
      ) : loading && !fetched ? (
        <div className="flex-1 flex items-center justify-center text-stone-400 text-sm">Cargando asistencias...</div>
      ) : (
        <div className="flex-1 overflow-auto p-3 sm:p-4">
          {/* Acciones masivas */}
          <div className="flex items-center gap-2 flex-wrap mb-3">
            <button onClick={marcarTodoPresente}
              className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full transition-colors"
              style={{ background: 'var(--bosque-50)', color: 'var(--bosque-600)', border: '1px solid var(--bosque-200)' }}>
              <CheckCheck className="w-3.5 h-3.5" /> Todos presentes (lun–sáb)
            </button>
            <button onClick={limpiarTodo}
              className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full transition-colors"
              style={{ background: 'var(--surface-2)', color: 'var(--stone)', border: '1px solid var(--border)' }}>
              <Eraser className="w-3.5 h-3.5" /> Limpiar
            </button>
          </div>

          {/* Desktop Table */}
          <div className="hidden md:block overflow-x-auto rounded-xl border" style={{ borderColor: 'var(--border)' }}>
            <table className="text-xs border-separate border-spacing-0 min-w-full">
              <thead>
                <tr style={{ background: 'var(--stone-bg)' }}>
                  <th className="sticky left-0 z-10 py-2.5 pl-3 pr-2 text-left font-semibold whitespace-nowrap border-b border-r"
                    style={{ background: 'var(--stone-bg)', borderColor: 'var(--border)', color: 'var(--ink)', minWidth: 180 }}>
                    Trabajador
                  </th>
                  {dates.map(d => (
                    <th key={d}
                      className={`px-1 py-1.5 text-center min-w-[46px] border-b uppercase tracking-wider ${isWeekend(d) ? 'opacity-40' : ''}`}
                      style={{ color: 'var(--stone)', borderColor: 'var(--border)', fontSize: 9 }}>
                      <div className="font-bold">{getDayLabel(d)}</div>
                      <div>{dayNum(d)}</div>
                      <button onClick={() => marcarDiaPresente(d)} title="Marcar a todos presentes este día"
                        className="mt-0.5 mx-auto block opacity-50 hover:opacity-100 transition-opacity">
                        <CheckCheck className="w-3 h-3" />
                      </button>
                    </th>
                  ))}
                  <th className="px-1 py-2.5 text-center font-semibold border-b border-l" style={{ color: 'var(--ink)', borderColor: 'var(--border)', minWidth: 60 }}>Extra</th>
                  <th className="px-2 py-2.5 text-right font-semibold border-b border-l" style={{ color: 'var(--ink)', borderColor: 'var(--border)', minWidth: 76 }}>Est.</th>
                </tr>
              </thead>
              <tbody>
                {trabajadoresActivos.map((t, idx) => {
                  const { estimado } = workerStats[t.id] ?? { estimado: 0 }
                  const extra = state.horasExtra[t.id]?.horas ?? 0
                  return (
                    <tr key={t.id} style={{ background: idx % 2 === 0 ? 'var(--surface)' : 'var(--table-alt)' }}>
                      <td className="sticky left-0 z-10 py-1.5 pl-3 pr-2 border-b border-r"
                        style={{ background: idx % 2 === 0 ? 'var(--surface)' : 'var(--stone-bg)', borderColor: 'var(--border)' }}>
                        <div className="flex items-center gap-2 min-w-[168px]">
                          <div className="w-7 h-7 rounded-lg flex items-center justify-center text-[10px] font-bold shrink-0"
                            style={{ background: 'var(--primary-glow)', color: 'var(--primary)' }}>
                            {initials(t.nombre)}
                          </div>
                          <span className="font-medium truncate max-w-[110px]" style={{ color: 'var(--ink)' }}>{t.nombre}</span>
                          <button onClick={() => llenarSemana(t.id)} title="Llenar semana laboral (8h lun–sáb)"
                            className="ml-auto opacity-40 hover:opacity-100 transition-opacity shrink-0">
                            <Zap className="w-3.5 h-3.5" style={{ color: 'var(--bosque-600)' }} />
                          </button>
                        </div>
                      </td>
                      {dates.map(d => {
                        const h = state.horasCelda[t.id]?.[d] ?? null
                        const isSaving = state.savingCell[`${t.id}:${d}`]
                        return (
                          <td key={d} className={`px-0.5 py-1 border-b ${isWeekend(d) ? 'opacity-60' : ''}`} style={{ borderColor: 'var(--border)' }}>
                            <button
                              onClick={e => openPicker(e, t.id, d)}
                              title={h === null ? 'Sin registro' : h === 0 ? 'Falta' : `${h}h`}
                              className={`w-[40px] h-[28px] rounded-lg flex items-center justify-center text-[11px] font-mono font-semibold mx-auto transition-all hover:opacity-75 cursor-pointer ${isSaving ? 'animate-pulse' : ''}`}
                              style={cellStyle(h)}>
                              {cellLabel(h)}
                            </button>
                          </td>
                        )
                      })}
                      <td className="px-1 py-1 border-b border-l" style={{ borderColor: 'var(--border)' }}>
                        <input type="number" min="0" step="0.5" value={extra || ''} placeholder="0"
                          onChange={e => setHorasExtra(t.id, parseFloat(e.target.value) || 0)}
                          className="w-12 h-7 text-center text-[11px] font-mono rounded-lg mx-auto block outline-none focus:ring-2"
                          style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', color: 'var(--tinta)' }} />
                      </td>
                      <td className="px-2 py-1 text-right font-mono text-[11px] border-b border-l" style={{ color: 'var(--primary)', borderColor: 'var(--border)' }}>
                        {estimado > 0 ? formatMXN(estimado) : <span style={{ color: 'var(--stone)' }}>—</span>}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
              {algunPresente && (
                <tfoot>
                  <tr style={{ background: 'var(--stone-bg)' }}>
                    <td className="sticky left-0 z-10 py-2.5 pl-3 pr-2 font-bold border-t border-r text-xs"
                      style={{ background: 'var(--stone-bg)', borderColor: 'var(--border)', color: 'var(--ink)' }}>
                      Total estimado
                    </td>
                    {dates.map(d => <td key={d} className="border-t" style={{ borderColor: 'var(--border)' }} />)}
                    <td className="border-t border-l" style={{ borderColor: 'var(--border)' }} />
                    <td className="px-2 py-2.5 text-right font-mono font-bold border-t border-l" style={{ borderColor: 'var(--border)', color: 'var(--primary)' }}>{formatMXN(totalEst)}</td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>

          {/* Mobile: modo enfocado por día */}
          <div className="md:hidden space-y-3">
            <div className="rounded-xl border p-3" style={{ background: 'var(--surface-2)', borderColor: 'var(--border)' }}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold flex items-center gap-1.5" style={{ color: 'var(--tinta-500)' }}>
                  <CalendarDays className="w-3.5 h-3.5" /> Día
                </span>
                {activeFecha && (
                  <button onClick={() => marcarDiaPresente(activeFecha)}
                    className="text-[10px] font-semibold px-2 py-1 rounded-lg flex items-center gap-1"
                    style={{ background: 'var(--bosque-50)', color: 'var(--bosque-600)' }}>
                    <CheckCheck className="w-3 h-3" /> Todos presentes
                  </button>
                )}
              </div>
              <div className="flex gap-1.5 overflow-x-auto pb-1">
                {dates.map(fecha => {
                  const esActivo = fecha === activeFecha
                  const tieneData = trabajadoresActivos.some(t => (state.horasCelda[t.id]?.[fecha] ?? null) !== null)
                  return (
                    <button key={fecha} type="button" onClick={() => setActiveFecha(fecha)}
                      className="flex-shrink-0 flex flex-col items-center gap-0.5 w-12 py-2 rounded-xl border transition-all"
                      style={{ background: esActivo ? 'var(--primary-glow)' : 'transparent', borderColor: esActivo ? 'var(--primary)' : 'var(--border)' }}>
                      <span className="text-[9px] uppercase font-bold" style={{ color: esActivo ? 'var(--primary)' : 'var(--tinta-500)' }}>{getDayLabel(fecha)}</span>
                      <span className="text-sm font-extrabold" style={{ color: esActivo ? 'var(--primary)' : 'var(--tinta)' }}>{dayNum(fecha)}</span>
                      {tieneData && <span className="w-1 h-1 rounded-full" style={{ background: 'var(--verde-ok)' }} />}
                    </button>
                  )
                })}
              </div>
            </div>

            <div className="space-y-2">
              {trabajadoresActivos.map(t => {
                const { estimado } = workerStats[t.id] ?? { estimado: 0 }
                const h = activeFecha ? (state.horasCelda[t.id]?.[activeFecha] ?? null) : null
                const extra = state.horasExtra[t.id]?.horas ?? 0
                return (
                  <div key={t.id} className="tile p-3 flex flex-col gap-2.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold shrink-0"
                          style={{ background: 'var(--primary-glow)', color: 'var(--primary)' }}>{initials(t.nombre)}</div>
                        <p className="font-semibold text-sm truncate" style={{ color: 'var(--tinta)' }}>{t.nombre}</p>
                      </div>
                      <p className="text-xs font-bold font-mono shrink-0 ml-2" style={{ color: estimado > 0 ? 'var(--primary)' : 'var(--tinta-300)' }}>
                        {estimado > 0 ? formatMXN(estimado) : '--'}
                      </p>
                    </div>
                    {/* Presets grandes para el día activo */}
                    <div className="grid grid-cols-4 gap-1.5">
                      {[{ l: '8h', v: 8 }, { l: '4h', v: 4 }, { l: 'Falta', v: 0 }, { l: '—', v: null }].map(opt => {
                        const sel = h === opt.v
                        return (
                          <button key={opt.l} type="button"
                            onClick={() => activeFecha && setCelda(t.id, activeFecha, opt.v)}
                            className="py-2 rounded-lg text-xs font-bold border transition-all"
                            style={sel ? cellStyle(opt.v) : { background: 'var(--surface)', color: 'var(--tinta-500)', borderColor: 'var(--border)' }}>
                            {opt.l}
                          </button>
                        )
                      })}
                    </div>
                    <div className="flex items-center justify-between gap-2 pt-0.5">
                      <span className="text-[11px] font-medium" style={{ color: 'var(--tinta-500)' }}>Horas extra</span>
                      <input type="number" min="0" step="0.5" value={extra || ''} placeholder="0"
                        onChange={e => setHorasExtra(t.id, parseFloat(e.target.value) || 0)}
                        className="w-16 h-8 text-center text-xs font-mono rounded-lg outline-none focus:ring-2"
                        style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', color: 'var(--tinta)' }} />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Leyenda */}
          <div className="mt-3 flex items-center flex-wrap gap-4 text-[10px] uppercase tracking-wide font-semibold" style={{ color: 'var(--stone)' }}>
            <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded inline-block" style={{ background: 'var(--bosque-50)', border: '1px solid var(--bosque-200)' }} /> 8h Completo</span>
            <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded inline-block" style={{ background: 'rgba(217,164,65,0.10)', border: '1px solid rgba(217,164,65,0.30)' }} /> &lt;8h Parcial</span>
            <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded inline-block" style={{ background: 'rgba(160,78,62,0.08)', border: '1px solid rgba(160,78,62,0.25)' }} /> Falta</span>
            <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded inline-block" style={{ background: 'var(--surface-2)', border: '1px dashed var(--border)' }} /> Sin registro</span>
          </div>
        </div>
      )}

      {/* Picker popover (desktop) */}
      {picker && (
        <div
          className="fixed z-50 rounded-xl border shadow-xl p-1.5 min-w-[150px] animate-scale-in"
          style={{ left: Math.min(picker.x, (typeof window !== 'undefined' ? window.innerWidth : 9999) - 170), top: picker.y + 8, background: 'var(--surface)', borderColor: 'var(--border)', boxShadow: '0 12px 40px rgba(0,0,0,0.18)' }}
          onClick={e => e.stopPropagation()}
        >
          {PRESETS.map(p => (
            <button key={p.label}
              onClick={() => { setCelda(picker.trabId, picker.fecha, p.value); setPicker(null) }}
              className="w-full flex items-center gap-2 text-left text-xs font-medium px-2.5 py-2 rounded-lg transition-colors hover:bg-[var(--table-hover,rgba(0,0,0,0.04))]"
              style={{ color: 'var(--tinta)' }}>
              <span className="w-4 h-4 rounded inline-block shrink-0" style={cellStyle(p.value)} />
              {p.label}
            </button>
          ))}
        </div>
      )}

      {/* Footer nav */}
      <div className="shrink-0 flex items-center justify-between px-5 py-3.5 border-t gap-3"
        style={{ borderColor: 'var(--divider)', background: 'var(--surface)' }}>
        <button onClick={() => navigateToStep(1)} className="btn-secondary flex items-center gap-1.5">
          <ArrowLeft className="w-4 h-4" /> Anterior
        </button>
        <div className="flex items-center gap-3">
          {fetched && !algunPresente && (
            <span className="text-xs font-medium" style={{ color: 'rgb(180,83,9)' }}>Registra asistencias primero</span>
          )}
          <button onClick={() => navigateToStep(3)} disabled={!canContinue}
            className="btn-primary flex items-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed">
            Siguiente <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  )
}
