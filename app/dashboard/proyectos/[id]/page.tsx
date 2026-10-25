'use client'
import { useEffect, useState, useMemo, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useEmpresa } from '@/components/layout/EmpresaContext'
import {
  ArrowLeft, UserPlus, X, AlertCircle, Loader2, Trash2,
  Users, Wallet, Receipt, ClipboardList, TrendingUp, BookOpen,
  FileDown, Plus,
} from 'lucide-react'
import Link from 'next/link'
import { formatMXN, hoyISO } from '@/lib/utils'
import { ATELIER, atelierPdfHeader, atelierTable, atelierPdfFooter } from '@/lib/export/atelier-theme'
import type { Proyecto, Trabajador } from '@/types'

interface AssignedWorker { pt_id: string; trabajador: Trabajador }
type Tab = 'equipo' | 'avance' | 'bitacora'
type BitacoraTipo = 'incidencia' | 'avance' | 'material' | 'clima' | 'otro'

interface EstimacionAvance {
  id: string
  fecha: string
  porcentaje_avance: number
  descripcion: string | null
  created_at: string
}

interface BitacoraEntry {
  id: string
  fecha: string
  tipo: BitacoraTipo
  descripcion: string
  created_at: string
}

const TIPO_META: Record<BitacoraTipo, { label: string; color: string; bg: string }> = {
  avance:     { label: 'Avance',     color: 'var(--verde-ok)', bg: 'rgba(111,138,79,0.12)' },
  material:   { label: 'Material',   color: 'var(--primary)',  bg: 'rgba(27,108,168,0.10)' },
  incidencia: { label: 'Incidencia', color: '#e05252',         bg: 'rgba(224,82,82,0.10)'  },
  clima:      { label: 'Clima',      color: '#7c6fc9',         bg: 'rgba(124,111,201,0.10)'},
  otro:       { label: 'Otro',       color: 'var(--tinta-500)', bg: 'rgba(120,120,120,0.10)'},
}

function AvanceChart({ data }: { data: EstimacionAvance[] }) {
  if (data.length === 0) return null
  const sorted = [...data].sort((a, b) => a.fecha.localeCompare(b.fecha))
  const W = 520, H = 120, PAD = { t: 12, r: 16, b: 28, l: 36 }
  const cw = W - PAD.l - PAD.r
  const ch = H - PAD.t - PAD.b

  const xScale = (i: number) => PAD.l + (sorted.length === 1 ? cw / 2 : (i / (sorted.length - 1)) * cw)
  const yScale = (v: number) => PAD.t + ch - (v / 100) * ch

  const points = sorted.map((d, i) => `${xScale(i)},${yScale(d.porcentaje_avance)}`).join(' ')
  const areaPoints = [
    `${xScale(0)},${PAD.t + ch}`,
    ...sorted.map((d, i) => `${xScale(i)},${yScale(d.porcentaje_avance)}`),
    `${xScale(sorted.length - 1)},${PAD.t + ch}`,
  ].join(' ')

  const yTicks = [0, 25, 50, 75, 100]

  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: 'auto', display: 'block' }}>
      {yTicks.map(t => (
        <g key={t}>
          <line x1={PAD.l} x2={W - PAD.r} y1={yScale(t)} y2={yScale(t)} stroke="var(--border)" strokeWidth={0.8} strokeDasharray="3,3" />
          <text x={PAD.l - 4} y={yScale(t) + 3.5} textAnchor="end" fontSize={8} fill="var(--tinta-500)">{t}%</text>
        </g>
      ))}
      <polygon points={areaPoints} fill="rgba(27,108,168,0.08)" />
      <polyline points={points} fill="none" stroke="var(--primary)" strokeWidth={2} strokeLinejoin="round" />
      {sorted.map((d, i) => (
        <g key={d.id}>
          <circle cx={xScale(i)} cy={yScale(d.porcentaje_avance)} r={4} fill="var(--primary)" />
          <text x={xScale(i)} y={H - 6} textAnchor="middle" fontSize={7.5} fill="var(--tinta-500)">
            {d.fecha.slice(5)}
          </text>
        </g>
      ))}
    </svg>
  )
}

export default function ProyectoDetailPage() {
  const params = useParams()
  const router = useRouter()
  const proyectoId = params.id as string
  const supabase = useMemo(() => createClient(), [])

  const { empresaId, empresa, rol: userRol, userName } = useEmpresa()
  const empresaNombre = empresa.nombre || ''
  const [proyecto, setProyecto] = useState<Proyecto | null>(null)
  const [asignados, setAsignados] = useState<AssignedWorker[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [removingId, setRemovingId] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<Tab>('equipo')
  const [accessDenied, setAccessDenied] = useState(false)

  // Stats
  const [totalNominas, setTotalNominas] = useState(0)
  const [nominasCount, setNominasCount] = useState(0)
  const [totalGastos, setTotalGastos] = useState(0)
  const [anticiposPendientes, setAnticiposPendientes] = useState(0)

  // Avance (B1)
  const [estimaciones, setEstimaciones] = useState<EstimacionAvance[]>([])
  const [avanceForm, setAvanceForm] = useState({ fecha: hoyISO(), porcentaje: '', descripcion: '' })
  const [savingAvance, setSavingAvance] = useState(false)
  const [avanceError, setAvanceError] = useState('')

  // Bitácora (B2)
  const [bitacora, setBitacora] = useState<BitacoraEntry[]>([])
  const [bitForm, setBitForm] = useState({ fecha: hoyISO(), tipo: 'avance' as BitacoraTipo, descripcion: '' })
  const [savingBit, setSavingBit] = useState(false)
  const [bitError, setBitError] = useState('')
  const [filtroTipo, setFiltroTipo] = useState<BitacoraTipo | 'todos'>('todos')
  const [showBitForm, setShowBitForm] = useState(false)
  const [showAvanceForm, setShowAvanceForm] = useState(false)

  // Add worker modal
  const [showModal, setShowModal] = useState(false)
  const [todosLosTrabajadores, setTodosLosTrabajadores] = useState<Trabajador[]>([])
  const [loadingModal, setLoadingModal] = useState(false)
  const [addingId, setAddingId] = useState<string | null>(null)
  const [modalError, setModalError] = useState('')

  const loadData = useCallback(async () => {
    try {
      const { data: proy } = await supabase
        .from('proyectos').select('*')
        .eq('id', proyectoId).eq('empresa_id', empresaId).single()
      if (!proy) { setError('Proyecto no encontrado.'); return }

      // Capataz access guard: only allow if they are the encargado
      if (userRol === 'capataz') {
        const encargado = (proy.encargado || '').toLowerCase()
        if (!encargado.includes(userName.toLowerCase())) {
          setAccessDenied(true)
          setLoading(false)
          return
        }
        // Capataz default tab is bitacora
        setActiveTab('bitacora')
      }

      setProyecto(proy)

      const [
        { data: pts, error: ptsErr },
        { data: nominas },
        { data: gastos },
        { count: aPend },
        { data: est },
        { data: bit },
      ] = await Promise.all([
        supabase.from('proyecto_trabajadores').select('id, trabajador_id, trabajadores(*)').eq('proyecto_id', proyectoId),
        supabase.from('periodos_nomina').select('total_nomina').eq('proyecto_id', proyectoId).in('estado', ['generada', 'pagada']),
        supabase.from('gastos_proyecto').select('monto').eq('proyecto_id', proyectoId),
        supabase.from('anticipos').select('*', { count: 'exact', head: true }).eq('proyecto_id', proyectoId).in('estado', ['pendiente', 'aprobado']),
        supabase.from('estimaciones_avance').select('*').eq('proyecto_id', proyectoId).order('fecha', { ascending: false }),
        supabase.from('bitacora_obra').select('*').eq('proyecto_id', proyectoId).order('fecha', { ascending: false }).order('created_at', { ascending: false }),
      ])

      if (ptsErr) { setError(ptsErr.message); return }

      setAsignados((pts || []).map((row: { id: string; trabajador_id: string; trabajadores: unknown }) => ({
        pt_id: row.id,
        trabajador: row.trabajadores as Trabajador,
      })))
      setTotalNominas((nominas || []).reduce((s, n) => s + (n.total_nomina || 0), 0))
      setNominasCount((nominas || []).length)
      setTotalGastos((gastos || []).reduce((s, g) => s + (Number(g.monto) || 0), 0))
      setAnticiposPendientes(aPend ?? 0)
      setEstimaciones((est || []) as EstimacionAvance[])
      setBitacora((bit || []) as BitacoraEntry[])
    } catch (err) {
      console.error('Error cargando detalle de proyecto:', err)
      setError('Error inesperado al cargar los datos.')
    } finally {
      setLoading(false)
    }
  }, [supabase, proyectoId, empresaId, userRol, userName])

  useEffect(() => { loadData() }, [loadData])

  const handleRemove = async (ptId: string) => {
    setRemovingId(ptId)
    setError('')
    const { error: err } = await supabase.from('proyecto_trabajadores').delete().eq('id', ptId)
    if (err) { setError(`No se pudo quitar al trabajador: ${err.message}`); setRemovingId(null); return }
    setRemovingId(null)
    await loadData()
  }

  const openModal = async () => {
    setModalError(''); setShowModal(true); setLoadingModal(true)
    try {
      const { data: todos } = await supabase.from('trabajadores').select('*').eq('empresa_id', empresaId).eq('activo', true).order('nombre')
      const ids = new Set(asignados.map(a => a.trabajador.id))
      setTodosLosTrabajadores((todos || []).filter((t: Trabajador) => !ids.has(t.id)))
    } catch { setModalError('Error al cargar trabajadores.') }
    finally { setLoadingModal(false) }
  }

  const handleAdd = async (trabajador: Trabajador) => {
    setAddingId(trabajador.id); setModalError('')
    const { error: err } = await supabase.from('proyecto_trabajadores')
      .insert({ empresa_id: empresaId, proyecto_id: proyectoId, trabajador_id: trabajador.id, activo: true })
    if (err) { setModalError(`No se pudo agregar: ${err.message}`); setAddingId(null); return }
    setAddingId(null); setShowModal(false); await loadData()
  }

  const saveAvance = async () => {
    const pct = parseFloat(avanceForm.porcentaje)
    if (isNaN(pct) || pct < 0 || pct > 100) { setAvanceError('El porcentaje debe ser entre 0 y 100.'); return }
    setSavingAvance(true); setAvanceError('')
    const { error: err } = await supabase.from('estimaciones_avance').insert({
      empresa_id: empresaId,
      proyecto_id: proyectoId,
      fecha: avanceForm.fecha,
      porcentaje_avance: pct,
      descripcion: avanceForm.descripcion || null,
    })
    setSavingAvance(false)
    if (err) { setAvanceError(err.message); return }
    setAvanceForm({ fecha: hoyISO(), porcentaje: '', descripcion: '' })
    setShowAvanceForm(false)
    await loadData()
  }

  const saveBitacora = async () => {
    if (!bitForm.descripcion.trim()) { setBitError('La descripción es requerida.'); return }
    setSavingBit(true); setBitError('')
    const { error: err } = await supabase.from('bitacora_obra').insert({
      empresa_id: empresaId,
      proyecto_id: proyectoId,
      fecha: bitForm.fecha,
      tipo: bitForm.tipo,
      descripcion: bitForm.descripcion.trim(),
    })
    setSavingBit(false)
    if (err) { setBitError(err.message); return }
    setBitForm({ fecha: hoyISO(), tipo: 'avance', descripcion: '' })
    setShowBitForm(false)
    await loadData()
  }

  const exportPDF = async () => {
    if (!proyecto) return
    const jsPDF = (await import('jspdf')).default
    const autoTable = (await import('jspdf-autotable')).default
    const doc = new jsPDF()

    const y = atelierPdfHeader(doc, {
      titulo: 'Reporte de costos',
      empresa: empresaNombre,
      meta: [
        `Proyecto: ${proyecto.nombre}`,
        `Encargado: ${proyecto.encargado || '-'}`,
        ...(proyecto.fecha_inicio ? [`Inicio: ${proyecto.fecha_inicio}`] : []),
      ],
    })

    autoTable(doc, atelierTable({
      startY: y,
      head: [['Concepto', 'Monto']],
      body: [
        ['Costo total mano de obra', formatMXN(totalNominas)],
        ['Gastos adicionales', formatMXN(totalGastos)],
        ['Anticipos pendientes', anticiposPendientes > 0 ? `${anticiposPendientes} anticipo(s)` : '—'],
        ['TOTAL', formatMXN(totalNominas + totalGastos)],
      ],
      columnStyles: { 1: { halign: 'right' } },
    }))

    if (estimaciones.length > 0) {
      const lastY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable?.finalY ?? 100
      doc.setFont('times', 'bold')
      doc.setFontSize(10)
      doc.setTextColor(...ATELIER.bosque600)
      doc.text('Avance del proyecto', 14, lastY + 12)
      autoTable(doc, atelierTable({
        startY: lastY + 16,
        head: [['Fecha', '% Avance', 'Descripción']],
        body: estimaciones.slice().reverse().map(e => [
          e.fecha,
          `${e.porcentaje_avance}%`,
          e.descripcion || '—',
        ]),
      }))
    }

    atelierPdfFooter(doc)
    doc.save(`reporte-${proyecto.nombre.toLowerCase().replace(/\s+/g, '-')}.pdf`)
  }

  const avanceActual = estimaciones[0]?.porcentaje_avance ?? null
  const bitacoraFiltrada = filtroTipo === 'todos' ? bitacora : bitacora.filter(b => b.tipo === filtroTipo)

  if (loading) return (
    <div className="flex items-center justify-center h-64 text-gray-400">
      <Loader2 className="w-6 h-6 animate-spin mr-2" /> Cargando...
    </div>
  )

  if (accessDenied) return (
    <div className="max-w-2xl mx-auto pt-12 text-center">
      <AlertCircle className="w-10 h-10 mx-auto mb-3 text-red-400" />
      <p className="font-medium mb-1" style={{ color: 'var(--tinta)' }}>No tienes acceso a este proyecto</p>
      <p className="text-sm mb-4" style={{ color: 'var(--tinta-500)' }}>Solo puedes ver los proyectos en los que eres encargado.</p>
      <button onClick={() => router.push('/dashboard/proyectos')}
        className="btn-secondary text-sm flex items-center gap-1.5 mx-auto">
        <ArrowLeft className="w-4 h-4" /> Volver a proyectos
      </button>
    </div>
  )

  if (!proyecto) return (
    <div className="max-w-2xl mx-auto">
      <div className="flex items-center gap-2 bg-red-50 text-red-700 text-sm p-3 rounded-lg">
        <AlertCircle className="w-4 h-4 shrink-0" />{error || 'Proyecto no encontrado.'}
      </div>
    </div>
  )

  return (
    <div className="max-w-3xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <button onClick={() => router.push('/dashboard/proyectos')}
          className="flex items-center gap-1.5 text-sm mb-3 transition-colors" style={{ color: 'var(--tinta-500)' }}>
          <ArrowLeft className="w-4 h-4" /> Volver a proyectos
        </button>
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="w-1.5 h-10 rounded-full shrink-0" style={{ backgroundColor: proyecto.color_etiqueta }} />
            <div>
              <h1 className="font-display text-2xl font-bold" style={{ color: 'var(--tinta)' }}>{proyecto.nombre}</h1>
              <p className="text-sm" style={{ color: 'var(--tinta-500)' }}>Encargado: {proyecto.encargado}</p>
            </div>
          </div>
          {userRol !== 'capataz' && (
            <button onClick={exportPDF}
              className="flex items-center gap-2 text-sm px-3 py-2 rounded-lg transition-colors"
              style={{ border: '1px solid var(--border)', color: 'var(--tinta-500)' }}>
              <FileDown className="w-4 h-4" /> Exportar PDF
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 bg-red-50 text-red-700 text-sm p-3 rounded-lg mb-4">
          <AlertCircle className="w-4 h-4 shrink-0" />{error}
        </div>
      )}

      {/* Stats cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        {[
          { icon: Users,         label: 'Trabajadores',       value: String(asignados.length), color: 'var(--primary)',  bg: 'rgba(27,108,168,0.08)',  capatazHide: false },
          { icon: ClipboardList, label: 'Nominas pagadas',    value: String(nominasCount),     color: 'var(--primary)',  bg: 'rgba(27,108,168,0.08)',  capatazHide: true  },
          { icon: Wallet,        label: 'Costo mano de obra', value: formatMXN(totalNominas),  color: 'var(--verde-ok)', bg: 'rgba(111,138,79,0.10)',  capatazHide: true  },
          { icon: Receipt,       label: 'Gastos adicionales', value: formatMXN(totalGastos),   color: 'var(--ambar)',    bg: 'rgba(217,164,65,0.10)',  capatazHide: true  },
        ].filter(c => !(userRol === 'capataz' && c.capatazHide)).map(({ icon: Icon, label, value, color, bg }) => (
          <div key={label} className="card py-3 px-4 text-center space-y-1">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center mx-auto" style={{ background: bg }}>
              <Icon className="w-4 h-4" style={{ color }} />
            </div>
            <p className="text-sm font-bold font-mono" style={{ color: 'var(--tinta)' }}>{value}</p>
            <p className="text-xs" style={{ color: 'var(--tinta-500)' }}>{label}</p>
          </div>
        ))}
      </div>

      {anticiposPendientes > 0 && userRol !== 'capataz' && (
        <div className="flex items-center gap-2 text-sm mb-4 p-3 rounded-xl"
          style={{ background: 'rgba(217,164,65,0.10)', border: '1px solid rgba(217,164,65,0.25)', color: 'var(--ambar)' }}>
          <AlertCircle className="w-4 h-4 shrink-0" />
          {anticiposPendientes} anticipo(s) pendiente(s) en este proyecto.
          <Link href="/dashboard/anticipos" className="underline ml-auto font-medium text-xs">Ver anticipos</Link>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 mb-6 border-b overflow-x-auto" style={{ borderColor: 'var(--border)' }}>
        {([
          { id: 'equipo',   label: 'Equipo',   icon: Users,      capatazHide: true  },
          { id: 'avance',   label: 'Avance',   icon: TrendingUp, capatazHide: false },
          { id: 'bitacora', label: 'Bitácora', icon: BookOpen,   capatazHide: false },
        ] as { id: Tab; label: string; icon: React.ElementType; capatazHide: boolean }[])
          .filter(t => !(userRol === 'capataz' && t.capatazHide))
          .map(({ id, label, icon: Icon }) => (
            <button key={id} onClick={() => setActiveTab(id)}
              className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium border-b-2 -mb-px whitespace-nowrap transition-colors"
              style={{
                borderColor: activeTab === id ? 'var(--primary)' : 'transparent',
                color: activeTab === id ? 'var(--primary)' : 'var(--tinta-500)',
              }}>
              <Icon className="w-3.5 h-3.5" />{label}
            </button>
          ))}
        {userRol !== 'capataz' && (
          <Link href={`/dashboard/proyectos/${proyectoId}/gastos`}
            className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium border-b-2 border-transparent -mb-px transition-colors whitespace-nowrap"
            style={{ color: 'var(--tinta-500)' }}>
            <Receipt className="w-3.5 h-3.5" /> Gastos
          </Link>
        )}
        {userRol !== 'capataz' && (
          <Link href={`/dashboard/nomina?proyecto=${proyectoId}`}
            className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium border-b-2 border-transparent -mb-px transition-colors whitespace-nowrap"
            style={{ color: 'var(--tinta-500)' }}>
            <ClipboardList className="w-3.5 h-3.5" /> Nóminas ({nominasCount})
          </Link>
        )}
      </div>

      {/* === EQUIPO === */}
      {activeTab === 'equipo' && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm" style={{ color: 'var(--tinta-500)' }}>{asignados.length} trabajador(es) asignado(s)</p>
            <button onClick={openModal} className="btn-primary flex items-center gap-2 text-sm">
              <UserPlus className="w-4 h-4" /> Agregar trabajador
            </button>
          </div>
          {asignados.length === 0 ? (
            <div className="card text-center py-12">
              <UserPlus className="w-10 h-10 mx-auto text-gray-300 mb-3" />
              <p className="text-sm mb-4" style={{ color: 'var(--tinta-500)' }}>No hay trabajadores asignados a este proyecto.</p>
              <button onClick={openModal} className="btn-primary text-sm">Agregar trabajador</button>
            </div>
          ) : (
            <div className="space-y-2">
              {asignados.map(({ pt_id, trabajador: t }) => (
                <div key={pt_id} className="card flex items-center justify-between gap-3 py-3">
                  <div>
                    <p className="font-medium text-sm" style={{ color: 'var(--tinta)' }}>{t.nombre}</p>
                    <p className="text-xs" style={{ color: 'var(--tinta-500)' }}>{t.modalidad_pago?.replace('_', ' ')}</p>
                  </div>
                  <button onClick={() => handleRemove(pt_id)} disabled={removingId === pt_id}
                    className="p-1.5 rounded hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors shrink-0" title="Quitar del proyecto">
                    {removingId === pt_id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* === AVANCE === */}
      {activeTab === 'avance' && (
        <div>
          {/* Current % badge */}
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-3">
              <div className="text-3xl font-mono font-bold" style={{ color: 'var(--primary)' }}>
                {avanceActual !== null ? `${avanceActual}%` : '—'}
              </div>
              <div>
                <p className="text-sm font-medium" style={{ color: 'var(--tinta)' }}>Avance actual</p>
                <p className="text-xs" style={{ color: 'var(--tinta-500)' }}>
                  {estimaciones.length} registro(s)
                </p>
              </div>
            </div>
            <button onClick={() => setShowAvanceForm(v => !v)}
              className="btn-primary flex items-center gap-2 text-sm">
              <Plus className="w-4 h-4" /> Registrar avance
            </button>
          </div>

          {avanceActual !== null && (
            <div className="card mb-4 p-3">
              <div className="h-2 rounded-full overflow-hidden mb-3" style={{ background: 'var(--border)' }}>
                <div className="h-full rounded-full transition-all" style={{ width: `${avanceActual}%`, background: 'var(--primary)' }} />
              </div>
              <AvanceChart data={estimaciones} />
            </div>
          )}

          {showAvanceForm && (
            <div className="card mb-4 p-4 space-y-3">
              <p className="text-sm font-medium" style={{ color: 'var(--tinta)' }}>Nuevo registro de avance</p>
              {avanceError && <p className="text-xs text-red-600">{avanceError}</p>}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs mb-1" style={{ color: 'var(--tinta-500)' }}>Fecha</label>
                  <input type="date" value={avanceForm.fecha}
                    onChange={e => setAvanceForm(f => ({ ...f, fecha: e.target.value }))}
                    className="input w-full text-sm" />
                </div>
                <div>
                  <label className="block text-xs mb-1" style={{ color: 'var(--tinta-500)' }}>% de avance</label>
                  <input type="number" min={0} max={100} step={1} placeholder="ej. 65"
                    value={avanceForm.porcentaje}
                    onChange={e => setAvanceForm(f => ({ ...f, porcentaje: e.target.value }))}
                    className="input w-full text-sm" />
                </div>
              </div>
              <div>
                <label className="block text-xs mb-1" style={{ color: 'var(--tinta-500)' }}>Descripción (opcional)</label>
                <input type="text" placeholder="Ej. Colado de losa nivel 2"
                  value={avanceForm.descripcion}
                  onChange={e => setAvanceForm(f => ({ ...f, descripcion: e.target.value }))}
                  className="input w-full text-sm" />
              </div>
              <div className="flex gap-2 justify-end">
                <button onClick={() => setShowAvanceForm(false)} className="btn-secondary text-sm px-3 py-1.5">Cancelar</button>
                <button onClick={saveAvance} disabled={savingAvance} className="btn-primary flex items-center gap-2 text-sm px-3 py-1.5">
                  {savingAvance ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null} Guardar
                </button>
              </div>
            </div>
          )}

          {estimaciones.length === 0 && !showAvanceForm ? (
            <div className="card text-center py-12">
              <TrendingUp className="w-10 h-10 mx-auto mb-3" style={{ color: 'var(--tinta-500)', opacity: 0.3 }} />
              <p className="text-sm" style={{ color: 'var(--tinta-500)' }}>Aún no hay registros de avance.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {estimaciones.map(e => (
                <div key={e.id} className="card flex items-center gap-4 py-3">
                  <div className="text-xl font-mono font-bold w-14 text-right shrink-0" style={{ color: 'var(--primary)' }}>
                    {e.porcentaje_avance}%
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-mono" style={{ color: 'var(--tinta-500)' }}>{e.fecha}</p>
                    {e.descripcion && <p className="text-sm truncate" style={{ color: 'var(--tinta)' }}>{e.descripcion}</p>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* === BITÁCORA === */}
      {activeTab === 'bitacora' && (
        <div>
          <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
            <div className="flex gap-1 flex-wrap">
              {(['todos', 'avance', 'material', 'incidencia', 'clima', 'otro'] as const).map(t => (
                <button key={t} onClick={() => setFiltroTipo(t)}
                  className="text-xs px-3 py-1 rounded-full transition-colors"
                  style={{
                    background: filtroTipo === t ? 'var(--primary)' : 'var(--surface)',
                    color: filtroTipo === t ? '#fff' : 'var(--tinta-500)',
                    border: '1px solid var(--border)',
                  }}>
                  {t === 'todos' ? 'Todos' : TIPO_META[t].label}
                </button>
              ))}
            </div>
            <button onClick={() => setShowBitForm(v => !v)}
              className="btn-primary flex items-center gap-2 text-sm">
              <Plus className="w-4 h-4" /> Agregar entrada
            </button>
          </div>

          {showBitForm && (
            <div className="card mb-4 p-4 space-y-3">
              <p className="text-sm font-medium" style={{ color: 'var(--tinta)' }}>Nueva entrada de bitácora</p>
              {bitError && <p className="text-xs text-red-600">{bitError}</p>}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs mb-1" style={{ color: 'var(--tinta-500)' }}>Fecha</label>
                  <input type="date" value={bitForm.fecha}
                    onChange={e => setBitForm(f => ({ ...f, fecha: e.target.value }))}
                    className="input w-full text-sm" />
                </div>
                <div>
                  <label className="block text-xs mb-1" style={{ color: 'var(--tinta-500)' }}>Tipo</label>
                  <select value={bitForm.tipo} onChange={e => setBitForm(f => ({ ...f, tipo: e.target.value as BitacoraTipo }))}
                    className="input w-full text-sm">
                    {(Object.entries(TIPO_META) as [BitacoraTipo, typeof TIPO_META[BitacoraTipo]][]).map(([k, v]) => (
                      <option key={k} value={k}>{v.label}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs mb-1" style={{ color: 'var(--tinta-500)' }}>Descripción</label>
                <textarea rows={3} placeholder="Describe la actividad, incidencia o material..."
                  value={bitForm.descripcion}
                  onChange={e => setBitForm(f => ({ ...f, descripcion: e.target.value }))}
                  className="input w-full text-sm resize-none" />
              </div>
              <div className="flex gap-2 justify-end">
                <button onClick={() => setShowBitForm(false)} className="btn-secondary text-sm px-3 py-1.5">Cancelar</button>
                <button onClick={saveBitacora} disabled={savingBit} className="btn-primary flex items-center gap-2 text-sm px-3 py-1.5">
                  {savingBit ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null} Guardar
                </button>
              </div>
            </div>
          )}

          {bitacoraFiltrada.length === 0 ? (
            <div className="card text-center py-12">
              <BookOpen className="w-10 h-10 mx-auto mb-3" style={{ color: 'var(--tinta-500)', opacity: 0.3 }} />
              <p className="text-sm" style={{ color: 'var(--tinta-500)' }}>
                {filtroTipo === 'todos' ? 'La bitácora está vacía.' : `No hay entradas de tipo "${TIPO_META[filtroTipo].label}".`}
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {bitacoraFiltrada.map(b => {
                const meta = TIPO_META[b.tipo]
                return (
                  <div key={b.id} className="card flex gap-3 py-3">
                    <div className="shrink-0 mt-0.5">
                      <span className="text-xs font-medium px-2 py-0.5 rounded-full"
                        style={{ background: meta.bg, color: meta.color }}>
                        {meta.label}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm" style={{ color: 'var(--tinta)' }}>{b.descripcion}</p>
                      <p className="text-xs mt-1 font-mono" style={{ color: 'var(--tinta-500)' }}>{b.fecha}</p>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* Modal: agregar trabajador */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/40">
          <div className="rounded-2xl w-full max-w-md max-h-[80vh] flex flex-col" style={{ background: 'var(--surface)' }}>
            <div className="flex items-center justify-between p-5 shrink-0" style={{ borderBottom: '1px solid var(--border)' }}>
              <h2 className="font-display font-bold" style={{ color: 'var(--tinta)' }}>Agregar trabajador</h2>
              <button onClick={() => setShowModal(false)}><X className="w-5 h-5" style={{ color: 'var(--tinta-500)' }} /></button>
            </div>
            <div className="overflow-y-auto flex-1 p-5">
              {modalError && (
                <div className="flex items-center gap-2 bg-red-50 text-red-700 text-sm p-3 rounded-lg mb-3">
                  <AlertCircle className="w-4 h-4 shrink-0" />{modalError}
                </div>
              )}
              {loadingModal ? (
                <div className="flex items-center justify-center py-8" style={{ color: 'var(--tinta-500)' }}>
                  <Loader2 className="w-5 h-5 animate-spin mr-2" /> Cargando...
                </div>
              ) : todosLosTrabajadores.length === 0 ? (
                <p className="text-sm text-center py-8" style={{ color: 'var(--tinta-500)' }}>
                  Todos los trabajadores activos ya están asignados a este proyecto.
                </p>
              ) : (
                <div className="space-y-2">
                  {todosLosTrabajadores.map(t => (
                    <div key={t.id} className="flex items-center justify-between gap-3 p-3 rounded-lg transition-colors" style={{ border: '1px solid var(--border)' }}>
                      <div>
                        <p className="font-medium text-sm" style={{ color: 'var(--tinta)' }}>{t.nombre}</p>
                        <p className="text-xs" style={{ color: 'var(--tinta-500)' }}>{t.modalidad_pago?.replace('_', ' ')}</p>
                      </div>
                      <button onClick={() => handleAdd(t)} disabled={addingId === t.id}
                        className="btn-primary text-xs py-1.5 px-3 shrink-0">
                        {addingId === t.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Agregar'}
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="p-4 shrink-0" style={{ borderTop: '1px solid var(--border)' }}>
              <button onClick={() => setShowModal(false)} className="btn-secondary w-full text-sm">Cerrar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
