'use client'
import { useMemo, useState } from 'react'
import { X, FileText, Calculator } from 'lucide-react'
import { formatMXN, hoyISO } from '@/lib/utils'
import { calcularFiniquito, salarioDiarioDeModalidad, type TipoBaja } from '@/lib/payroll/finiquito'
import { descargarFiniquitoPDF } from '@/lib/export/finiquito-pdf'
import type { Trabajador } from '@/types'

const hoy = () => hoyISO()

interface Props {
  trabajador: Trabajador
  empresaNombre: string
  onClose: () => void
}

export default function FiniquitoModal({ trabajador, empresaNombre, onClose }: Props) {
  const [fechaIngreso, setFechaIngreso] = useState(trabajador.fecha_ingreso || '')
  const [fechaBaja, setFechaBaja] = useState(hoy())
  const [tipoBaja, setTipoBaja] = useState<TipoBaja>('renuncia')
  const [salarioDiario, setSalarioDiario] = useState(String(salarioDiarioDeModalidad(trabajador) || ''))
  const [diasPendientes, setDiasPendientes] = useState('0')
  const [vacacionesTomadas, setVacacionesTomadas] = useState('0')
  const [aguinaldoDias, setAguinaldoDias] = useState('15')
  const [primaVacPct, setPrimaVacPct] = useState('25')
  const [salarioMinimo, setSalarioMinimo] = useState('278.80')

  const num = (s: string) => { const n = parseFloat(s); return isNaN(n) ? 0 : n }

  const valido = !!fechaIngreso && !!fechaBaja && fechaBaja >= fechaIngreso && num(salarioDiario) > 0

  const result = useMemo(() => {
    if (!valido) return null
    return calcularFiniquito({
      salarioDiario: num(salarioDiario),
      fechaIngreso, fechaBaja, tipoBaja,
      diasPendientes: num(diasPendientes),
      vacacionesTomadas: num(vacacionesTomadas),
      aguinaldoDias: num(aguinaldoDias),
      primaVacacionalPct: num(primaVacPct) / 100,
      salarioMinimo: num(salarioMinimo),
    })
  }, [valido, salarioDiario, fechaIngreso, fechaBaja, tipoBaja, diasPendientes, vacacionesTomadas, aguinaldoDias, primaVacPct, salarioMinimo])

  const descargar = () => {
    if (!result) return
    descargarFiniquitoPDF({
      empresaNombre,
      trabajadorNombre: trabajador.nombre,
      puesto: trabajador.puesto,
      fechaIngreso, fechaBaja, tipoBaja, result,
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4" style={{ background: 'rgba(0,0,0,0.5)' }}>
      <div className="w-full sm:max-w-3xl rounded-t-2xl sm:rounded-2xl flex flex-col max-h-[92vh]" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
        <div className="flex items-center justify-between px-5 py-4 border-b shrink-0" style={{ borderColor: 'var(--border)' }}>
          <div>
            <h2 className="font-display font-semibold text-base" style={{ color: 'var(--tinta)' }}>Finiquito / liquidación</h2>
            <p className="text-xs mt-0.5" style={{ color: 'var(--tinta-500)' }}>{trabajador.nombre}</p>
          </div>
          <button onClick={onClose}><X className="w-5 h-5" style={{ color: 'var(--tinta-500)' }} /></button>
        </div>

        <div className="overflow-y-auto flex-1 p-5 grid lg:grid-cols-[1fr_320px] gap-5">
          {/* Formulario */}
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div><label className="label">Fecha de ingreso *</label><input type="date" value={fechaIngreso} onChange={e => setFechaIngreso(e.target.value)} className="input" /></div>
              <div><label className="label">Fecha de baja *</label><input type="date" value={fechaBaja} min={fechaIngreso} onChange={e => setFechaBaja(e.target.value)} className="input" /></div>
            </div>

            <div>
              <label className="label">Tipo de baja</label>
              <div className="flex rounded-xl border overflow-hidden" style={{ borderColor: 'var(--border)' }}>
                <button type="button" onClick={() => setTipoBaja('renuncia')} className="flex-1 py-2.5 text-xs font-semibold transition-all"
                  style={tipoBaja === 'renuncia' ? { background: 'var(--bosque-500)', color: '#fff' } : { color: 'var(--tinta-500)' }}>
                  Renuncia / término
                </button>
                <button type="button" onClick={() => setTipoBaja('despido_injustificado')} className="flex-1 py-2.5 text-xs font-semibold transition-all border-l"
                  style={tipoBaja === 'despido_injustificado' ? { background: 'var(--rojo-falta)', color: '#fff', borderColor: 'var(--border)' } : { color: 'var(--tinta-500)', borderColor: 'var(--border)' }}>
                  Despido injustificado
                </button>
              </div>
              <p className="text-[11px] mt-1" style={{ color: 'var(--tinta-500)' }}>
                {tipoBaja === 'despido_injustificado'
                  ? 'Incluye indemnización (90 días + 20 días/año) y prima de antigüedad.'
                  : 'Solo partes proporcionales. Prima de antigüedad solo si hay ≥15 años.'}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div><label className="label">Salario diario *</label><input type="number" min="0" step="0.01" value={salarioDiario} onChange={e => setSalarioDiario(e.target.value)} className="input" /></div>
              <div><label className="label">Días trabajados pendientes</label><input type="number" min="0" step="0.5" value={diasPendientes} onChange={e => setDiasPendientes(e.target.value)} className="input" /></div>
            </div>

            <details className="rounded-xl border" style={{ borderColor: 'var(--border)' }}>
              <summary className="px-3 py-2 text-xs font-semibold cursor-pointer" style={{ color: 'var(--tinta-500)' }}>Supuestos (editables)</summary>
              <div className="px-3 pb-3 grid grid-cols-2 gap-3">
                <div><label className="label">Vacaciones ya tomadas (días)</label><input type="number" min="0" step="0.5" value={vacacionesTomadas} onChange={e => setVacacionesTomadas(e.target.value)} className="input" /></div>
                <div><label className="label">Días de aguinaldo</label><input type="number" min="0" value={aguinaldoDias} onChange={e => setAguinaldoDias(e.target.value)} className="input" /></div>
                <div><label className="label">Prima vacacional (%)</label><input type="number" min="0" value={primaVacPct} onChange={e => setPrimaVacPct(e.target.value)} className="input" /></div>
                <div><label className="label">Salario mínimo diario</label><input type="number" min="0" step="0.01" value={salarioMinimo} onChange={e => setSalarioMinimo(e.target.value)} className="input" /></div>
              </div>
            </details>
          </div>

          {/* Resultado */}
          <div className="rounded-2xl border p-4" style={{ borderColor: 'var(--border)', background: 'var(--surface-2)' }}>
            {!result ? (
              <div className="flex flex-col items-center justify-center gap-2 py-10 text-center">
                <Calculator className="w-8 h-8 opacity-30" style={{ color: 'var(--tinta)' }} />
                <p className="text-xs" style={{ color: 'var(--tinta-500)' }}>Captura fecha de ingreso, baja y salario para calcular.</p>
              </div>
            ) : (
              <div className="space-y-2">
                <p className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: 'var(--tinta-500)' }}>Antigüedad {result.antiguedadTexto}</p>
                {result.lineas.map((l, i) => (
                  <div key={i} className="flex items-center justify-between gap-2 text-xs">
                    <span style={{ color: 'var(--tinta-700)' }}>{l.concepto}</span>
                    <span className="font-mono" style={{ color: 'var(--tinta)' }}>{formatMXN(l.monto)}</span>
                  </div>
                ))}
                <div className="border-t pt-2 mt-2 flex items-center justify-between" style={{ borderColor: 'var(--border)' }}>
                  <span className="font-display font-semibold text-sm" style={{ color: 'var(--tinta)' }}>Total a pagar</span>
                  <span className="font-mono font-bold text-base" style={{ color: 'var(--bosque-600)' }}>{formatMXN(result.total)}</span>
                </div>
                <button onClick={descargar} className="btn-primary w-full flex items-center justify-center gap-2 mt-3" style={{ background: 'var(--bosque-500)' }}>
                  <FileText className="w-4 h-4" /> Descargar PDF
                </button>
                <p className="text-[10px] leading-snug mt-2" style={{ color: 'var(--tinta-500)' }}>
                  Estimación conforme a la LFT. Valídala con tu contador antes de pagar.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
