'use client'
import { useEffect, useState, useCallback, useMemo, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { useEmpresa } from '@/components/layout/EmpresaContext'
import { ArrowLeft, AlertCircle, CheckCircle, RefreshCw, Wand2, Send, X, MessageCircle } from 'lucide-react'
import { formatMXN, padNomina } from '@/lib/utils'
import { logAudit } from '@/lib/audit'
import type { PeriodoNomina, Trabajador, Proyecto, ConceptoAdicional } from '@/types'
import type { NominaExportData } from '@/lib/export/nomina-pdf'
import { buildReciboText, enviarReciboWhatsApp } from '@/lib/export/recibo-trabajador'
import NominaExportMenu from '@/components/nomina/NominaExportMenu'
import EnviarRecibosModal from '@/components/nomina/EnviarRecibosModal'
import DesgloseTrabajador, { type DesgloseLinea } from '@/components/nomina/DesgloseTrabajador'
import type { LineaCalculada } from '@/components/nomina/NominaLineasTable'

function estadoMeta(e: string) {
  if (e === 'pagada') return { label: 'Pagada', bg: 'var(--bosque-50)', color: 'var(--bosque-600)' }
  if (e === 'generada') return { label: 'Generada', bg: 'var(--petroleo-50)', color: 'var(--petroleo-500)' }
  return { label: 'En progreso', bg: 'rgba(217,164,65,0.15)', color: 'var(--ambar)' }
}

export default function NominaResultPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const supabase = useMemo(() => createClient(), [])
  const { empresaId, empresa } = useEmpresa()
  const empresaNombre = empresa.nombre || ''

  const [nomina, setNomina] = useState<PeriodoNomina | null>(null)
  const [proyecto, setProyecto] = useState<Proyecto | null>(null)
  const [conceptos, setConceptos] = useState<ConceptoAdicional[]>([])
  const [lineasCalculadas, setLineasCalculadas] = useState<LineaCalculada[]>([])
  const [trabajadoresMap, setTrabajadoresMap] = useState<Map<string, Trabajador>>(new Map())
  const [loading, setLoading] = useState(true)
  const [recalculando, setRecalculando] = useState(false)
  const [msg, setMsg] = useState('')
  const [actionError, setActionError] = useState('')
  const [showConfirmPago, setShowConfirmPago] = useState(false)
  const [pagando, setPagando] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [showEnviarRecibos, setShowEnviarRecibos] = useState(false)
  const [reciboModal, setReciboModal] = useState<{ text: string; nombre: string; phoneInput: string; copied: boolean } | null>(null)
  const [reciboErr, setReciboErr] = useState('')

  const loadData = useCallback(async () => {
    try {
      const [{ data: n }, { data: c }, { data: t }, { data: lc }] = await Promise.all([
        supabase.from('periodos_nomina').select('*, proyectos(*)').eq('id', id).eq('empresa_id', empresaId).single(),
        supabase.from('conceptos_adicionales').select('*').eq('nomina_id', id),
        supabase.from('trabajadores').select('*').eq('empresa_id', empresaId),
        supabase.from('nomina_lineas_calculadas')
          .select('id, trabajador_id, modalidad_aplicada, dias_trabajados, dias_festivos, horas_trabajadas, horas_extra, tarifa_aplicada, subtotal_base, total_horas_extra, anticipos_descontados, conceptos_suma, conceptos_descuento, imss_obrero, isr_retenido, total_neto, calculo_dirty, calculado_at')
          .eq('periodo_nomina_id', id)
          .order('created_at'),
      ])

      const trabMap = new Map<string, Trabajador>((t || []).map(x => [x.id, x as Trabajador]))
      setTrabajadoresMap(trabMap)
      setLineasCalculadas((lc || []).map(row => ({
        ...row,
        trabajador_nombre: trabMap.get(row.trabajador_id)?.nombre ?? row.trabajador_id,
        dias_festivos: row.dias_festivos ?? 0,
      } as LineaCalculada)))
      setNomina(n)
      setProyecto((n?.proyectos as unknown as Proyecto) || null)
      setConceptos(c || [])
    } catch (err) {
      console.error('[nomina/[id]] loadData', err)
    } finally {
      setLoading(false)
    }
  }, [id, supabase, empresaId])

  useEffect(() => { loadData() }, [loadData])

  const tots = useMemo(() => {
    let manoObra = 0, admins = 0
    for (const l of lineasCalculadas) {
      const esAdmin = trabajadoresMap.get(l.trabajador_id)?.es_administrativo
      if (esAdmin) admins += l.total_neto
      else manoObra += l.total_neto
    }
    return { manoObra, admins, total: manoObra + admins }
  }, [lineasCalculadas, trabajadoresMap])

  const isDirty = lineasCalculadas.some(l => l.calculo_dirty)
  const editable = nomina?.estado !== 'pagada'

  const handleRecalcular = useCallback(async () => {
    setRecalculando(true); setMsg('')
    try {
      const res = await fetch('/api/payroll/recalcular', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ periodoNominaId: id }),
      })
      const json = await res.json()
      if (!res.ok) { setMsg(`Error: ${json.error}`); return }
      setMsg(`Recalculado: ${json.trabajadores} trabajadores · ${formatMXN(json.total_nomina)}`)
      await loadData()
    } catch (err) {
      console.error('[nomina/[id]] recalcular', err)
      setMsg('Error inesperado al recalcular.')
    } finally {
      setRecalculando(false)
      setTimeout(() => setMsg(''), 5000)
    }
  }, [id, loadData])

  // Recálculo automático: si las asistencias cambiaron (dirty) y la nómina aún
  // es editable, se recalcula sola al abrirla — para que reflejar cambios de
  // asistencias no dependa de presionar "Recalcular" manualmente.
  const autoRecalced = useRef(false)
  useEffect(() => {
    if (loading || recalculando || autoRecalced.current) return
    if (nomina && nomina.estado !== 'pagada' && lineasCalculadas.some(l => l.calculo_dirty)) {
      autoRecalced.current = true
      handleRecalcular()
    }
  }, [loading, recalculando, nomina, lineasCalculadas, handleRecalcular])

  const buildExportData = (): NominaExportData | null => {
    if (!nomina) return null
    // Fuente única: nomina_lineas_calculadas (salida del motor) + datos del trabajador.
    // descuentos replica lo que el motor sincroniza en lineas_nomina (anticipos +
    // conceptos de descuento + IMSS + ISR), para mantener el mismo total exportado.
    const lineas = lineasCalculadas.map(lc => ({
      trabajador_id: lc.trabajador_id,
      trabajadores: trabajadoresMap.get(lc.trabajador_id),
      dias_trabajados: lc.dias_trabajados,
      horas_trabajadas: lc.horas_trabajadas,
      horas_extra: lc.horas_extra,
      subtotal: lc.subtotal_base,
      total_horas_extra: lc.total_horas_extra,
      descuentos: lc.anticipos_descontados + lc.conceptos_descuento + lc.imss_obrero + lc.isr_retenido,
      total: lc.total_neto,
    })) as unknown as NominaExportData['lineas']
    const concTotal = conceptos.reduce((s, c) => s + (c.tipo === 'suma' ? c.monto : -c.monto) * (c.aplica_a === 'nomina_total' ? 1 : 0), 0)
    return { nomina, proyecto, lineas, conceptos, empresaNombre, tots: { manoObra: tots.manoObra, admins: tots.admins, concTotal, total: tots.manoObra + tots.admins + concTotal } }
  }

  const handleExport = async (format: 'pdf' | 'xlsx' | 'csv' | 'whatsapp') => {
    const data = buildExportData()
    if (!data) return
    setExporting(true); setActionError('')
    try {
      if (format === 'pdf') { const { descargarNominaPDF } = await import('@/lib/export/nomina-pdf'); await descargarNominaPDF(data) }
      else if (format === 'xlsx') { const { descargarNominaXLSX } = await import('@/lib/export/nomina-xlsx'); await descargarNominaXLSX(data) }
      else if (format === 'csv') { const { descargarNominaCSV } = await import('@/lib/export/nomina-csv'); descargarNominaCSV(data) }
      else if (format === 'whatsapp') {
        const { compartirNominaWhatsApp } = await import('@/lib/export/whatsapp')
        const err = await compartirNominaWhatsApp(supabase, empresaId, data)
        if (err) setActionError(err)
      }
    } catch (err) {
      console.error('[nomina/[id]] export', format, err)
      setActionError('Error al exportar. Intenta de nuevo.')
    } finally {
      setExporting(false)
    }
  }

  const openRecibo = (lc: LineaCalculada) => {
    if (!nomina) return
    const t = trabajadoresMap.get(lc.trabajador_id)
    const text = buildReciboText({
      numeroNomina: nomina.numero_nomina, fechaInicio: nomina.fecha_inicio, fechaFin: nomina.fecha_fin,
      proyectoNombre: proyecto?.nombre ?? '', empresaNombre, trabajadorNombre: lc.trabajador_nombre,
      nss: t?.nss ?? undefined, modalidad: lc.modalidad_aplicada, diasTrabajados: lc.dias_trabajados,
      diasFestivos: lc.dias_festivos, horasTrabajadas: lc.horas_trabajadas, horasExtra: lc.horas_extra,
      subtotalBase: lc.subtotal_base, totalHorasExtra: lc.total_horas_extra, anticiposDescontados: lc.anticipos_descontados,
      conceptosSuma: lc.conceptos_suma, conceptosDescuento: lc.conceptos_descuento, imssObrero: lc.imss_obrero,
      isrRetenido: lc.isr_retenido, totalNeto: lc.total_neto,
    })
    setReciboErr('')
    setReciboModal({ text, nombre: lc.trabajador_nombre, phoneInput: t?.telefono ?? '', copied: false })
  }

  if (loading) return <div className="flex items-center justify-center h-64" style={{ color: 'var(--tinta-500)' }}>Cargando...</div>
  if (!nomina) return <div className="text-center mt-20" style={{ color: 'var(--tinta-500)' }}>Nómina no encontrada</div>

  const est = estadoMeta(nomina.estado)

  return (
    <div className="max-w-3xl mx-auto pb-8">
      {/* Header */}
      <div className="flex items-start justify-between mb-6 gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <button onClick={() => router.push('/dashboard/nomina')} className="p-2 rounded-lg border" style={{ borderColor: 'var(--border)' }}>
            <ArrowLeft className="w-4 h-4" style={{ color: 'var(--tinta-500)' }} />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-sm" style={{ color: 'var(--tinta-500)' }}>{padNomina(nomina.numero_nomina)}</span>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full" style={{ background: est.bg, color: est.color }}>{est.label}</span>
            </div>
            <h1 className="font-display text-xl font-bold" style={{ color: 'var(--tinta)' }}>{proyecto?.nombre}</h1>
            <p className="text-sm" style={{ color: 'var(--tinta-500)' }}>
              {nomina.fecha_inicio?.replace(/-/g, '/')} — {nomina.fecha_fin?.replace(/-/g, '/')}
              {nomina.encargado ? ` · ${nomina.encargado}` : ''}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0 flex-wrap">
          {editable && (
            <Link href={`/dashboard/nomina/${nomina.id}/wizard?step=2`} className="btn-secondary flex items-center gap-1.5 py-2">
              <Wand2 className="w-4 h-4" /><span className="hidden sm:inline">Editar en wizard</span>
            </Link>
          )}
          {editable && (
            <button onClick={handleRecalcular} disabled={recalculando} className="btn-secondary flex items-center gap-1.5 py-2" title="Recalcular desde asistencias">
              <RefreshCw className={`w-4 h-4 ${recalculando ? 'animate-spin' : ''}`} /><span className="hidden sm:inline">{recalculando ? 'Calculando...' : 'Recalcular'}</span>
            </button>
          )}
          {lineasCalculadas.length > 0 && (
            <button onClick={() => setShowEnviarRecibos(true)} className="btn-secondary flex items-center gap-1.5 py-2">
              <Send className="w-4 h-4" /><span className="hidden sm:inline">Recibos</span>
            </button>
          )}
          <NominaExportMenu exporting={exporting} onExport={handleExport} />
          {nomina.estado === 'generada' && (
            <button onClick={() => setShowConfirmPago(true)} className="btn-primary flex items-center gap-1.5 py-2" style={{ background: 'var(--bosque-500)' }}>
              <CheckCircle className="w-4 h-4" /><span className="hidden sm:inline">Marcar pagada</span>
            </button>
          )}
        </div>
      </div>

      {msg && (
        <div className="flex items-center gap-2 text-sm p-3 rounded-xl mb-4" style={{ background: 'var(--petroleo-50)', border: '1px solid rgba(90,116,128,0.25)', color: 'var(--petroleo-300)' }}>
          <span className="flex-1">{msg}</span>
          <button onClick={() => setMsg('')}><X className="w-4 h-4" /></button>
        </div>
      )}
      {actionError && (
        <div className="flex items-start gap-2 text-sm p-3 rounded-xl mb-4" style={{ background: 'rgba(160,78,62,0.08)', border: '1px solid rgba(160,78,62,0.25)', color: 'var(--rojo-falta)' }}>
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" /><div className="flex-1">{actionError}</div>
          <button onClick={() => setActionError('')} className="shrink-0 opacity-60 hover:opacity-100"><X className="w-4 h-4" /></button>
        </div>
      )}

      {/* Totales */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        <div className="rounded-2xl p-4 text-center" style={{ border: '1px solid var(--border)' }}>
          <p className="font-mono font-bold" style={{ color: 'var(--tinta)' }}>{formatMXN(tots.manoObra)}</p>
          <p className="text-[10px] font-semibold uppercase tracking-widest mt-1" style={{ color: 'var(--tinta-500)' }}>Mano de obra</p>
        </div>
        <div className="rounded-2xl p-4 text-center" style={{ border: '1px solid var(--border)' }}>
          <p className="font-mono font-bold" style={{ color: 'var(--tinta)' }}>{formatMXN(tots.admins)}</p>
          <p className="text-[10px] font-semibold uppercase tracking-widest mt-1" style={{ color: 'var(--tinta-500)' }}>Administrativos</p>
        </div>
        <div className="rounded-2xl p-4 text-center" style={{ border: '1px solid var(--bosque-200, var(--border))', background: 'var(--bosque-50)' }}>
          <p className="font-mono font-bold" style={{ color: 'var(--bosque-600)' }}>{formatMXN(tots.total)}</p>
          <p className="text-[10px] font-semibold uppercase tracking-widest mt-1" style={{ color: 'var(--tinta-500)' }}>Total nómina</p>
        </div>
      </div>

      {/* Dirty banner */}
      {editable && isDirty && (
        <div className="flex items-center justify-between gap-3 text-sm px-3 py-2.5 rounded-xl mb-4"
          style={{ background: 'rgba(217,164,65,0.08)', border: '1px solid rgba(217,164,65,0.30)', color: 'var(--tinta-700)' }}>
          <span className="flex items-center gap-1.5"><AlertCircle className="w-4 h-4 shrink-0" /> Las asistencias cambiaron. Recalcula para actualizar.</span>
          <button onClick={handleRecalcular} disabled={recalculando} className="shrink-0 text-xs font-semibold underline">{recalculando ? 'Calculando...' : 'Recalcular'}</button>
        </div>
      )}

      {/* Desglose por trabajador */}
      {lineasCalculadas.length === 0 ? (
        <div className="rounded-2xl border border-dashed flex flex-col items-center justify-center py-12 gap-2" style={{ borderColor: 'var(--border)' }}>
          <AlertCircle className="w-8 h-8 opacity-30" style={{ color: 'var(--tinta)' }} />
          <p className="text-sm font-medium" style={{ color: 'var(--tinta-500)' }}>Esta nómina aún no se ha calculado.</p>
          {editable && <button onClick={handleRecalcular} className="btn-primary text-sm mt-1">Calcular ahora</button>}
        </div>
      ) : (
        <div className="space-y-2">
          {lineasCalculadas.map(lc => (
            <DesgloseTrabajador
              key={lc.trabajador_id}
              linea={lc as DesgloseLinea}
              action={
                <button onClick={() => openRecibo(lc)} title="Enviar recibo por WhatsApp" className="p-1.5 rounded-lg transition-colors hover:bg-green-50" style={{ color: '#16A34A' }}>
                  <Send className="w-3.5 h-3.5" />
                </button>
              }
            />
          ))}
        </div>
      )}

      {/* Actividades (solo lectura) */}
      {nomina.observaciones_actividades && (
        <div className="rounded-2xl border p-4 mt-4" style={{ borderColor: 'var(--border)' }}>
          <p className="text-[10px] font-semibold uppercase tracking-widest mb-1.5" style={{ color: 'var(--tinta-500)' }}>Actividades realizadas</p>
          <p className="text-sm whitespace-pre-wrap" style={{ color: 'var(--tinta)' }}>{nomina.observaciones_actividades}</p>
        </div>
      )}

      {/* Confirm pago modal */}
      {showConfirmPago && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="rounded-2xl shadow-2xl w-full max-w-sm p-6 space-y-4" style={{ background: 'var(--surface)' }}>
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: 'rgba(111,138,79,0.12)' }}>
                <CheckCircle className="w-5 h-5" style={{ color: 'var(--bosque-600)' }} />
              </div>
              <div>
                <h3 className="font-display font-semibold" style={{ color: 'var(--tinta)' }}>Confirmar pago</h3>
                <p className="text-sm mt-1" style={{ color: 'var(--tinta-500)' }}>Acción irreversible. La nómina quedará <strong>pagada</strong> y no podrá editarse.</p>
              </div>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setShowConfirmPago(false)} disabled={pagando} className="btn-secondary flex-1 text-sm">Cancelar</button>
              <button
                onClick={async () => {
                  setPagando(true)
                  const { error } = await supabase.from('periodos_nomina').update({ estado: 'pagada' }).eq('id', nomina.id)
                  if (!error) {
                    logAudit({ supabase, empresaId, tabla: 'periodos_nomina', operacion: 'nomina_pagada', registroId: nomina.id })
                    setNomina({ ...nomina, estado: 'pagada' as typeof nomina.estado })
                  }
                  setPagando(false); setShowConfirmPago(false)
                }}
                disabled={pagando} className="btn-primary flex-1 text-sm" style={{ background: 'var(--bosque-500)' }}>
                {pagando ? 'Guardando...' : 'Sí, marcar pagada'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Recibo individual modal */}
      {reciboModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="rounded-2xl shadow-2xl w-full max-w-md" style={{ background: 'var(--surface)' }}>
            <div className="flex items-center justify-between p-4 border-b" style={{ borderColor: 'var(--border)' }}>
              <div>
                <h3 className="font-display font-semibold" style={{ color: 'var(--tinta)' }}>Recibo de nómina</h3>
                <p className="text-xs mt-0.5" style={{ color: 'var(--tinta-500)' }}>{reciboModal.nombre}</p>
              </div>
              <button onClick={() => setReciboModal(null)}><X className="w-5 h-5" style={{ color: 'var(--tinta-500)' }} /></button>
            </div>
            <div className="p-4 space-y-4">
              <textarea readOnly value={reciboModal.text} rows={12}
                className="w-full text-xs font-mono rounded-lg p-3 resize-none focus:outline-none"
                style={{ background: 'var(--bg)', border: '1px solid var(--border)', color: 'var(--tinta)' }} />
              <div className="space-y-2">
                <label className="text-xs font-medium" style={{ color: 'var(--tinta-500)' }}>Teléfono WhatsApp del trabajador</label>
                <input type="tel" placeholder="10 dígitos, ej. 5512345678" value={reciboModal.phoneInput}
                  onChange={e => setReciboModal(m => m ? { ...m, phoneInput: e.target.value } : null)} className="input w-full text-sm" />
                {reciboErr && <p className="text-xs text-red-600">{reciboErr}</p>}
              </div>
              <button
                onClick={() => {
                  setReciboErr('')
                  const err = enviarReciboWhatsApp(reciboModal.phoneInput, reciboModal.text)
                  if (err) setReciboErr(err); else setReciboModal(null)
                }}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold text-white" style={{ background: '#22C55E' }}>
                <MessageCircle className="w-4 h-4" /> Enviar por WhatsApp
              </button>
            </div>
          </div>
        </div>
      )}

      {showEnviarRecibos && (
        <EnviarRecibosModal
          nomina={{ id: nomina.id, numero_nomina: nomina.numero_nomina, fecha_inicio: nomina.fecha_inicio, fecha_fin: nomina.fecha_fin }}
          proyecto={proyecto?.nombre ?? ''}
          empresaNombre={empresaNombre}
          lineasCalculadas={lineasCalculadas}
          trabajadoresMap={trabajadoresMap}
          onClose={() => setShowEnviarRecibos(false)}
        />
      )}
    </div>
  )
}
