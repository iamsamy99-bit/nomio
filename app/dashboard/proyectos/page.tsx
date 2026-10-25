'use client'
import { useEffect, useState, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useEmpresa } from '@/components/layout/EmpresaContext'
import { Plus, FolderOpen, Edit2, X, AlertCircle, Trash2, Upload, ExternalLink } from 'lucide-react'
import { SkeletonCard } from '@/components/ui/Skeleton'
import ProyectoRemindersPanel from '@/components/proyectos/ProyectoRemindersPanel'
import type { ProyectoRecordatorio } from '@/types'
import Link from 'next/link'
import { sanitizeText, formatDate } from '@/lib/utils'
import type { Proyecto, Empresa } from '@/types'

const DIAS_LABEL: Record<string, string> = {
  '5_dias': '5 días/sem',
  '6_dias': '6 días/sem',
  '7_dias': '7 días/sem',
}

export default function ProyectosPage() {
  const supabase = useMemo(() => createClient(), [])
  const [proyectos, setProyectos] = useState<Proyecto[]>([])
  const [recordatorios, setRecordatorios] = useState<ProyectoRecordatorio[]>([])
  const { empresaId, empresa, rol, userName } = useEmpresa()
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<Proyecto | null>(null)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [form, setForm] = useState({
    nombre: '', encargado: '', descripcion: '', dias_laborales_semana: '6_dias',
    color_etiqueta: '#1B4F72', fecha_inicio: '', fecha_fin_estimada: '',
  })

  useEffect(() => { loadData() }, [])

  const loadData = async () => {
    try {
      const [{ data }, { data: recs }] = await Promise.all([
        supabase.from('proyectos').select('*').eq('empresa_id', empresaId).order('created_at', { ascending: false }),
        supabase.from('proyecto_recordatorios').select('*, proyectos(nombre), clientes(nombre)').eq('empresa_id', empresaId).eq('completado', false).order('fecha_recordatorio'),
      ])
      const proyectosData = rol === 'capataz' && userName
        ? (data || []).filter(p => !p.encargado || p.encargado.toLowerCase().includes(userName.toLowerCase()))
        : (data || [])
      setProyectos(proyectosData)
      setRecordatorios((recs || []) as ProyectoRecordatorio[])
    } catch (err) {
      console.error('Error cargando proyectos:', err)
    } finally {
      setLoading(false)
    }
  }

  const openNew = () => {
    const activos = proyectos.filter(p => p.activo).length
    if (empresa && activos >= empresa.limite_proyectos) {
      setError(`Límite de ${empresa.limite_proyectos} proyecto(s) en tu plan. Actualiza para crear más.`)
      return
    }
    setEditing(null); setError('')
    setForm({ nombre: '', encargado: '', descripcion: '', dias_laborales_semana: '6_dias', color_etiqueta: '#1B4F72', fecha_inicio: '', fecha_fin_estimada: '' })
    setShowForm(true)
  }

  const openEdit = (p: Proyecto) => {
    setEditing(p); setError('')
    setForm({
      nombre: p.nombre, encargado: p.encargado, descripcion: p.descripcion || '',
      dias_laborales_semana: p.dias_laborales_semana, color_etiqueta: p.color_etiqueta,
      fecha_inicio: p.fecha_inicio || '', fecha_fin_estimada: p.fecha_fin_estimada || '',
    })
    setShowForm(true)
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true); setError('')
    const payload = {
      nombre: sanitizeText(form.nombre), encargado: sanitizeText(form.encargado),
      descripcion: form.descripcion ? sanitizeText(form.descripcion) : null,
      dias_laborales_semana: form.dias_laborales_semana, color_etiqueta: form.color_etiqueta,
      fecha_inicio: form.fecha_inicio || null,
      fecha_fin_estimada: form.fecha_fin_estimada || null,
    }
    const { error: saveErr } = editing
      ? await supabase.from('proyectos').update(payload).eq('id', editing.id)
      : await supabase.from('proyectos').insert({ ...payload, empresa_id: empresaId })
    setSaving(false)
    if (saveErr) { setError(`No se pudo guardar: ${saveErr.message}`); return }
    setShowForm(false); await loadData()
  }

  const toggleActivo = async (p: Proyecto) => {
    await supabase.from('proyectos').update({ activo: !p.activo }).eq('id', p.id)
    loadData()
  }

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return
    const XLSX = await import('xlsx')
    const buffer = await file.arrayBuffer()
    const wb = XLSX.read(buffer, { type: 'array' })
    const ws = wb.Sheets[wb.SheetNames[0]]
    const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws)


    const mapDias = (s: string): string => {
      const v = (s || '').toLowerCase()
      if (v.includes('7') || v.includes('lunes a domingo')) return '7_dias'
      if (v.includes('5') || v.includes('lunes a viernes')) return '5_dias'
      return '6_dias'
    }

    const payload = rows.map(r => ({
      empresa_id: empresaId,
      nombre: String(r.Nombre || r.nombre || '').trim(),
      encargado: String(r.Encargado || r.encargado || '').trim(),
      descripcion: r.Descripcion ? String(r.Descripcion).trim() : null,
      dias_laborales_semana: mapDias(String(r['Dias Laborales'] || r.dias_laborales || '')),
      color_etiqueta: String(r.Color || '#1B4F72'),
      activo: true,
    })).filter(p => p.nombre)

    if (!payload.length) { setError('No se encontraron proyectos válidos en el archivo.'); e.target.value = ''; return }
    const { error: impErr } = await supabase.from('proyectos').insert(payload)
    if (impErr) setError(`Error al importar: ${impErr.message}`)
    else { await loadData() }
    e.target.value = ''
  }

  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)

  const handleDelete = async (p: Proyecto) => {
    if (confirmDelete !== p.id) { setConfirmDelete(p.id); return }
    setConfirmDelete(null)
    setDeleting(p.id)
    setError('')
    const { error: err } = await supabase.from('proyectos').delete().eq('id', p.id)
    if (err) { setError(`No se pudo eliminar: ${err.message}`); setDeleting(null); return }
    setProyectos(prev => prev.filter(x => x.id !== p.id))
    setDeleting(null)
  }

  if (loading) return (
    <div className="max-w-5xl mx-auto space-y-4">
      <div className="flex items-center justify-between mb-2">
        <div className="h-8 w-36 rounded-xl animate-pulse" style={{ background: 'var(--border)' }} />
        <div className="h-9 w-36 rounded-xl animate-pulse" style={{ background: 'var(--border)' }} />
      </div>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {[1, 2, 3, 4, 5, 6].map(i => <SkeletonCard key={i} />)}
      </div>
    </div>
  )

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-display text-2xl font-bold text-ink">Proyectos</h1>
          <p className="text-sm text-ink-soft mt-0.5">{proyectos.filter(p => p.activo).length} activos</p>
        </div>
        {rol !== 'capataz' && (
          <div className="flex items-center gap-2">
            <label className="btn-secondary flex items-center gap-1 cursor-pointer text-xs py-1.5">
              <Upload className="w-3.5 h-3.5" /> Importar
              <input type="file" accept=".xlsx,.xls,.csv" onChange={handleImport} className="hidden" />
            </label>
            <button onClick={openNew} className="btn-primary flex items-center gap-2"><Plus className="w-4 h-4" /> Nuevo</button>
          </div>
        )}
      </div>

      {error && !showForm && <div className="flex items-center gap-2 bg-red-50 text-red-700 text-sm p-3 rounded-lg mb-4"><AlertCircle className="w-4 h-4 shrink-0" />{error}</div>}

      {rol === 'capataz' && (
        <div className="flex items-center gap-2 bg-blue-50 text-blue-700 text-sm p-3 rounded-lg mb-4">
          <AlertCircle className="w-4 h-4 shrink-0" />
          Mostrando proyectos donde estas asignado como encargado.
        </div>
      )}

      {empresaId && (
        <ProyectoRemindersPanel
          proyectos={proyectos}
          recordatorios={recordatorios}
          empresaId={empresaId}
          supabase={supabase}
          onReload={loadData}
        />
      )}

      {!proyectos.length ? (
        <div className="card text-center py-16">
          <FolderOpen className="w-12 h-12 mx-auto text-gray-300 mb-3" />
          <p className="text-ink-soft mb-4">{rol === 'capataz' ? 'No tienes proyectos asignados como encargado.' : 'No hay proyectos registrados.'}</p>
          {rol !== 'capataz' && <button onClick={openNew} className="btn-primary">Crear primer proyecto</button>}
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 gap-4">
          {proyectos.map(p => (
            <div key={p.id} className={`card relative ${!p.activo ? 'opacity-60' : ''}`}>
              <Link href={`/dashboard/proyectos/${p.id}`} className="absolute inset-0 rounded-xl z-0" aria-label={`Ver ${p.nombre}`} tabIndex={-1} />
              <div className="absolute top-0 left-0 w-1 h-full rounded-l-xl" style={{ backgroundColor: p.color_etiqueta }} />
              <div className="pl-3 relative z-10">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div>
                    <Link href={`/dashboard/proyectos/${p.id}`} className="hover:underline">
                      <h3 className="font-display font-semibold" style={{ color: 'var(--tinta)' }}>{p.nombre}</h3>
                    </Link>
                    <p className="text-xs" style={{ color: 'var(--tinta-500)' }}>Encargado: {p.encargado}</p>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <Link href={`/dashboard/proyectos/${p.id}`} className="p-1.5 rounded hover:bg-gray-100 flex items-center" style={{ color: 'var(--tinta-500)' }} title="Ver detalle">
                      <ExternalLink className="w-3.5 h-3.5" />
                    </Link>
                    {rol !== 'capataz' && (
                      <>
                        <button onClick={() => openEdit(p)} className="p-1.5 rounded hover:bg-gray-100" style={{ color: 'var(--tinta-500)' }}><Edit2 className="w-3.5 h-3.5" /></button>
                        <button onClick={() => toggleActivo(p)} className="p-1.5 rounded hover:bg-gray-100 text-xs font-medium" style={{ color: 'var(--tinta-500)' }}>
                          {p.activo ? 'Pausar' : 'Activar'}
                        </button>
                        {confirmDelete === p.id ? (
                          <div className="flex items-center gap-1">
                            <button onClick={() => handleDelete(p)} disabled={deleting === p.id}
                              className="text-xs text-red-600 font-medium hover:text-red-700 px-1 py-1.5">
                              {deleting === p.id ? '...' : 'Confirmar'}
                            </button>
                            <button onClick={() => setConfirmDelete(null)} className="text-xs px-1 py-1.5" style={{ color: 'var(--tinta-500)' }}>
                              Cancelar
                            </button>
                          </div>
                        ) : (
                          <button onClick={() => handleDelete(p)} disabled={deleting === p.id}
                            className="p-1.5 rounded hover:bg-red-50 hover:text-red-500 transition-colors" style={{ color: 'var(--tinta-500)' }}>
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </>
                    )}
                  </div>
                </div>
                {p.descripcion && <p className="text-xs mt-1" style={{ color: 'var(--tinta-500)' }}>{p.descripcion}</p>}
                <div className="flex items-center gap-3 mt-3 text-xs flex-wrap" style={{ color: 'var(--tinta-500)' }}>
                  <span>{DIAS_LABEL[p.dias_laborales_semana] || '6 días/sem'}</span>
                  {p.fecha_fin_estimada && <span>Fin: {formatDate(p.fecha_fin_estimada)}</span>}
                  <span className={p.activo ? 'text-green-600 font-medium' : 'text-gray-400'}>● {p.activo ? 'Activo' : 'Inactivo'}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/40">
          <div className="bg-surface rounded-2xl w-full max-w-lg">
            <div className="flex items-center justify-between p-5 border-b border-border">
              <h2 className="font-display font-bold text-ink">{editing ? 'Editar' : 'Nuevo'} proyecto</h2>
              <button onClick={() => setShowForm(false)}><X className="w-5 h-5 text-ink-soft" /></button>
            </div>
            <form onSubmit={handleSave} className="p-5 space-y-4">
              {error && <div className="flex items-center gap-2 bg-red-50 text-red-700 text-sm p-3 rounded-lg"><AlertCircle className="w-4 h-4 shrink-0" />{error}</div>}
              <div><label className="label">Nombre *</label><input value={form.nombre} onChange={e => setForm({ ...form, nombre: e.target.value })} className="input" required maxLength={100} /></div>
              <div><label className="label">Encargado *</label><input value={form.encargado} onChange={e => setForm({ ...form, encargado: e.target.value })} className="input" required maxLength={100} /></div>
              <div><label className="label">Descripción</label><textarea value={form.descripcion} onChange={e => setForm({ ...form, descripcion: e.target.value })} className="input h-20 resize-none" maxLength={300} /></div>
              <div><label className="label">Días laborales</label>
                <select value={form.dias_laborales_semana} onChange={e => setForm({ ...form, dias_laborales_semana: e.target.value })} className="input">
                  <option value="6_dias">6 días (Lunes a Sábado)</option>
                  <option value="5_dias">5 días (Lunes a Viernes)</option>
                  <option value="7_dias">7 días (Lunes a Domingo)</option>
                </select>
              </div>
              <div className="grid sm:grid-cols-2 gap-3">
                <div><label className="label">Inicio (opcional)</label><input type="date" value={form.fecha_inicio} onChange={e => setForm({ ...form, fecha_inicio: e.target.value })} className="input" /></div>
                <div><label className="label">Fin estimado</label><input type="date" value={form.fecha_fin_estimada} onChange={e => setForm({ ...form, fecha_fin_estimada: e.target.value })} className="input" /></div>
              </div>
              <div><label className="label">Color de etiqueta</label>
                <div className="flex items-center gap-3"><input type="color" value={form.color_etiqueta} onChange={e => setForm({ ...form, color_etiqueta: e.target.value })} className="w-10 h-10 rounded cursor-pointer border border-border" /><span className="text-sm text-ink-soft">{form.color_etiqueta}</span></div>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowForm(false)} className="btn-secondary flex-1">Cancelar</button>
                <button type="submit" disabled={saving} className="btn-primary flex-1">{saving ? 'Guardando...' : 'Guardar'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
