'use client'
import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useEmpresa } from '@/components/layout/EmpresaContext'
import { Plus, X, AlertCircle, Wallet, CheckCircle, Clock, XCircle, Filter, Trash2 } from 'lucide-react'
import { formatMXN, formatDate, sanitizeText } from '@/lib/utils'
import { logAudit } from '@/lib/audit'
import { toast } from 'sonner'

type Trabajador = { id: string; nombre: string }
type Proyecto   = { id: string; nombre: string }

type Anticipo = {
  id: string
  trabajador_id: string
  proyecto_id: string | null
  monto: number
  estado: 'pendiente' | 'aprobado' | 'rechazado' | 'descontado'
  notas: string | null
  solicitado_at: string
  aprobado_at: string | null
  trabajadores?: { nombre: string } | null
  proyectos?: { nombre: string } | null
}

const ESTADO_STYLE: Record<string, { bgStyle: React.CSSProperties; textStyle: React.CSSProperties; icon: React.ElementType; label: string }> = {
  pendiente:  {
    bgStyle: { background: 'rgba(217,164,65,0.12)', border: '1px solid rgba(217,164,65,0.25)' },
    textStyle: { color: 'var(--ambar)' },
    icon: Clock, label: 'Pendiente',
  },
  aprobado:   {
    bgStyle: { background: 'rgba(90,116,128,0.12)', border: '1px solid rgba(90,116,128,0.25)' },
    textStyle: { color: 'var(--petroleo-300)' },
    icon: CheckCircle, label: 'Aprobado',
  },
  descontado: {
    bgStyle: { background: 'var(--bosque-50)', border: '1px solid rgba(111,138,79,0.25)' },
    textStyle: { color: 'var(--verde-ok)' },
    icon: CheckCircle, label: 'Descontado',
  },
  rechazado:  {
    bgStyle: { background: '#F5DAD5', border: '1px solid rgba(160,78,62,0.25)' },
    textStyle: { color: 'var(--rojo-falta)' },
    icon: XCircle, label: 'Rechazado',
  },
}

export default function AnticiposPage() {
  const supabase = createClient()
  const [anticipos, setAnticipos] = useState<Anticipo[]>([])
  const [trabajadores, setTrabajadores] = useState<Trabajador[]>([])
  const [proyectos, setProyectos] = useState<Proyecto[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const { empresaId } = useEmpresa()
  const [filtro, setFiltro] = useState<'todos' | 'pendiente' | 'aprobado' | 'descontado'>('todos')
  const [deleting, setDeleting] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [form, setForm] = useState({ trabajadorId: '', proyectoId: '', monto: '', notas: '' })

  const loadData = useCallback(async () => {
    try {
      const [antsRes, tsRes, psRes] = await Promise.all([
        supabase.from('anticipos')
          .select('*, trabajadores(nombre), proyectos(nombre)')
          .eq('empresa_id', empresaId)
          .order('solicitado_at', { ascending: false }),
        supabase.from('trabajadores')
          .select('id, nombre')
          .eq('empresa_id', empresaId)
          .eq('activo', true)
          .order('nombre'),
        supabase.from('proyectos')
          .select('id, nombre')
          .eq('empresa_id', empresaId)
          .eq('activo', true)
          .order('nombre'),
      ])

      setAnticipos((antsRes.data as Anticipo[]) || [])
      setTrabajadores((tsRes.data as Trabajador[]) || [])
      setProyectos((psRes.data as Proyecto[]) || [])
      setLoading(false)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error desconocido')
      setLoading(false)
    }
  }, [supabase, empresaId])

  useEffect(() => { loadData() }, [loadData])

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.trabajadorId || !form.monto) return
    setSaving(true)
    setError('')

    const { error: insErr } = await supabase.from('anticipos').insert({
      empresa_id: empresaId,
      trabajador_id: form.trabajadorId,
      proyecto_id: form.proyectoId || null,
      monto: parseFloat(form.monto),
      notas: form.notas ? sanitizeText(form.notas) : null,
      estado: 'aprobado',
      aprobado_at: new Date().toISOString(),
    })

    if (insErr) {
      setError(insErr.message)
      setSaving(false)
      return
    }

    setSaving(false)
    setShowForm(false)
    setForm({ trabajadorId: '', proyectoId: '', monto: '', notas: '' })
    await loadData()
  }

  const cambiarEstado = async (id: string, estado: Anticipo['estado']) => {
    const update: Record<string, unknown> = { estado }
    if (estado === 'aprobado') update.aprobado_at = new Date().toISOString()
    const { error: updErr } = await supabase.from('anticipos').update(update).eq('id', id)
    if (updErr) { toast.error(`Error al cambiar estado: ${updErr.message}`); return }
    if (estado === 'aprobado' || estado === 'rechazado') {
      logAudit({ supabase, empresaId, tabla: 'anticipos', operacion: estado === 'aprobado' ? 'anticipo_aprobado' : 'anticipo_rechazado', registroId: id })
    }
    toast.success(`Estado actualizado`)
    setAnticipos(prev => prev.map(a => a.id === id ? { ...a, ...update } as Anticipo : a))
  }

  const handleDelete = async (a: Anticipo) => {
    if (!confirm(`¿Eliminar este anticipo de ${formatMXN(a.monto)}?`)) return
    setDeleting(a.id)
    const { error: err } = await supabase.from('anticipos').delete().eq('id', a.id)
    if (err) { toast.error(`Error: ${err.message}`); setDeleting(null); return }
    toast.success('Anticipo eliminado')
    setAnticipos(prev => prev.filter(x => x.id !== a.id))
    setDeleting(null)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-6 h-6 border-2 rounded-full animate-spin" style={{ borderColor: 'var(--border)', borderTopColor: 'var(--primary)' }} />
      </div>
    )
  }

  if (error) {
    return (
      <div className="max-w-md mx-auto mt-12">
        <div className="tile bg-red-50 border-red-200">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-red-900">Error al cargar</p>
              <p className="text-sm text-red-700 mt-1">{error}</p>
              <button onClick={() => { setError(''); setLoading(true); loadData(); }}
                className="mt-3 text-sm font-semibold text-red-700 hover:underline">Reintentar</button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  const filtrados = filtro === 'todos' ? anticipos : anticipos.filter(a => a.estado === filtro)
  const totalPendiente = anticipos.filter(a => a.estado === 'pendiente' || a.estado === 'aprobado')
    .reduce((s, a) => s + Number(a.monto), 0)
  const totalDescontado = anticipos.filter(a => a.estado === 'descontado').reduce((s, a) => s + Number(a.monto), 0)
  const totalRegistrado = anticipos.reduce((s, a) => s + Number(a.monto), 0)

  return (
    <div className="max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold">Anticipos y Deuda</h1>
          <p className="text-sm text-ink-soft mt-0.5">Préstamos y anticipos de nómina por trabajador</p>
        </div>
        <button onClick={() => setShowForm(true)} className="btn-primary flex items-center gap-2">
          <Plus className="w-4 h-4" /> Registrar anticipo
        </button>
      </div>

      {/* Resumen */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-5 animate-fade-in-up">
        <div className="card text-center py-5" style={{ background: 'rgba(90,116,128,0.08)', border: '1px solid rgba(90,116,128,0.2)' }}>
          <p className="caption mb-1">Por cobrar</p>
          <p className="font-display text-3xl font-bold" style={{ color: 'var(--petroleo-300)' }}>{formatMXN(totalPendiente)}</p>
          <p className="text-xs mt-1" style={{ color: 'var(--tinta-500)' }}>
            {anticipos.filter(a => ['pendiente','aprobado'].includes(a.estado)).length} anticipo(s)
          </p>
        </div>
        <div className="card text-center py-5" style={{ background: 'var(--bosque-50)', border: '1px solid rgba(111,138,79,0.2)' }}>
          <p className="caption mb-1">Ya descontado</p>
          <p className="font-display text-3xl font-bold" style={{ color: 'var(--verde-ok)' }}>{formatMXN(totalDescontado)}</p>
          <p className="text-xs mt-1" style={{ color: 'var(--tinta-500)' }}>
            {anticipos.filter(a => a.estado === 'descontado').length} anticipo(s)
          </p>
        </div>
        <div className="card text-center py-5" style={{ background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
          <p className="caption mb-1">Total registrado</p>
          <p className="font-display text-3xl font-bold" style={{ color: 'var(--tinta)' }}>{formatMXN(totalRegistrado)}</p>
          <p className="text-xs mt-1" style={{ color: 'var(--tinta-500)' }}>{anticipos.length} registro(s)</p>
        </div>
      </div>

      {/* Filtros */}
      <div className="flex items-center gap-2 mb-4 flex-wrap">
        <Filter className="w-3.5 h-3.5 text-ink-soft" />
        {(['todos','pendiente','aprobado','descontado'] as const).map(f => (
          <button key={f} onClick={() => setFiltro(f)}
            className={`text-xs px-3 py-1.5 rounded-full font-medium capitalize transition-all ${
              filtro === f
                ? 'bg-primary text-white shadow-sm'
                : 'bg-surface/60 text-ink-soft hover:bg-surface/90 backdrop-blur-sm border border-border'
            }`}>
            {f === 'todos' ? 'Todos' : ESTADO_STYLE[f].label}
          </button>
        ))}
      </div>

      {/* Lista */}
      {!filtrados.length ? (
        <div className="tile text-center py-12">
          <Wallet className="w-10 h-10 mx-auto mb-3" style={{ color: 'var(--tinta-300)' }} />
          <p className="text-ink-soft">
            {anticipos.length === 0
              ? 'No hay anticipos registrados aún. Crea el primero.'
              : `No hay anticipos con estado "${filtro}".`}
          </p>
          {anticipos.length === 0 && (
            <button onClick={() => setShowForm(true)} className="btn-primary mt-4 inline-flex items-center gap-2">
              <Plus className="w-4 h-4" /> Crear primer anticipo
            </button>
          )}
        </div>
      ) : (
        <div className="tile p-0 overflow-hidden">
          <div className="divide-y" style={{ borderColor: 'var(--border)' }}>
            {filtrados.map(a => {
              const est = ESTADO_STYLE[a.estado]
              const Icon = est.icon
              return (
                <div key={a.id} className="flex items-center gap-3 px-4 py-3.5 hover:bg-[var(--table-hover)] transition-colors">
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={est.bgStyle}>
                    <Icon className="w-4 h-4" style={est.textStyle} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold text-sm" style={{ color: 'var(--tinta)' }}>
                        {a.trabajadores?.nombre || '—'}
                      </p>
                      <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ ...est.bgStyle, ...est.textStyle }}>
                        {est.label}
                      </span>
                      {a.proyectos && (
                        <span className="text-xs" style={{ color: 'var(--tinta-500)' }}>· {a.proyectos.nombre}</span>
                      )}
                    </div>
                    <p className="text-xs mt-0.5" style={{ color: 'var(--tinta-500)' }}>
                      {formatDate(a.solicitado_at)}
                      {a.notas && ` · ${a.notas}`}
                    </p>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <p className="font-mono font-bold" style={{ color: 'var(--accent)' }}>{formatMXN(Number(a.monto))}</p>
                    <div className="flex gap-1">
                      {a.estado === 'pendiente' && (
                        <button onClick={() => cambiarEstado(a.id, 'aprobado')}
                          className="text-xs px-2.5 py-1 rounded-lg transition-colors font-semibold"
                          style={{ background: 'rgba(90,116,128,0.12)', color: 'var(--petroleo-300)' }}>
                          Aprobar
                        </button>
                      )}
                      {a.estado === 'aprobado' && (
                        <button onClick={() => cambiarEstado(a.id, 'descontado')}
                          className="text-xs px-2.5 py-1 rounded-lg transition-colors font-semibold"
                          style={{ background: 'var(--bosque-50)', color: 'var(--verde-ok)' }}>
                          Descontar
                        </button>
                      )}
                      {(a.estado === 'pendiente' || a.estado === 'aprobado') && (
                        <button onClick={() => cambiarEstado(a.id, 'rechazado')}
                          className="text-xs px-2.5 py-1 rounded-lg transition-colors font-semibold"
                          style={{ background: '#F5DAD5', color: 'var(--rojo-falta)' }}>
                          Rechazar
                        </button>
                      )}
                      <button onClick={() => handleDelete(a)} disabled={deleting === a.id}
                        className="p-1.5 rounded-lg transition-colors"
                        style={{ color: 'var(--tinta-300)' }}>
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 backdrop-blur-sm" style={{ background: 'rgba(26,23,20,0.45)' }}>
          <div className="rounded-2xl w-full max-w-md shadow-2xl" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
            <div className="flex items-center justify-between p-5 border-b border-border">
              <h2 className="font-display font-bold">Registrar anticipo</h2>
              <button onClick={() => setShowForm(false)}>
                <X className="w-5 h-5 text-stone-400" />
              </button>
            </div>
            <form onSubmit={handleSave} className="p-5 space-y-4">
              <div>
                <label className="label">Trabajador *</label>
                <select value={form.trabajadorId}
                  onChange={e => setForm({...form, trabajadorId: e.target.value})}
                  className="input" required>
                  <option value="">Selecciona un trabajador...</option>
                  {trabajadores.map(t => <option key={t.id} value={t.id}>{t.nombre}</option>)}
                </select>
                {trabajadores.length === 0 && (
                  <p className="text-xs mt-1.5" style={{ color: 'var(--ambar)' }}>Primero registra trabajadores activos.</p>
                )}
              </div>
              <div>
                <label className="label">Proyecto (opcional)</label>
                <select value={form.proyectoId}
                  onChange={e => setForm({...form, proyectoId: e.target.value})}
                  className="input">
                  <option value="">Sin proyecto específico</option>
                  {proyectos.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
                </select>
              </div>
              <div>
                <label className="label">Monto MXN *</label>
                <input type="number" step="0.01" min="0.01"
                  value={form.monto} onChange={e => setForm({...form, monto: e.target.value})}
                  className="input" placeholder="0.00" required />
              </div>
              <div>
                <label className="label">Notas (opcional)</label>
                <input value={form.notas}
                  onChange={e => setForm({...form, notas: e.target.value})}
                  className="input" placeholder="Ej: Anticipo semanal..." maxLength={200} />
              </div>
              <div className="flex items-start gap-2 rounded-xl p-3" style={{ background: 'rgba(217,164,65,0.10)', border: '1px solid rgba(217,164,65,0.2)' }}>
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" style={{ color: 'var(--ambar)' }} />
                <p className="text-xs" style={{ color: 'var(--tinta-500)' }}>
                  El anticipo queda como <strong>Aprobado</strong>.
                  Cámbialo a <strong>Descontado</strong> al aplicarlo en una nómina.
                </p>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowForm(false)} className="btn-secondary flex-1">
                  Cancelar
                </button>
                <button type="submit" disabled={saving || trabajadores.length === 0}
                  className="btn-primary flex-1">
                  {saving ? 'Guardando...' : 'Registrar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
