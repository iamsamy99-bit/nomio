'use client'

import { useEffect, useState, useMemo } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useEmpresa } from '@/components/layout/EmpresaContext'
import { ArrowLeft, Plus, AlertCircle, Trash2, Loader2, Upload } from 'lucide-react'
import { formatMXN, formatDate, sanitizeText, hoyISO } from '@/lib/utils'
import ImportWizardModal from '@/components/import/ImportWizardModal'

type Categoria = 'materiales' | 'transporte' | 'herramientas' | 'otro'

interface GastoProyecto {
  id: string
  empresa_id: string
  proyecto_id: string
  monto: number
  descripcion: string
  categoria: Categoria
  foto_url: string | null
  fecha: string
  registrado_por: string | null
  created_at: string
}

interface Proyecto {
  id: string
  nombre: string
  color_etiqueta: string
}

const CATEGORIAS: { value: Categoria; label: string }[] = [
  { value: 'materiales', label: 'Materiales' },
  { value: 'transporte', label: 'Transporte' },
  { value: 'herramientas', label: 'Herramientas' },
  { value: 'otro', label: 'Otro' },
]

const BADGE_COLORS: Record<Categoria, string> = {
  materiales:  'bg-blue-100 text-blue-700',
  transporte:  'bg-yellow-100 text-yellow-700',
  herramientas: 'bg-purple-100 text-purple-700',
  otro:        'bg-gray-100 text-gray-600',
}

const todayISO = () => hoyISO()

const EMPTY_FORM = {
  descripcion: '',
  monto: '',
  categoria: 'materiales' as Categoria,
  fecha: todayISO(),
}

export default function GastosPage() {
  const params = useParams()
  const router = useRouter()
  const proyectoId = params.id as string

  const supabase = useMemo(() => createClient(), [])

  const [proyecto, setProyecto] = useState<Proyecto | null>(null)
  const [gastos, setGastos] = useState<GastoProyecto[]>([])
  const { empresaId, empresaUserId } = useEmpresa()

  const [loading, setLoading] = useState(true)
  const [showImport, setShowImport] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(EMPTY_FORM)

  // confirm-inline delete: null | gastoId
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)
  const [deleting, setDeleting] = useState<string | null>(null)

  useEffect(() => {
    loadData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [proyectoId])

  const loadData = async () => {
    setLoading(true)
    try {
      const { data: proy, error: proyErr } = await supabase
        .from('proyectos')
        .select('id, nombre, color_etiqueta')
        .eq('id', proyectoId)
        .eq('empresa_id', empresaId)
        .single()

      if (proyErr || !proy) {
        setError('No se pudo cargar el proyecto.')
        return
      }
      setProyecto(proy)

      const { data: gastosData, error: gastosErr } = await supabase
        .from('gastos_proyecto')
        .select('*')
        .eq('empresa_id', empresaId)
        .eq('proyecto_id', proyectoId)
        .order('fecha', { ascending: false })

      if (gastosErr) {
        setError('No se pudieron cargar los gastos.')
        return
      }
      setGastos(gastosData || [])
    } catch (err) {
      console.error('Error cargando datos:', err)
      setError('Error inesperado al cargar los datos.')
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!empresaId) return

    const montoNum = parseFloat(form.monto)
    if (isNaN(montoNum) || montoNum < 0.01) {
      setError('El monto debe ser mayor a 0.')
      return
    }

    setSaving(true)
    setError('')
    try {
      const { error: insertErr } = await supabase.from('gastos_proyecto').insert({
        empresa_id: empresaId,
        proyecto_id: proyectoId,
        descripcion: sanitizeText(form.descripcion),
        monto: montoNum,
        categoria: form.categoria,
        fecha: form.fecha,
        registrado_por: empresaUserId,
      })

      if (insertErr) {
        setError(`No se pudo guardar el gasto: ${insertErr.message}`)
        return
      }

      setShowForm(false)
      setForm(EMPTY_FORM)
      await loadData()
    } catch (err) {
      console.error('Error guardando gasto:', err)
      setError('Error inesperado al guardar el gasto.')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (confirmDelete !== id) {
      setConfirmDelete(id)
      return
    }
    setDeleting(id)
    setError('')
    try {
      const { error: delErr } = await supabase
        .from('gastos_proyecto')
        .delete()
        .eq('id', id)
        .eq('empresa_id', empresaId ?? '')

      if (delErr) {
        setError(`No se pudo eliminar el gasto: ${delErr.message}`)
        return
      }
      setConfirmDelete(null)
      await loadData()
    } catch (err) {
      console.error('Error eliminando gasto:', err)
      setError('Error inesperado al eliminar.')
    } finally {
      setDeleting(null)
    }
  }

  // Stats
  const totalGastos = gastos.reduce((sum, g) => sum + g.monto, 0)
  const countByCategoria = CATEGORIAS.map(c => ({
    ...c,
    count: gastos.filter(g => g.categoria === c.value).length,
    total: gastos.filter(g => g.categoria === c.value).reduce((s, g) => s + g.monto, 0),
  })).filter(c => c.count > 0)

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-400">
        <Loader2 className="w-6 h-6 animate-spin mr-2" />
        Cargando...
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-2 text-sm mb-3" style={{ color: 'var(--tinta-500)' }}>
          <button
            onClick={() => router.push(`/dashboard/proyectos/${proyectoId}`)}
            className="flex items-center gap-1 transition-colors hover:opacity-80"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <span>Proyectos</span>
          <span>&gt;</span>
          <span>{proyecto?.nombre ?? '...'}</span>
          <span>&gt;</span>
          <span className="font-medium" style={{ color: 'var(--tinta)' }}>Gastos</span>
        </div>

        <div className="flex items-center gap-3">
          <div
            className="w-1.5 h-8 rounded-full shrink-0"
            style={{ backgroundColor: proyecto?.color_etiqueta ?? '#1B4F72' }}
          />
          <h1 className="font-display text-2xl font-bold" style={{ color: 'var(--tinta)' }}>
            Gastos - {proyecto?.nombre ?? ''}
          </h1>
        </div>
      </div>

      {/* Error banner */}
      {error && (
        <div className="flex items-center gap-2 bg-red-50 text-red-700 text-sm p-3 rounded-lg mb-4">
          <AlertCircle className="w-4 h-4 shrink-0" />
          {error}
        </div>
      )}

      {/* Stats strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <div className="card text-center py-3 px-4">
          <p className="text-xs mb-1" style={{ color: 'var(--tinta-500)' }}>Total gastos</p>
          <p className="font-mono font-bold text-sm" style={{ color: 'var(--tinta)' }}>{formatMXN(totalGastos)}</p>
          <p className="text-xs" style={{ color: 'var(--tinta-500)' }}>{gastos.length} registros</p>
        </div>
        {countByCategoria.map(c => (
          <div key={c.value} className="card text-center py-3 px-4">
            <p className="text-xs mb-1" style={{ color: 'var(--tinta-500)' }}>{c.label}</p>
            <p className="font-mono font-bold text-sm" style={{ color: 'var(--tinta)' }}>{formatMXN(c.total)}</p>
            <p className="text-xs" style={{ color: 'var(--tinta-500)' }}>{c.count} registro{c.count !== 1 ? 's' : ''}</p>
          </div>
        ))}
      </div>

      {/* Registrar / importar gasto */}
      <div className="flex justify-end gap-2 mb-4">
        <button onClick={() => setShowImport(true)} className="btn-secondary flex items-center gap-2">
          <Upload className="w-4 h-4" /> Importar
        </button>
        <button
          onClick={() => { setShowForm(true); setError(''); setForm(EMPTY_FORM) }}
          className="btn-primary flex items-center gap-2"
        >
          <Plus className="w-4 h-4" /> Registrar gasto
        </button>
      </div>

      {showImport && (
        <ImportWizardModal
          schemaId="gastos"
          empresaId={empresaId ?? ''}
          fixed={{ proyecto_id: proyectoId }}
          onClose={() => setShowImport(false)}
          onDone={() => { setShowImport(false); loadData() }}
        />
      )}

      {/* Inline form */}
      {showForm && (
        <div className="card mb-6 border border-blue-200 bg-blue-50/30">
          <h2 className="font-display font-semibold mb-4" style={{ color: 'var(--tinta)' }}>Nuevo gasto</h2>
          <form onSubmit={handleSave} className="space-y-4">
            <div>
              <label className="label">Descripcion *</label>
              <input
                value={form.descripcion}
                onChange={e => setForm({ ...form, descripcion: e.target.value })}
                className="input"
                required
                maxLength={300}
                placeholder="Describe el gasto..."
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">Monto (MXN) *</label>
                <input
                  type="number"
                  value={form.monto}
                  onChange={e => setForm({ ...form, monto: e.target.value })}
                  className="input"
                  required
                  min="0.01"
                  step="0.01"
                  placeholder="0.00"
                />
              </div>
              <div>
                <label className="label">Fecha *</label>
                <input
                  type="date"
                  value={form.fecha}
                  onChange={e => setForm({ ...form, fecha: e.target.value })}
                  className="input"
                  required
                />
              </div>
            </div>
            <div>
              <label className="label">Categoria</label>
              <select
                value={form.categoria}
                onChange={e => setForm({ ...form, categoria: e.target.value as Categoria })}
                className="input"
              >
                {CATEGORIAS.map(c => (
                  <option key={c.value} value={c.value}>{c.label}</option>
                ))}
              </select>
            </div>
            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => { setShowForm(false); setError('') }}
                className="btn-secondary flex-1"
              >
                Cancelar
              </button>
              <button type="submit" disabled={saving} className="btn-primary flex-1">
                {saving ? 'Guardando...' : 'Guardar'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* List */}
      {gastos.length === 0 ? (
        <div className="card text-center py-16">
          <p className="text-gray-400 text-4xl mb-4">$</p>
          <p className="mb-4" style={{ color: 'var(--tinta-500)' }}>No hay gastos registrados para este proyecto.</p>
          <button
            onClick={() => { setShowForm(true); setForm(EMPTY_FORM) }}
            className="btn-primary"
          >
            Registrar primer gasto
          </button>
        </div>
      ) : (
        <div className="card overflow-hidden p-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-xs uppercase tracking-wide" style={{ background: 'var(--surface-2)', color: 'var(--tinta-500)' }}>
                <th className="text-left px-4 py-3 font-medium">Fecha</th>
                <th className="text-left px-4 py-3 font-medium">Categoría</th>
                <th className="text-left px-4 py-3 font-medium">Descripción</th>
                <th className="text-right px-4 py-3 font-medium">Monto</th>
                <th className="px-4 py-3 w-28"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {gastos.map(g => (
                <tr key={g.id} className="hover:bg-gray-50/50 transition-colors">
                  <td className="px-4 py-3 whitespace-nowrap" style={{ color: 'var(--tinta-500)' }}>
                    {formatDate(g.fecha)}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${BADGE_COLORS[g.categoria]}`}>
                      {CATEGORIAS.find(c => c.value === g.categoria)?.label ?? g.categoria}
                    </span>
                  </td>
                  <td className="px-4 py-3" style={{ color: 'var(--tinta)' }}>{g.descripcion}</td>
                  <td className="px-4 py-3 text-right font-mono font-medium whitespace-nowrap" style={{ color: 'var(--tinta)' }}>
                    {formatMXN(g.monto)}
                  </td>
                  <td className="px-4 py-3">
                    {confirmDelete === g.id ? (
                      <div className="flex items-center gap-1 justify-end">
                        <button
                          onClick={() => handleDelete(g.id)}
                          disabled={deleting === g.id}
                          className="text-xs text-red-600 font-medium hover:text-red-700 disabled:opacity-50"
                        >
                          {deleting === g.id ? 'Eliminando...' : 'Eliminar'}
                        </button>
                        <span className="text-gray-300">|</span>
                        <button
                          onClick={() => setConfirmDelete(null)}
                          className="text-xs"
                          style={{ color: 'var(--tinta-500)' }}
                        >
                          Cancelar
                        </button>
                      </div>
                    ) : (
                      <div className="flex justify-end">
                        <button
                          onClick={() => setConfirmDelete(g.id)}
                          className="p-1.5 rounded hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
