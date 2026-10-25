'use client'
import { useEffect, useState, useCallback, useMemo, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useEmpresa } from '@/components/layout/EmpresaContext'
import { CalendarDays, Save, ChevronLeft, ChevronRight, Wifi, WifiOff, RefreshCw, Zap, AlertCircle, Check, Plus, Sparkles, Loader2, XCircle } from 'lucide-react'
import Link from 'next/link'
import { formatMXN, hoyISO as hoyLocalISO, toISOLocal } from '@/lib/utils'
import { HORAS_JORNADA } from '@/lib/constants'
import { esDiaFestivo } from '@/lib/dias-festivos'
import { saveAsistencia, flushAsistencias, getPendientes } from '@/lib/asistencias-offline-store'
import { draftKey, loadDraft, saveDraft, clearDraft, pruneDrafts } from '@/lib/asistencias-draft'
import type { Trabajador, Proyecto, Empresa } from '@/types'

const DIAS_LABEL = ['LUN', 'MAR', 'MIE', 'JUE', 'VIE', 'SAB', 'DOM']

function getDayLabel(d: Date): string {
  const dow = d.getDay() // 0 = domingo
  return DIAS_LABEL[dow === 0 ? 6 : dow - 1]
}

function getLunesDeHoy(): string {
  const hoy = new Date()
  const day = hoy.getDay()
  const lunes = new Date(hoy)
  lunes.setDate(hoy.getDate() - (day === 0 ? 6 : day - 1))
  return toISOLocal(lunes)
}

function addDays(isoDate: string, n: number): string {
  const d = new Date(isoDate + 'T00:00:00')
  d.setDate(d.getDate() + n)
  return toISOLocal(d)
}

function getDiasArray(inicio: string, fin: string): Date[] {
  const result: Date[] = []
  const current = new Date(inicio + 'T00:00:00')
  const last = new Date(fin + 'T00:00:00')
  while (current <= last && result.length < 31) {
    result.push(new Date(current))
    current.setDate(current.getDate() + 1)
  }
  return result
}

function calcPago(
  t: Trabajador,
  diasEfectivos: number,
  diasPresente: number,
  horasTotales: number,
  totalDias: number,
): number {
  if (diasPresente === 0 && horasTotales === 0) return 0
  switch (t.modalidad_pago) {
    case 'por_dia':     return diasEfectivos * (t.tarifa_dia || 0)
    case 'por_hora':    return horasTotales * (t.tarifa_hora || 0)
    case 'sueldo_fijo': return totalDias > 0 ? ((t.sueldo_fijo || 0) / totalDias) * diasEfectivos : 0
    case 'mixto':       return diasEfectivos * (t.tarifa_dia || 0) + horasTotales * (t.tarifa_hora || 0)
    default: return 0
  }
}

export default function AsistenciasPage() {
  const router = useRouter()
  const supabase = useMemo(() => createClient(), [])
  const { empresaId, empresa } = useEmpresa()
  const [proyectos, setProyectos] = useState<Proyecto[]>([])
  const [trabajadores, setTrabajadores] = useState<Trabajador[]>([])
  const [proyectoId, setProyectoId] = useState('')

  // Rango de fechas
  const [fechaInicio, setFechaInicio] = useState<string>(() => getLunesDeHoy())
  const [fechaFin, setFechaFin] = useState<string>(() => addDays(getLunesDeHoy(), 6))

  // horasCelda[trabajadorId][fecha] = horas | null
  // null = sin registrar, 0 = ausente, >0 = horas trabajadas ese dia
  const [horasCelda, setHorasCelda] = useState<Record<string, Record<string, number | null>>>({})

  const [activeFecha, setActiveFecha] = useState<string>('')

  const [loading, setLoading] = useState(true)
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const [saveError, setSaveError] = useState('')
  const saving = saveState === 'saving'
  const [generandoNomina, setGenerandoNomina] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [isOnline, setIsOnline] = useState(true)
  const [pendientesCount, setPendientesCount] = useState(0)
  const [syncMsg, setSyncMsg] = useState('')
  const [solapadaId, setSolapadaId] = useState<string | null>(null)
  const [flashCells, setFlashCells] = useState<Set<string>>(new Set())
  const [periodoId, setPeriodoId] = useState('')
  const [periodosDisp, setPeriodosDisp] = useState<{
    id: string
    numero_nomina: number
    fecha_inicio: string
    fecha_fin: string
    estado: string
  }[]>([])

  // Array de dias derivado del rango (max 31)
  const dias = useMemo(() => getDiasArray(fechaInicio, fechaFin), [fechaInicio, fechaFin])

  // Borrador local: persiste ediciones sin guardar (cerrar la app no las pierde)
  const editedRef = useRef(false)
  const draftTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const dKey = proyectoId ? draftKey(proyectoId, fechaInicio, fechaFin) : ''

  useEffect(() => { pruneDrafts() }, [])

  useEffect(() => {
    if (!editedRef.current || !dKey) return
    if (draftTimer.current) clearTimeout(draftTimer.current)
    draftTimer.current = setTimeout(() => saveDraft(dKey, horasCelda), 400)
    return () => { if (draftTimer.current) clearTimeout(draftTimer.current) }
  }, [horasCelda, dKey])

  useEffect(() => {
    if (dias.length > 0) {
      const todayISO = hoyLocalISO()
      const hasActive = dias.some(d => toISOLocal(d) === activeFecha)
      if (!activeFecha || !hasActive) {
        const hasToday = dias.some(d => toISOLocal(d) === todayISO)
        setActiveFecha(hasToday ? todayISO : toISOLocal(dias[0]))
      }
    }
  }, [dias, activeFecha])

  // Navegar semana anterior / siguiente
  const clearSolapada = () => { setSolapadaId(null); setSyncMsg('') }

  const irSemanaAnterior = () => {
    clearSolapada()
    setFechaInicio(prev => addDays(prev, -7))
    setFechaFin(prev => addDays(prev, -7))
  }
  const irSemanaSiguiente = () => {
    clearSolapada()
    setFechaInicio(prev => addDays(prev, 7))
    setFechaFin(prev => addDays(prev, 7))
  }
  const irEstaeSemana = () => {
    clearSolapada()
    const lunes = getLunesDeHoy()
    setFechaInicio(lunes)
    setFechaFin(addDays(lunes, 6))
  }

  useEffect(() => {
    const update = () => setIsOnline(navigator.onLine)
    window.addEventListener('online', update)
    window.addEventListener('offline', update)
    update()
    return () => {
      window.removeEventListener('online', update)
      window.removeEventListener('offline', update)
    }
  }, [])

  const handleFlush = useCallback(async (silent = false) => {
    const pendientes = await getPendientes()
    if (pendientes.length === 0) return
    if (!silent) setSyncing(true)
    const result = await flushAsistencias(supabase as unknown as Parameters<typeof flushAsistencias>[0])
    const p = await getPendientes()
    setPendientesCount(p.length)
    if (!silent) {
      setSyncMsg(result.fail > 0
        ? `Sincronizados: ${result.ok} OK · ${result.fail} fallidos (se reintentaran automaticamente)`
        : `Sincronizados: ${result.ok} registro${result.ok !== 1 ? 's' : ''}`)
      setSyncing(false)
      setTimeout(() => setSyncMsg(''), 4000)
    }
  }, [supabase])

  useEffect(() => { if (isOnline) handleFlush(true) }, [isOnline, handleFlush])

  const refreshPendientes = useCallback(async () => {
    const p = await getPendientes()
    setPendientesCount(p.length)
  }, [])

  useEffect(() => { refreshPendientes() }, [refreshPendientes])

  useEffect(() => {
    if (!proyectoId || !empresaId) { setPeriodosDisp([]); setPeriodoId(''); return }
    supabase
      .from('periodos_nomina')
      .select('id, numero_nomina, fecha_inicio, fecha_fin, estado')
      .eq('empresa_id', empresaId)
      .eq('proyecto_id', proyectoId)
      .order('fecha_inicio', { ascending: false })
      .then(({ data }) => {
        setPeriodosDisp(data || [])
        setPeriodoId('')
      })
  }, [proyectoId, empresaId, supabase])

  const loadData = useCallback(async () => {
    try {
      const { data: p } = await supabase.from('proyectos').select('*')
        .eq('empresa_id', empresaId).eq('activo', true).order('nombre')
      setProyectos(p || [])
      if (p?.length) setProyectoId(p[0].id)
    } catch (err) {
      console.error('Error cargando asistencias:', err)
    } finally {
      setLoading(false)
    }
  }, [supabase, empresaId])

  useEffect(() => { loadData() }, [loadData])

  const loadTrabajadoresYAsistencias = useCallback(async () => {
    if (!empresaId || !proyectoId) return

    const [{ data: ts }, { data: regs }, { data: pts }] = await Promise.all([
      supabase.from('trabajadores').select('*')
        .eq('empresa_id', empresaId).eq('activo', true).order('nombre'),
      supabase.from('registros_asistencia').select('*')
        .eq('empresa_id', empresaId).eq('proyecto_id', proyectoId)
        .gte('fecha', fechaInicio).lte('fecha', fechaFin),
      supabase.from('proyecto_trabajadores').select('trabajador_id')
        .eq('proyecto_id', proyectoId),
    ])

    const allWorkers = ts || []
    let filteredWorkers: Trabajador[]
    if (pts && pts.length > 0) {
      const ids = new Set(pts.map((r: { trabajador_id: string }) => r.trabajador_id))
      filteredWorkers = allWorkers.filter(t => ids.has(t.id))
    } else {
      filteredWorkers = allWorkers
    }
    setTrabajadores(filteredWorkers)

    const mapa: Record<string, Record<string, number | null>> = {}
    for (const r of regs || []) {
      if (!mapa[r.trabajador_id]) mapa[r.trabajador_id] = {}
      if (r.asistio) {
        // Si hay horas registradas las usamos, si no defaulteamos a jornada completa
        mapa[r.trabajador_id][r.fecha] = r.horas_calculadas > 0 ? Number(r.horas_calculadas) : HORAS_JORNADA
      } else {
        mapa[r.trabajador_id][r.fecha] = 0
      }
    }

    // Restaurar borrador local: ediciones sin guardar de una sesion anterior
    // pisan lo que vino de la DB (son mas recientes).
    const draft = loadDraft(draftKey(proyectoId, fechaInicio, fechaFin))
    if (draft) {
      for (const [trabId, celdas] of Object.entries(draft.horasCelda)) {
        if (!mapa[trabId]) mapa[trabId] = {}
        for (const [fecha, horas] of Object.entries(celdas)) mapa[trabId][fecha] = horas
      }
      setSyncMsg('Se restauraron cambios sin guardar de una sesion anterior. Presiona Guardar para confirmarlos.')
      setTimeout(() => setSyncMsg(''), 8000)
    }
    editedRef.current = false
    setHorasCelda(mapa)
  }, [empresaId, proyectoId, fechaInicio, fechaFin, supabase])

  useEffect(() => {
    if (proyectoId && empresaId) loadTrabajadoresYAsistencias()
  }, [proyectoId, empresaId, loadTrabajadoresYAsistencias])

  const setCelda = (trabId: string, fecha: string, valor: number | null) => {
    editedRef.current = true
    setHorasCelda(prev => ({
      ...prev,
      [trabId]: { ...(prev[trabId] || {}), [fecha]: valor },
    }))
    const key = `${trabId}:${fecha}`
    setFlashCells(prev => new Set(prev).add(key))
    setTimeout(() => setFlashCells(prev => { const s = new Set(prev); s.delete(key); return s }), 400)
  }

  const getDiasPresente = (trabId: string) =>
    dias.filter(d => {
      const h = horasCelda[trabId]?.[toISOLocal(d)] ?? null
      return h !== null && h > 0
    }).length

  const getHorasTotales = (trabId: string) =>
    dias.reduce((s, d) => {
      const h = horasCelda[trabId]?.[toISOLocal(d)] ?? null
      return s + (h !== null && h > 0 ? h : 0)
    }, 0)

  // Jornadas equivalentes: un día de 4h sobre 8h cuenta 0.5 (cap 1 por día).
  const getDiasEfectivos = (trabId: string) =>
    dias.reduce((s, d) => {
      const h = horasCelda[trabId]?.[toISOLocal(d)] ?? null
      return s + (h !== null && h > 0 ? Math.min(h / HORAS_JORNADA, 1) : 0)
    }, 0)

  const handleSave = async (): Promise<boolean> => {
    setSaveState('saving')
    setSaveError('')

    type RegistroRow = {
      empresa_id: string
      proyecto_id: string
      trabajador_id: string
      fecha: string
      asistio: boolean
      horas_calculadas: number
      periodo_nomina_id: string | null
    }
    const registros: RegistroRow[] = []

    for (const t of trabajadores) {
      for (const d of dias) {
        const fecha = toISOLocal(d)
        const horas = horasCelda[t.id]?.[fecha] ?? null
        if (horas === null) continue
        registros.push({
          empresa_id: empresaId,
          proyecto_id: proyectoId,
          trabajador_id: t.id,
          fecha,
          asistio: horas > 0,
          horas_calculadas: horas,
          periodo_nomina_id: periodoId || null,
        })
      }
    }

    const encolarOffline = async (regs: RegistroRow[]) => {
      for (const r of regs) {
        await saveAsistencia({
          empresaId: r.empresa_id,
          trabajadorId: r.trabajador_id,
          proyectoId: r.proyecto_id,
          estado: r.asistio ? 'presente' : 'ausente',
          fecha: r.fecha,
          horasCalculadas: r.horas_calculadas,
          periodoNominaId: r.periodo_nomina_id,
        })
      }
    }

    const marcarGuardado = () => {
      if (dKey) clearDraft(dKey)
      editedRef.current = false
      setSaveState('saved')
      setTimeout(() => setSaveState('idle'), 2000)
    }

    try {
      if (isOnline) {
        if (registros.length > 0) {
          const { error } = await supabase.from('registros_asistencia')
            .upsert(registros, { onConflict: 'proyecto_id,trabajador_id,fecha' })
          if (error) throw new Error(error.message)
        }
      } else {
        await encolarOffline(registros)
        refreshPendientes()
      }
      marcarGuardado()
      return true
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : ''
      // navigator.onLine puede mentir (wifi cautivo, senal debil de obra):
      // si el fallo es de red, encolamos offline en vez de perder el guardado.
      if (/failed to fetch|network|load failed|fetch failed/i.test(msg) && registros.length > 0) {
        try {
          await encolarOffline(registros)
          refreshPendientes()
          marcarGuardado()
          setSyncMsg('Sin conexion estable: guardado en este dispositivo, se sincronizara automaticamente.')
          setTimeout(() => setSyncMsg(''), 6000)
          return true
        } catch { /* cae al error generico */ }
      }
      setSaveError(msg || 'Error al guardar. Intenta de nuevo.')
      setSaveState('error')
      return false
    }
  }

  // Genera una nomina nueva en base a las horas registradas en el rango actual.
  // Guarda primero para asegurar que los datos en DB esten al dia, luego llama
  // a /api/nomina/from-asistencias que lee registros_asistencia.asistio + horas_calculadas.
  const handleGenerarNomina = async () => {
    if (!proyectoId) return
    if (!isOnline) {
      setSyncMsg('Necesitas conexión para generar la nómina. Tus asistencias quedan guardadas en este dispositivo.')
      setTimeout(() => setSyncMsg(''), 6000)
      return
    }
    setGenerandoNomina(true)

    // 1. Guardar asistencias actuales antes de generar. Si el guardado falla,
    // NO generamos: la nomina saldria con datos viejos de la base.
    const guardadoOk = await handleSave()
    if (!guardadoOk) {
      setGenerandoNomina(false)
      return
    }

    // 2. Llamar endpoint
    const res = await fetch('/api/nomina/from-asistencias', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ proyectoId, fechaInicio, fechaFin }),
    })
    const data = await res.json()

    setGenerandoNomina(false)

    if (res.status === 409) {
      setSyncMsg(`Ya existe la nómina #${String(data.solapada?.numero_nomina).padStart(3, '0')} (${data.solapada?.fecha_inicio} – ${data.solapada?.fecha_fin})`)
      setSolapadaId(data.solapadaId ?? null)
      return
    }

    if (!res.ok) {
      setSyncMsg(`Error al generar nómina: ${data.error}`)
      setTimeout(() => setSyncMsg(''), 5000)
      return
    }

    // 3. Redirigir a la nomina creada
    router.push(`/dashboard/nomina/${data.nominaId}`)
  }

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-6 h-6 border-2 border-navy-200 border-t-primary rounded-full animate-spin" />
    </div>
  )

  const totalPago = trabajadores.reduce((s, t) => s + calcPago(t, getDiasEfectivos(t.id), getDiasPresente(t.id), getHorasTotales(t.id), dias.length), 0)
  const algunPresente = trabajadores.some(t => getDiasPresente(t.id) > 0)
  const hoyISO = hoyLocalISO()

  return (
    <div className="max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-display text-2xl font-bold">Asistencias</h1>
            {isOnline
              ? <span className="flex items-center gap-1 text-xs font-medium" style={{ color: 'var(--verde-ok)' }}><Wifi className="w-3.5 h-3.5" />Online</span>
              : <span className="flex items-center gap-1 text-xs font-medium" style={{ color: 'var(--ambar)' }}><WifiOff className="w-3.5 h-3.5" />Offline</span>
            }
          </div>

          {/* Navegacion de rango */}
          <div className="flex items-center gap-1.5 mt-2 flex-wrap">
            <button onClick={irSemanaAnterior} className="p-1.5 rounded-lg hover:bg-surface/70 border border-border backdrop-blur-sm" title="Semana anterior">
              <ChevronLeft className="w-4 h-4" />
            </button>
            <div className="flex items-center gap-1.5">
              <input
                type="date"
                value={fechaInicio}
                max={fechaFin}
                onChange={e => { clearSolapada(); setFechaInicio(e.target.value) }}
                className="input py-1 px-2 text-sm w-36"
              />
              <span className="text-sm" style={{ color: 'var(--tinta-500)' }}>al</span>
              <input
                type="date"
                value={fechaFin}
                min={fechaInicio}
                onChange={e => { clearSolapada(); setFechaFin(e.target.value) }}
                className="input py-1 px-2 text-sm w-36"
              />
            </div>
            <button onClick={irSemanaSiguiente} className="p-1.5 rounded-lg hover:bg-surface/70 border border-border backdrop-blur-sm" title="Semana siguiente">
              <ChevronRight className="w-4 h-4" />
            </button>
            <button onClick={irEstaeSemana} className="text-xs hover:underline font-semibold px-1" style={{ color: 'var(--primary)' }}>
              Esta semana
            </button>
            <span className="text-xs" style={{ color: 'var(--tinta-500)' }}>{dias.length} dia{dias.length !== 1 ? 's' : ''}</span>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <select value={proyectoId} onChange={e => setProyectoId(e.target.value)} className="input max-w-xs text-sm">
            {proyectos.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
          </select>
          <select
            value={periodoId}
            onChange={e => setPeriodoId(e.target.value)}
            className="input max-w-xs text-sm"
            disabled={!proyectoId}
          >
            <option value="">Sin periodo</option>
            {periodosDisp.map(per => {
              const inicio = new Date(per.fecha_inicio + 'T00:00:00').toLocaleDateString('es-MX', { day: '2-digit', month: 'short' })
              const fin = new Date(per.fecha_fin + 'T00:00:00').toLocaleDateString('es-MX', { day: '2-digit', month: 'short' })
              const num = String(per.numero_nomina).padStart(3, '0')
              return (
                <option key={per.id} value={per.id}>
                  #{num} - {inicio}-{fin} ({per.estado})
                </option>
              )
            })}
          </select>
          {pendientesCount > 0 && isOnline && (
            <button onClick={() => handleFlush()} disabled={syncing}
              className="btn-secondary flex items-center gap-1.5 text-xs py-1.5 text-amber-700 border-amber-300">
              <RefreshCw className={`w-3.5 h-3.5 ${syncing ? 'animate-spin' : ''}`} />
              {pendientesCount} pendientes
            </button>
          )}
          <button
            onClick={handleSave}
            disabled={saving}
            className="btn-secondary flex items-center gap-2 transition-colors"
            style={
              saveState === 'saved' ? { color: 'var(--bosque-600)', borderColor: 'var(--bosque-300)', background: 'var(--bosque-50)' } :
              saveState === 'error' ? { color: 'var(--rojo-falta)', borderColor: 'rgba(160,78,62,0.35)' } : {}
            }
          >
            {saveState === 'saving' && <Loader2 className="w-4 h-4 animate-spin" />}
            {saveState === 'saved'  && <Check className="w-4 h-4" />}
            {saveState === 'error'  && <AlertCircle className="w-4 h-4" />}
            {saveState === 'idle'   && <Save className="w-4 h-4" />}
            {saveState === 'saving' ? 'Guardando...' : saveState === 'saved' ? 'Guardado' : saveState === 'error' ? 'Error' : 'Guardar'}
          </button>
          <button
            onClick={handleGenerarNomina}
            disabled={!algunPresente || generandoNomina || saving}
            className="btn-primary flex items-center gap-2"
            title="Guarda las asistencias y genera un periodo de nomina con los dias y horas registrados"
          >
            <Sparkles className="w-4 h-4" />
            {generandoNomina ? 'Generando...' : 'Generar nómina'}
          </button>
        </div>
      </div>

      {/* Mensajes */}
      {saveState === 'error' && (
        <div className="flex items-center gap-2 text-sm p-3 mb-4 rounded-xl animate-fade-in" style={{ background: 'rgba(160,78,62,0.07)', border: '1px solid rgba(160,78,62,0.25)', color: 'var(--rojo-falta)' }}>
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span className="flex-1">{saveError || 'Error al guardar. Intenta de nuevo.'}</span>
          <button onClick={handleSave} className="text-xs font-semibold underline shrink-0" style={{ color: 'var(--rojo-falta)' }}>Reintentar</button>
          <button onClick={() => setSaveState('idle')} className="shrink-0 opacity-50 hover:opacity-100 transition-opacity" style={{ color: 'var(--rojo-falta)' }}>
            <XCircle className="w-4 h-4" />
          </button>
        </div>
      )}
      {syncMsg && (
        <div className="flex items-center gap-2 text-sm p-3 mb-4 animate-fade-in rounded-xl" style={{ background: solapadaId ? 'rgba(217,164,65,0.08)' : 'var(--bosque-50)', border: solapadaId ? '1px solid rgba(217,164,65,0.30)' : '1px solid rgba(58,78,46,0.18)', color: solapadaId ? 'var(--tinta-700)' : 'var(--bosque-500)' }}>
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span className="flex-1">{syncMsg}</span>
          {solapadaId && (
            <Link href={`/dashboard/nomina/${solapadaId}`} className="shrink-0 text-xs font-semibold underline whitespace-nowrap">
              Ver nómina →
            </Link>
          )}
        </div>
      )}
      {!isOnline && (
        <div className="flex items-center gap-2 tile-stone text-sm p-3 mb-4">
          <AlertCircle className="w-4 h-4 shrink-0 text-amber-700" />
          <span className="text-ink">Modo offline - los cambios se sincronizan al volver la conexion.</span>
        </div>
      )}

      {/* Leyenda */}
      <div className="flex items-center gap-4 text-xs mb-3" style={{ color: 'var(--tinta-500)' }}>
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-3 h-3 rounded" style={{ background: 'var(--bosque-50)', border: '1px solid var(--bosque-200)' }} />
          Horas trabajadas (mayor a 0)
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-3 h-3 rounded" style={{ background: 'rgba(160,78,62,0.08)', border: '1px solid rgba(160,78,62,0.25)' }} />
          Ausente (0 horas)
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-3 h-3 rounded" style={{ background: 'var(--surface-2)', border: '1px solid var(--border-bright)' }} />
          Sin registrar
        </span>
        <span className="hidden sm:inline">
          · <Check className="w-3 h-3 inline" /> = jornada completa ({HORAS_JORNADA}h)
        </span>
      </div>

      {/* Tabla (desktop y mobile con scroll horizontal) */}
      <div className="hidden md:block tile p-0 overflow-x-auto mb-4">
        <table className="w-full text-sm">
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border)', background: 'var(--surface-2)' }}>
              <th className="text-left py-3 px-4 font-semibold w-44 min-w-[160px]" style={{ color: 'var(--tinta)' }}>Trabajador</th>
              {dias.map((d, i) => {
                const fecha = toISOLocal(d)
                const esHoy = fecha === hoyISO
                const esFestivo = esDiaFestivo(fecha)
                const label = getDayLabel(d)
                return (
                  <th key={i}
                    className={`text-center py-3 px-1 text-xs font-semibold min-w-[60px] ${esFestivo ? 'bg-amber-50' : ''}`}
                    style={{ color: esHoy ? 'var(--primary)' : 'var(--tinta-500)' }}
                  >
                    <span className="block font-normal" style={{ color: esHoy ? 'var(--primary)' : 'var(--tinta-500)', fontWeight: esHoy ? 600 : 400 }}>{label}</span>
                    <span className={esHoy ? 'underline decoration-dotted' : ''}>{d.getDate()}/{d.getMonth() + 1}</span>
                    {esFestivo && <span className="block text-[9px] font-semibold leading-none mt-0.5" style={{ color: 'var(--ambar)' }}>fest.</span>}
                  </th>
                )
              })}
              <th className="text-center py-3 px-2 text-xs font-semibold min-w-[48px]" style={{ color: 'var(--tinta-500)' }}>Dias</th>
              <th className="text-center py-3 px-2 text-xs font-semibold min-w-[48px]" style={{ color: 'var(--tinta-500)' }}>Horas</th>
              <th className="text-right py-3 px-4 text-xs font-semibold min-w-[80px]" style={{ color: 'var(--tinta-500)' }}>Pago est.</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-200/40">
            {trabajadores.map(t => {
              const diasPresente = getDiasPresente(t.id)
              const horasTotales = getHorasTotales(t.id)
              const pago = calcPago(t, getDiasEfectivos(t.id), diasPresente, horasTotales, dias.length)
              return (
                <tr key={t.id} className="hover:bg-surface/30 transition-colors">
                  <td className="py-2 px-4">
                    <p className="font-medium text-sm leading-tight" style={{ color: 'var(--tinta)' }}>{t.nombre}</p>
                    <p className="text-xs" style={{ color: 'var(--tinta-500)' }}>{t.modalidad_pago?.replace(/_/g, ' ')}</p>
                  </td>
                  {dias.map(d => {
                    const fecha = toISOLocal(d)
                    const horas = horasCelda[t.id]?.[fecha] ?? null
                    const esFestivo = esDiaFestivo(fecha)
                    const esHoy = fecha === hoyISO

                    let cellBg = 'var(--surface-2)'
                    let cellBorder = 'var(--border-bright)'
                    let cellColor = 'var(--tinta-500)'
                    if (horas !== null && horas > 0) {
                      cellBg = 'var(--bosque-50)'; cellBorder = 'var(--bosque-200)'; cellColor = 'var(--bosque-600)'
                    } else if (horas === 0) {
                      cellBg = 'rgba(160,78,62,0.08)'; cellBorder = 'rgba(160,78,62,0.25)'; cellColor = 'var(--rojo-falta)'
                    }

                    const isFlashing = flashCells.has(`${t.id}:${fecha}`)
                    return (
                      <td key={fecha} className={`py-2 px-1 text-center ${esFestivo ? 'bg-amber-50/50' : ''}`}>
                        <div className="flex flex-col items-center gap-0.5">
                          <div
                            className={`flex items-center rounded border transition-all duration-150 ${esHoy ? 'ring-1 ring-offset-0' : ''} ${isFlashing ? 'scale-110 ring-2' : ''}`}
                            style={{ background: isFlashing ? 'var(--bosque-100)' : cellBg, borderColor: isFlashing ? 'var(--bosque-400)' : cellBorder, ...(esHoy ? { '--tw-ring-color': 'var(--primary)' } as React.CSSProperties : {}), ...(isFlashing ? { '--tw-ring-color': 'var(--bosque-400)' } as React.CSSProperties : {}) }}
                          >
                            <input
                              type="number"
                              min="0"
                              max="24"
                              step="0.5"
                              value={horas !== null ? horas : ''}
                              placeholder="--"
                              onChange={e => {
                                const v = e.target.value
                                if (v === '' || v === null) {
                                  setCelda(t.id, fecha, null)
                                } else {
                                  const n = parseFloat(v)
                                  setCelda(t.id, fecha, isNaN(n) ? null : Math.min(24, Math.max(0, n)))
                                }
                              }}
                              className="w-12 text-center text-xs py-1 bg-transparent outline-none font-medium"
                              style={{ color: cellColor }}
                              aria-label={`${t.nombre} ${fecha}: horas trabajadas`}
                            />
                          </div>
                          <button
                            onClick={() => setCelda(t.id, fecha, HORAS_JORNADA)}
                            title={`Jornada completa (${HORAS_JORNADA}h)`}
                            className="transition-colors"
                            style={{ color: 'var(--tinta-500)' }}
                            aria-label="Marcar jornada completa"
                          >
                            <Check className="w-3 h-3" />
                          </button>
                        </div>
                      </td>
                    )
                  })}
                  <td className="py-2 px-2 text-center">
                    <span className="font-bold text-sm" style={{ color: diasPresente > 0 ? 'var(--primary)' : 'var(--tinta-500)' }}>
                      {diasPresente}
                    </span>
                  </td>
                  <td className="py-2 px-2 text-center">
                    <span className="font-bold text-sm" style={{ color: horasTotales > 0 ? 'var(--tinta)' : 'var(--tinta-500)' }}>
                      {horasTotales > 0 ? horasTotales : '--'}
                    </span>
                  </td>
                  <td className="py-2 px-4 text-right font-mono font-semibold text-sm" style={{ color: pago > 0 ? 'var(--primary)' : 'var(--tinta-500)' }}>
                    {pago > 0 ? formatMXN(pago) : '--'}
                  </td>
                </tr>
              )
            })}
          </tbody>
          {trabajadores.length > 0 && (
            <tfoot>
              <tr className="font-semibold text-sm" style={{ borderTop: '2px solid var(--border-bright)', background: 'var(--surface-2)' }}>
                <td className="py-2.5 px-4 text-xs uppercase tracking-wide" style={{ color: 'var(--tinta-500)' }}>Total</td>
                {dias.map(d => {
                  const fecha = toISOLocal(d)
                  const presentes = trabajadores.filter(t => {
                    const h = horasCelda[t.id]?.[fecha] ?? null
                    return h !== null && h > 0
                  }).length
                  const horasDia = trabajadores.reduce((s, t) => {
                    const h = horasCelda[t.id]?.[fecha] ?? null
                    return s + (h !== null && h > 0 ? h : 0)
                  }, 0)
                  return (
                    <td key={fecha} className="py-2.5 px-1 text-center text-xs">
                      {presentes > 0 && (
                        <div>
                          <span className="font-bold block" style={{ color: 'var(--bosque-500)' }}>{presentes}p</span>
                          <span className="font-normal" style={{ color: 'var(--tinta-500)' }}>{horasDia}h</span>
                        </div>
                      )}
                    </td>
                  )
                })}
                <td className="py-2.5 px-2 text-center font-bold" style={{ color: 'var(--primary)' }}>
                  {trabajadores.reduce((s, t) => s + getDiasPresente(t.id), 0)}
                </td>
                <td className="py-2.5 px-2 text-center font-bold" style={{ color: 'var(--tinta)' }}>
                  {trabajadores.reduce((s, t) => s + getHorasTotales(t.id), 0)}
                </td>
                <td className="py-2.5 px-4 text-right font-mono font-bold" style={{ color: 'var(--primary)' }}>
                  {formatMXN(totalPago)}
                </td>
              </tr>
            </tfoot>
          )}
        </table>
        {!trabajadores.length && (
          <div className="text-center py-12" style={{ color: 'var(--tinta-500)' }}>
            <CalendarDays className="w-10 h-10 mx-auto mb-2 opacity-40" />
            <p className="text-sm mb-2">No hay trabajadores activos{proyectoId ? ' en este proyecto' : ''}.</p>
            <Link href="/dashboard/trabajadores" className="text-primary text-sm hover:underline font-semibold">
              <Plus className="w-3 h-3 inline" /> Agregar trabajadores
            </Link>
          </div>
        )}
      </div>

      {/* Vista Móvil */}
      <div className="md:hidden space-y-3 mb-4">
        {/* Tira de Días */}
        <div className="tile p-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold flex items-center gap-1.5" style={{ color: 'var(--tinta-500)' }}>
              <CalendarDays className="w-3.5 h-3.5" />
              Día a registrar
            </span>
            {activeFecha && (
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full" style={{ background: 'var(--primary-glow)', color: 'var(--primary)' }}>
                {(() => {
                  const dObj = dias.find(d => toISOLocal(d) === activeFecha)
                  if (!dObj) return ''
                  return `${getDayLabel(dObj)} ${dObj.getDate()}/${dObj.getMonth() + 1}`
                })()}
              </span>
            )}
          </div>
          <div className="flex gap-1.5 overflow-x-auto pb-1">
            {dias.map(d => {
              const fecha = toISOLocal(d)
              const esActivo = fecha === activeFecha
              const esHoy = fecha === hoyISO
              const esFestivo = esDiaFestivo(fecha)
              const hrasAlgunTrab = trabajadores.some(t => (horasCelda[t.id]?.[fecha] ?? null) !== null)
              return (
                <button
                  key={fecha}
                  type="button"
                  onClick={() => setActiveFecha(fecha)}
                  className="flex-shrink-0 flex flex-col items-center gap-0.5 w-12 py-2 rounded-xl border transition-all"
                  style={{
                    background: esActivo ? 'var(--primary-glow)' : esHoy ? 'var(--surface-2)' : 'var(--surface)',
                    borderColor: esActivo ? 'var(--primary)' : 'var(--border)',
                    outline: esHoy && !esActivo ? '1px solid var(--primary-light)' : 'none',
                  }}
                >
                  <span className="text-[9px] uppercase font-bold" style={{ color: esActivo ? 'var(--primary)' : 'var(--tinta-500)' }}>
                    {getDayLabel(d)}
                  </span>
                  <span className="text-sm font-extrabold" style={{ color: esActivo ? 'var(--primary)' : 'var(--tinta)' }}>
                    {d.getDate()}
                  </span>
                  <div className="flex gap-0.5">
                    {esFestivo && <span className="w-1 h-1 rounded-full" style={{ background: 'var(--ambar)' }} />}
                    {hrasAlgunTrab && <span className="w-1 h-1 rounded-full" style={{ background: 'var(--verde-ok)' }} />}
                  </div>
                </button>
              )
            })}
          </div>
        </div>

        {/* Acciones masivas */}
        {trabajadores.length > 0 && activeFecha && (
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => trabajadores.forEach(t => setCelda(t.id, activeFecha, HORAS_JORNADA))}
              className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-semibold border transition-all active:scale-95"
              style={{ background: 'var(--bosque-50)', borderColor: 'var(--bosque-200)', color: 'var(--bosque-600)' }}
            >
              <Check className="w-3.5 h-3.5" />
              Todos presentes (8h)
            </button>
            <button
              type="button"
              onClick={() => trabajadores.forEach(t => setCelda(t.id, activeFecha, 0))}
              className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-semibold border transition-all active:scale-95"
              style={{ background: 'rgba(160,78,62,0.06)', borderColor: 'rgba(160,78,62,0.25)', color: 'var(--rojo-falta)' }}
            >
              <Plus className="w-3.5 h-3.5 rotate-45" />
              Todos ausentes (0h)
            </button>
          </div>
        )}

        {/* Tarjetas de trabajadores */}
        {trabajadores.length > 0 ? (
          <div className="space-y-2">
            {trabajadores.map(t => {
              const diasPresente = getDiasPresente(t.id)
              const horasTotales = getHorasTotales(t.id)
              const pago = calcPago(t, getDiasEfectivos(t.id), diasPresente, horasTotales, dias.length)
              const horasActive = activeFecha ? (horasCelda[t.id]?.[activeFecha] ?? null) : null

              return (
                <div key={t.id} className="tile p-3 flex flex-col gap-2.5">
                  {/* Nombre + resumen */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold shrink-0"
                        style={{ background: 'var(--primary-glow)', color: 'var(--primary)' }}>
                        {t.nombre.slice(0, 2).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold text-sm truncate" style={{ color: 'var(--tinta)' }}>{t.nombre}</p>
                        <p className="text-[10px]" style={{ color: 'var(--tinta-500)' }}>{t.modalidad_pago?.replace(/_/g, ' ')}</p>
                      </div>
                    </div>
                    <div className="text-right shrink-0 ml-2">
                      <p className="text-[10px] font-medium" style={{ color: 'var(--tinta-500)' }}>{diasPresente}d · {horasTotales}h</p>
                      <p className="text-xs font-bold font-mono" style={{ color: pago > 0 ? 'var(--primary)' : 'var(--tinta-300)' }}>
                        {pago > 0 ? formatMXN(pago) : '--'}
                      </p>
                    </div>
                  </div>

                  {/* Píldoras de días */}
                  <div className="flex gap-1 overflow-x-auto pb-0.5">
                    {dias.map(d => {
                      const fecha = toISOLocal(d)
                      const horas = horasCelda[t.id]?.[fecha] ?? null
                      const esActivo = fecha === activeFecha
                      let bg = 'var(--surface-2)', border = 'var(--border)', color = 'var(--tinta-300)'
                      if (horas !== null && horas > 0) { bg = 'var(--bosque-50)'; border = 'var(--bosque-200)'; color = 'var(--bosque-600)' }
                      else if (horas === 0) { bg = 'rgba(160,78,62,0.08)'; border = 'rgba(160,78,62,0.25)'; color = 'var(--rojo-falta)' }
                      return (
                        <button
                          key={fecha}
                          type="button"
                          onClick={() => setActiveFecha(fecha)}
                          title={`${getDayLabel(d)}: ${horas === null ? 'sin registrar' : horas > 0 ? `${horas}h` : 'falta'}`}
                          className="flex-shrink-0 w-6 h-6 rounded-md flex items-center justify-center text-[9px] font-bold border transition-all"
                          style={{
                            background: bg, borderColor: border, color,
                            outline: esActivo ? '2px solid var(--primary)' : 'none',
                            outlineOffset: '1px',
                          }}
                        >
                          {horas !== null ? (horas > 0 ? horas : 'F') : d.getDate()}
                        </button>
                      )
                    })}
                  </div>

                  {/* Editor del día activo */}
                  {activeFecha && (
                    <div className="rounded-xl p-2.5 border" style={{ background: 'var(--surface-2)', borderColor: 'var(--border-bright)' }}>
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-semibold" style={{ color: 'var(--tinta)' }}>
                          Horas — {(() => {
                            const dObj = dias.find(d => toISOLocal(d) === activeFecha)
                            return dObj ? `${getDayLabel(dObj)} ${dObj.getDate()}` : activeFecha
                          })()}
                        </span>
                        <input
                          type="number"
                          min="0" max="24" step="0.5"
                          value={horasActive !== null ? horasActive : ''}
                          placeholder="--"
                          onChange={e => {
                            const v = e.target.value
                            if (!v) { setCelda(t.id, activeFecha, null); return }
                            const n = parseFloat(v)
                            setCelda(t.id, activeFecha, isNaN(n) ? null : Math.min(24, Math.max(0, n)))
                          }}
                          className="input w-16 text-center text-sm py-1 font-bold"
                          aria-label={`${t.nombre} horas`}
                        />
                      </div>
                      <div className="grid grid-cols-3 gap-1.5 mt-2">
                        <button type="button" onClick={() => setCelda(t.id, activeFecha, HORAS_JORNADA)}
                          className="py-1.5 rounded-lg text-[10px] font-semibold border transition-all active:scale-95"
                          style={{ background: 'var(--bosque-50)', borderColor: 'var(--bosque-200)', color: 'var(--bosque-600)' }}>
                          <Check className="w-3 h-3 mx-auto mb-0.5" /> 8h
                        </button>
                        <button type="button" onClick={() => setCelda(t.id, activeFecha, 0)}
                          className="py-1.5 rounded-lg text-[10px] font-semibold border transition-all active:scale-95"
                          style={{ background: 'rgba(160,78,62,0.06)', borderColor: 'rgba(160,78,62,0.25)', color: 'var(--rojo-falta)' }}>
                          <Plus className="w-3 h-3 mx-auto mb-0.5 rotate-45" /> Falta
                        </button>
                        <button type="button" onClick={() => setCelda(t.id, activeFecha, null)}
                          className="py-1.5 rounded-lg text-[10px] font-semibold border transition-all active:scale-95"
                          style={{ background: 'var(--surface)', borderColor: 'var(--border)', color: 'var(--tinta-500)' }}>
                          Limpiar
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        ) : (
          <div className="tile text-center py-10">
            <CalendarDays className="w-9 h-9 mx-auto mb-2 opacity-30" style={{ color: 'var(--tinta-500)' }} />
            <p className="text-sm mb-2" style={{ color: 'var(--tinta-500)' }}>No hay trabajadores activos{proyectoId ? ' en este proyecto' : ''}.</p>
            <Link href="/dashboard/trabajadores" className="text-primary text-sm hover:underline font-semibold">
              <Plus className="w-3 h-3 inline" /> Agregar trabajadores
            </Link>
          </div>
        )}
      </div>

      <p className="text-xs text-ink-soft flex items-center gap-1.5 px-1">
        <CalendarDays className="w-3.5 h-3.5" />
        Ingresa las horas trabajadas por dia. Usa <Check className="w-3 h-3 inline" /> para marcar jornada completa ({HORAS_JORNADA}h). Celda vacia = sin registrar.
      </p>
    </div>
  )
}
