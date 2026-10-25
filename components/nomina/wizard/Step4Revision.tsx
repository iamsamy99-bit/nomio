'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Save, ArrowRight, AlertTriangle } from 'lucide-react'
import { useWizard } from './WizardContext'
import AnomalyAlert from './AnomalyAlert'
import DesgloseTrabajador, { type DesgloseLinea } from '@/components/nomina/DesgloseTrabajador'
import { formatMXN } from '@/lib/utils'
import { detectAnomalies } from '@/lib/payroll/anomalies'
import { logAudit } from '@/lib/audit'
import type { CalculatedLine } from '@/lib/payroll/engine'

function LoadingState() {
  return (
    <div className="flex flex-col items-center justify-center gap-6 py-24">
      <div className="w-14 h-14 rounded-2xl flex items-center justify-center" style={{ background: 'var(--bosque-50, rgba(27,108,168,0.10))' }}>
        <div className="w-6 h-6 border-2 rounded-full animate-spin" style={{ borderColor: 'var(--bosque-200)', borderTopColor: 'var(--bosque-600)' }} />
      </div>
      <div className="text-center">
        <p className="font-semibold text-sm" style={{ color: 'var(--tinta)' }}>Calculando nómina</p>
        <p className="text-xs mt-1" style={{ color: 'var(--tinta-500)' }}>Procesando asistencias, tarifas y ajustes...</p>
      </div>
    </div>
  )
}

async function recalcular(periodoNominaId: string) {
  const res = await fetch('/api/payroll/recalcular', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ periodoNominaId }),
  })
  const body = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(body.error || 'Error al calcular la nómina. Verifica que haya asistencias registradas.')
  return body.result
}

export default function Step4Revision() {
  const { state, dispatch, supabase, navigateToStep } = useWizard()
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [action, setAction] = useState<'draft' | 'generar' | null>(null)

  const result = state.engineResult
  const hasErrors = state.anomalies.some(a => a.level === 'error')

  const run = async () => {
    if (!state.nominaId) return
    setLoading(true)
    setError('')
    try {
      const calc = await recalcular(state.nominaId)
      dispatch({ type: 'SET_ENGINE_RESULT', result: calc })

      const { data: prev } = await supabase
        .from('periodos_nomina')
        .select('total_nomina')
        .eq('proyecto_id', state.proyectoId)
        .neq('id', state.nominaId)
        .order('fecha_fin', { ascending: false })
        .limit(1)
        .maybeSingle()

      dispatch({
        type: 'SET_ANOMALIES',
        anomalies: detectAnomalies({
          engineResult: calc,
          horasExtra: state.horasExtra,
          previousTotal: prev?.total_nomina ?? null,
          trabajadores: state.trabajadores.map(t => ({ id: t.id, nombre: t.nombre })),
        }),
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error inesperado al calcular.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    run()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.nominaId])

  const finalizar = async (estado: 'en_progreso' | 'generada') => {
    if (!state.nominaId) return
    setAction(estado === 'generada' ? 'generar' : 'draft')
    setError('')
    const { error: e } = await supabase.from('periodos_nomina').update({ estado }).eq('id', state.nominaId)
    if (e) { setError(e.message); setAction(null); return }
    if (estado === 'generada') {
      logAudit({ supabase, empresaId: state.empresaId, tabla: 'periodos_nomina', operacion: 'nomina_generada', registroId: state.nominaId })
    }
    router.replace(`/dashboard/nomina/${state.nominaId}`)
  }

  if (loading) return <LoadingState />

  const totalDeducciones = result
    ? result.lines.reduce((s, l) => s + l.anticipos_descontados + l.conceptos_descuento + l.imss_obrero + l.isr_retenido, 0)
    : 0
  const totalBruto = result
    ? result.lines.reduce((s, l) => s + l.subtotal_base + l.total_horas_extra + l.conceptos_suma, 0)
    : 0

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="shrink-0 px-6 py-5 flex items-start justify-between gap-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.15em] mb-1" style={{ color: 'var(--tinta-500)' }}>
            Paso 4 de 4 — Revisión
          </p>
          <h2 className="font-display text-2xl sm:text-3xl" style={{ color: 'var(--tinta)' }}>
            Revisa y <em className="font-serif">genera.</em>
          </h2>
          <p className="text-xs mt-1" style={{ color: 'var(--tinta-500)' }}>
            Toca cada trabajador para ver el desglose completo de su pago.
          </p>
        </div>
        {result && (
          <div className="text-right shrink-0">
            <p className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: 'var(--tinta-500)' }}>Total a pagar</p>
            <p className="font-display text-3xl sm:text-4xl font-bold" style={{ color: 'var(--tinta)' }}>
              {formatMXN(result.total_nomina)}
            </p>
            <p className="text-[10px] font-mono" style={{ color: 'var(--tinta-500)' }}>{result.lines.length} trabajadores · MXN</p>
          </div>
        )}
      </div>

      <div className="flex-1 overflow-auto px-6 pb-6 space-y-4">
        {error && (
          <div className="rounded-xl p-4 space-y-3" style={{ background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.20)' }}>
            <p className="text-sm font-semibold" style={{ color: '#EF4444' }}>Error al calcular</p>
            <p className="text-sm" style={{ color: 'var(--tinta)' }}>{error}</p>
            <div className="flex gap-2 pt-1">
              <button onClick={() => navigateToStep(2)} className="btn-secondary text-xs py-1.5 px-3">Ir a Asistencias</button>
              <button onClick={run} className="btn-primary text-xs py-1.5 px-3">Reintentar</button>
            </div>
          </div>
        )}

        {/* Anomalías */}
        {state.anomalies.length > 0 && (
          <div className="space-y-2">
            {state.anomalies.map((a, i) => <AnomalyAlert key={i} anomaly={a} />)}
          </div>
        )}

        {result && (
          <>
            {/* Resumen cascada: bruto -> deducciones -> neto */}
            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-xl p-4 text-center" style={{ border: '1px solid var(--border)' }}>
                <p className="font-mono font-bold text-base" style={{ color: 'var(--tinta)' }}>{formatMXN(totalBruto)}</p>
                <p className="text-[10px] font-semibold uppercase tracking-widest mt-1" style={{ color: 'var(--tinta-500)' }}>Bruto</p>
              </div>
              <div className="rounded-xl p-4 text-center" style={{ border: '1px solid var(--border)' }}>
                <p className="font-mono font-bold text-base" style={{ color: 'var(--rojo-falta, #c0392b)' }}>
                  {totalDeducciones > 0 ? `-${formatMXN(totalDeducciones)}` : '$0'}
                </p>
                <p className="text-[10px] font-semibold uppercase tracking-widest mt-1" style={{ color: 'var(--tinta-500)' }}>Deducciones</p>
              </div>
              <div className="rounded-xl p-4 text-center" style={{ border: '1px solid var(--bosque-200, var(--border))', background: 'var(--bosque-50)' }}>
                <p className="font-mono font-bold text-base" style={{ color: 'var(--bosque-600)' }}>{formatMXN(result.total_nomina)}</p>
                <p className="text-[10px] font-semibold uppercase tracking-widest mt-1" style={{ color: 'var(--tinta-500)' }}>Neto</p>
              </div>
            </div>

            {/* Desglose por trabajador */}
            <div className="space-y-2">
              {result.lines.map((line: CalculatedLine) => (
                <DesgloseTrabajador key={line.trabajador_id} linea={line as DesgloseLinea} />
              ))}
            </div>

            {/* Acciones */}
            <div className="grid sm:grid-cols-2 gap-4 pt-1">
              <div className="rounded-2xl p-5 space-y-3" style={{ border: '1px solid var(--border)' }}>
                <div className="flex items-center gap-2">
                  <Save className="w-4 h-4" style={{ color: 'var(--tinta-500)' }} />
                  <h3 className="font-display font-semibold" style={{ color: 'var(--tinta)' }}>Guardar borrador</h3>
                </div>
                <p className="text-xs" style={{ color: 'var(--tinta-500)' }}>
                  Queda <strong>en progreso</strong>. Puedes seguir editándola en el wizard más tarde.
                </p>
                <button onClick={() => finalizar('en_progreso')} disabled={!!action}
                  className="w-full py-2.5 rounded-xl text-sm font-medium transition-colors"
                  style={{ border: '1px solid var(--border)', color: 'var(--tinta)' }}>
                  {action === 'draft' ? 'Guardando...' : 'Guardar borrador'}
                </button>
              </div>

              <div className="rounded-2xl p-5 space-y-3" style={{ background: 'var(--cuero-100, var(--bosque-50))', border: '1px solid var(--cuero-200, var(--border))' }}>
                <div className="flex items-center gap-2">
                  <ArrowRight className="w-4 h-4" style={{ color: 'var(--bosque-600)' }} />
                  <h3 className="font-display font-semibold" style={{ color: 'var(--tinta)' }}>Generar nómina</h3>
                </div>
                <p className="text-xs" style={{ color: 'var(--tinta-500)' }}>
                  Pasa a <strong>generada</strong>. Lista para exportar, enviar recibos y pagar.
                </p>
                <button onClick={() => finalizar('generada')} disabled={!!action || hasErrors}
                  className="w-full py-2.5 rounded-xl text-sm font-semibold text-white transition-colors disabled:opacity-50"
                  style={{ background: 'var(--bosque-500)' }}>
                  {action === 'generar' ? 'Generando...' : 'Generar nómina →'}
                </button>
              </div>
            </div>

            {hasErrors && (
              <div className="rounded-xl p-3 text-sm flex items-start gap-2"
                style={{ background: 'rgba(224,82,82,0.06)', border: '1px solid rgba(224,82,82,0.15)', color: 'var(--rojo-falta, #c0392b)' }}>
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>Hay errores que debes resolver antes de generar. Regresa a los pasos anteriores.</span>
              </div>
            )}
          </>
        )}
      </div>

      {/* Footer nav */}
      <div className="shrink-0 flex items-center justify-start px-6 py-4 border-t"
        style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}>
        <button onClick={() => navigateToStep(3)} className="flex items-center gap-1.5 text-sm font-medium" style={{ color: 'var(--tinta-500)' }}>
          <ArrowLeft className="w-4 h-4" /> Ajustes
        </button>
      </div>
    </div>
  )
}
