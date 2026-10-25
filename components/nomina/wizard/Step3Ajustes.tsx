'use client'
import { useState } from 'react'
import { Plus, Trash2, ArrowLeft, ArrowRight, TrendingUp, TrendingDown, Wallet } from 'lucide-react'
import { useWizard } from './WizardContext'
import { formatMXN } from '@/lib/utils'

const QUICK_CHIPS: { label: string; tipo: 'suma' | 'descuento' }[] = [
  { label: 'Préstamo', tipo: 'descuento' },
  { label: 'Bono', tipo: 'suma' },
  { label: 'Viáticos', tipo: 'suma' },
  { label: 'Finiquito', tipo: 'suma' },
  { label: 'Descuento', tipo: 'descuento' },
]

export default function Step3Ajustes() {
  const { state, dispatch, supabase, navigateToStep } = useWizard()
  const [form, setForm] = useState({
    nombre: '', tipo: 'suma' as 'suma' | 'descuento',
    aplica_a: 'nomina_total' as 'nomina_total' | 'trabajador_individual',
    trabajador_id: '',
    monto: '',
    descripcion: '',
  })
  const [adding, setAdding] = useState(false)
  const [error, setError] = useState('')

  const handleAdd = async () => {
    const monto = parseFloat(form.monto)
    if (!form.nombre.trim() || isNaN(monto) || monto <= 0) {
      setError('Completa el nombre y un monto válido'); return
    }
    if (form.aplica_a === 'trabajador_individual' && !form.trabajador_id) {
      setError('Selecciona un trabajador'); return
    }
    setAdding(true); setError('')
    try {
      const row = {
        empresa_id: state.empresaId,
        nomina_id: state.nominaId!,
        nombre: form.nombre.trim(),
        tipo: form.tipo,
        aplica_a: form.aplica_a,
        trabajador_id: form.aplica_a === 'trabajador_individual' ? form.trabajador_id : null,
        monto,
        descripcion: form.descripcion.trim() || null,
      }
      const { data, error: insErr } = await supabase.from('conceptos_adicionales').insert(row).select().single()
      if (insErr || !data) { setError(insErr?.message || 'Error al agregar concepto'); return }
      dispatch({ type: 'SET_CONCEPTOS', conceptos: [...state.conceptos, data as never] })
      setForm({ nombre: '', tipo: 'suma', aplica_a: 'nomina_total', trabajador_id: '', monto: '', descripcion: '' })
    } finally {
      setAdding(false)
    }
  }

  const handleRemove = async (id: string) => {
    await supabase.from('conceptos_adicionales').delete().eq('id', id)
    dispatch({ type: 'SET_CONCEPTOS', conceptos: state.conceptos.filter(c => c.id !== id) })
  }

  const totalSumas = state.conceptos.filter(c => c.tipo === 'suma').reduce((s, c) => s + c.monto, 0)
  const totalDescuentos = state.conceptos.filter(c => c.tipo === 'descuento').reduce((s, c) => s + c.monto, 0)
  const totalAnticipos = state.anticipos.reduce((s, a) => s + a.monto, 0)
  const neto = totalSumas - totalDescuentos - totalAnticipos
  const hasResumen = totalSumas > 0 || totalDescuentos > 0 || totalAnticipos > 0

  return (
    <div className="flex flex-col h-full">
      <div className="shrink-0 px-5 py-3.5 border-b" style={{ borderColor: 'var(--divider)' }}>
        <h2 className="font-display font-semibold" style={{ color: 'var(--ink)' }}>Ajustes y gastos</h2>
        <p className="text-xs mt-0.5" style={{ color: 'var(--stone)' }}>Bonos, descuentos y otros conceptos. Opcional.</p>
      </div>

      <div className="flex-1 overflow-auto p-4 sm:p-5">
        {/* Quick-add pills */}
        <div className="flex gap-2 flex-wrap mb-5">
          {QUICK_CHIPS.map(chip => (
            <button key={chip.label} type="button"
              onClick={() => setForm(f => ({ ...f, nombre: chip.label, tipo: chip.tipo }))}
              className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-full border font-medium transition-all"
              style={form.nombre === chip.label
                ? { background: 'var(--primary)', color: '#fff', borderColor: 'var(--primary)' }
                : { borderColor: 'var(--border-bright)', color: 'var(--ink-soft)', background: 'var(--surface)' }}>
              <Plus className="w-3 h-3" />{chip.label}
            </button>
          ))}
        </div>

        <div className="lg:grid lg:grid-cols-[1fr_340px] lg:gap-5 lg:items-start">
          {/* Left: conceptos list + anticipos */}
          <div className="order-2 lg:order-1 space-y-4 mt-4 lg:mt-0">
            {state.conceptos.length === 0 && state.anticipos.length === 0 && (
              <div className="rounded-2xl border border-dashed flex flex-col items-center justify-center py-12 gap-2"
                style={{ borderColor: 'var(--border-bright)' }}>
                <TrendingUp className="w-8 h-8 opacity-20" style={{ color: 'var(--tinta)' }} />
                <p className="text-sm font-medium" style={{ color: 'var(--stone)' }}>Sin conceptos agregados</p>
                <p className="text-xs" style={{ color: 'var(--stone-soft)' }}>Usa los accesos rápidos o completa el formulario</p>
              </div>
            )}

            {state.conceptos.length > 0 && (
              <div className="rounded-2xl border overflow-hidden" style={{ borderColor: 'var(--border)' }}>
                <div className="px-4 py-2.5 border-b" style={{ background: 'var(--stone-bg)', borderColor: 'var(--border)' }}>
                  <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--ink)' }}>
                    Conceptos ({state.conceptos.length})
                  </span>
                </div>
                <div className="divide-y" style={{ borderColor: 'var(--border)' }}>
                  {state.conceptos.map(c => (
                    <div key={c.id} className="flex items-center gap-3 px-4 py-3 group transition-colors"
                      style={{ background: 'var(--surface)' }}
                      onMouseEnter={e => (e.currentTarget.style.background = 'var(--table-hover)')}
                      onMouseLeave={e => (e.currentTarget.style.background = 'var(--surface)')}>
                      <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
                        style={c.tipo === 'suma'
                          ? { background: 'var(--bosque-50)', color: 'var(--bosque-500)' }
                          : { background: 'rgba(160,78,62,0.10)', color: 'var(--rojo-falta)' }}>
                        {c.tipo === 'suma' ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate" style={{ color: 'var(--ink)' }}>{c.nombre}</p>
                        {c.aplica_a === 'trabajador_individual' && (
                          <p className="text-xs" style={{ color: 'var(--stone)' }}>
                            {state.trabajadores.find(t => t.id === c.trabajador_id)?.nombre ?? 'Trabajador'}
                          </p>
                        )}
                        {c.descripcion && <p className="text-xs truncate" style={{ color: 'var(--stone)' }}>{c.descripcion}</p>}
                      </div>
                      <span className="font-mono text-sm font-semibold"
                        style={{ color: c.tipo === 'suma' ? 'var(--bosque-500)' : 'var(--rojo-falta)' }}>
                        {c.tipo === 'suma' ? '+' : '-'}{formatMXN(c.monto)}
                      </span>
                      <button onClick={() => handleRemove(c.id)}
                        className="opacity-0 group-hover:opacity-100 transition-opacity shrink-0 p-1 rounded-lg"
                        style={{ color: 'var(--stone-soft)' }}>
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {state.anticipos.length > 0 && (
              <div className="rounded-2xl border overflow-hidden" style={{ borderColor: 'var(--border)' }}>
                <div className="px-4 py-2.5 border-b flex items-center gap-2" style={{ background: 'var(--stone-bg)', borderColor: 'var(--border)' }}>
                  <Wallet className="w-3.5 h-3.5" style={{ color: 'var(--stone)' }} />
                  <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--ink)' }}>
                    Anticipos
                  </span>
                  <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full ml-1"
                    style={{ background: 'var(--primary-glow)', color: 'var(--primary)' }}>
                    AUTO
                  </span>
                </div>
                <div className="divide-y" style={{ borderColor: 'var(--border)' }}>
                  {state.anticipos.map(a => (
                    <div key={a.id} className="flex items-center justify-between px-4 py-3"
                      style={{ background: 'var(--surface)' }}>
                      <p className="text-sm" style={{ color: 'var(--ink)' }}>
                        {(a.trabajadores as { nombre: string } | null)?.nombre ?? 'Trabajador'}
                      </p>
                      <span className="font-mono text-sm font-semibold" style={{ color: 'var(--rojo-falta)' }}>
                        -{formatMXN(a.monto)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Right: form + resumen */}
          <div className="order-1 lg:order-2 space-y-4">
            <div className="rounded-2xl border p-4 space-y-3" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
              <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--ink)' }}>Agregar concepto</p>

              {error && (
                <p className="text-xs px-3 py-2 rounded-lg" style={{ color: 'var(--rojo-falta)', background: 'rgba(160,78,62,0.08)' }}>
                  {error}
                </p>
              )}

              <div>
                <label className="label">Nombre *</label>
                <input value={form.nombre} onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))}
                  className="input" maxLength={80} placeholder="Ej. Bono de productividad" />
              </div>

              <div>
                <label className="label">Tipo *</label>
                <div className="flex rounded-xl border overflow-hidden" style={{ borderColor: 'var(--border)' }}>
                  <button type="button" onClick={() => setForm(f => ({ ...f, tipo: 'suma' }))}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-semibold transition-all"
                    style={form.tipo === 'suma'
                      ? { background: 'var(--bosque-500)', color: '#fff' }
                      : { color: 'var(--ink-soft)' }}>
                    <TrendingUp className="w-3.5 h-3.5" /> Suma
                  </button>
                  <button type="button" onClick={() => setForm(f => ({ ...f, tipo: 'descuento' }))}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-semibold transition-all border-l"
                    style={form.tipo === 'descuento'
                      ? { background: 'var(--rojo-falta)', color: '#fff', borderColor: 'var(--border)' }
                      : { color: 'var(--ink-soft)', borderColor: 'var(--border)' }}>
                    <TrendingDown className="w-3.5 h-3.5" /> Descuento
                  </button>
                </div>
              </div>

              <div>
                <label className="label">Monto *</label>
                <input type="number" min="0" step="0.01" value={form.monto}
                  onChange={e => setForm(f => ({ ...f, monto: e.target.value }))}
                  className="input" placeholder="0.00" />
              </div>

              <div>
                <label className="label">Aplica a</label>
                <select value={form.aplica_a}
                  onChange={e => setForm(f => ({ ...f, aplica_a: e.target.value as 'nomina_total' | 'trabajador_individual' }))}
                  className="input">
                  <option value="nomina_total">Nómina total</option>
                  <option value="trabajador_individual">Trabajador individual</option>
                </select>
              </div>

              {form.aplica_a === 'trabajador_individual' && (
                <div>
                  <label className="label">Trabajador *</label>
                  <select value={form.trabajador_id}
                    onChange={e => setForm(f => ({ ...f, trabajador_id: e.target.value }))}
                    className="input">
                    <option value="">Seleccionar...</option>
                    {state.trabajadores.map(t => <option key={t.id} value={t.id}>{t.nombre}</option>)}
                  </select>
                </div>
              )}

              <div>
                <label className="label">Notas (opcional)</label>
                <input value={form.descripcion} onChange={e => setForm(f => ({ ...f, descripcion: e.target.value }))}
                  className="input" maxLength={200} placeholder="Descripción breve..." />
              </div>

              <button onClick={handleAdd} disabled={adding}
                className="btn-primary w-full flex items-center gap-2 justify-center py-2.5">
                {adding ? (
                  <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Agregando...</>
                ) : (
                  <><Plus className="w-4 h-4" /> Agregar</>
                )}
              </button>
            </div>

            {hasResumen && (
              <div className="rounded-2xl border p-4 space-y-2" style={{ borderColor: 'var(--border)', background: 'var(--stone-bg)' }}>
                <p className="text-xs font-semibold uppercase tracking-wide mb-3" style={{ color: 'var(--ink)' }}>Resumen</p>
                {totalSumas > 0 && (
                  <div className="flex justify-between text-sm">
                    <span style={{ color: 'var(--stone)' }}>Sumas</span>
                    <span className="font-mono font-semibold" style={{ color: 'var(--bosque-500)' }}>+{formatMXN(totalSumas)}</span>
                  </div>
                )}
                {totalDescuentos > 0 && (
                  <div className="flex justify-between text-sm">
                    <span style={{ color: 'var(--stone)' }}>Descuentos</span>
                    <span className="font-mono font-semibold" style={{ color: 'var(--rojo-falta)' }}>-{formatMXN(totalDescuentos)}</span>
                  </div>
                )}
                {totalAnticipos > 0 && (
                  <div className="flex justify-between text-sm">
                    <span style={{ color: 'var(--stone)' }}>Anticipos</span>
                    <span className="font-mono font-semibold" style={{ color: 'var(--rojo-falta)' }}>-{formatMXN(totalAnticipos)}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm pt-2 border-t" style={{ borderColor: 'var(--border)' }}>
                  <span className="font-semibold" style={{ color: 'var(--ink)' }}>Neto</span>
                  <span className="font-mono font-bold"
                    style={{ color: neto >= 0 ? 'var(--bosque-500)' : 'var(--rojo-falta)' }}>
                    {neto >= 0 ? '+' : ''}{formatMXN(neto)}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="shrink-0 flex items-center justify-between px-5 py-3.5 border-t gap-3"
        style={{ borderColor: 'var(--divider)', background: 'var(--surface)' }}>
        <button onClick={() => navigateToStep(2)} className="btn-secondary flex items-center gap-1.5">
          <ArrowLeft className="w-4 h-4" /> Anterior
        </button>
        <div className="flex items-center gap-3">
          <button onClick={() => navigateToStep(4)} className="btn-secondary text-sm" style={{ color: 'var(--stone)' }}>
            Omitir este paso
          </button>
          <button onClick={() => navigateToStep(4)} className="btn-primary flex items-center gap-1.5">
            Siguiente <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  )
}
