'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useEmpresa } from '@/components/layout/EmpresaContext'
import { Bell, Plus, AlertCircle } from 'lucide-react'
import ReminderList from '@/components/recordatorios/ReminderList'
import { buildReminderFeed, kindLabel } from '@/lib/recordatorios/feed'
import { requestReminderNotificationPermission } from '@/lib/recordatorios/browser-notify'
import type { Cliente, Cotizacion, Proyecto, ProyectoRecordatorio, RecordatorioCategoria } from '@/types'

export default function RecordatoriosPage() {
  const supabase = useMemo(() => createClient(), [])
  const { empresaId } = useEmpresa()
  const [proyectos, setProyectos] = useState<Proyecto[]>([])
  const [recordatorios, setRecordatorios] = useState<ProyectoRecordatorio[]>([])
  const [cotizaciones, setCotizaciones] = useState<Cotizacion[]>([])
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [filtro, setFiltro] = useState<'todos' | 'obra' | 'contacto' | 'cotizacion' | 'crm'>('todos')
  const [notifyOn, setNotifyOn] = useState(false)

  const [form, setForm] = useState({
    titulo: '', fecha: '', categoria: 'obra' as RecordatorioCategoria,
    proyecto_id: '', cliente_id: '', notas: '',
  })

  const load = useCallback(async () => {
    setError('')
    try {
      const [p, r, c, cl] = await Promise.all([
        supabase.from('proyectos').select('*').eq('empresa_id', empresaId).order('nombre'),
        supabase.from('proyecto_recordatorios').select('*, proyectos(nombre), clientes(nombre)').eq('empresa_id', empresaId).eq('completado', false).order('fecha_recordatorio'),
        supabase.from('cotizaciones').select('id, titulo, numero_cotizacion, cliente_nombre, fecha_validez, estado, total, moneda').eq('empresa_id', empresaId).not('fecha_validez', 'is', null).in('estado', ['borrador', 'enviada']),
        supabase.from('clientes').select('id, nombre, tipo, ultimo_contacto_at, activo').eq('empresa_id', empresaId).eq('activo', true),
      ])

      setProyectos(p.data || [])
      setRecordatorios((r.data || []) as ProyectoRecordatorio[])
      setCotizaciones((c.data || []) as Cotizacion[])
      setClientes((cl.data || []) as Cliente[])
    } catch {
      setError('No se pudieron cargar los recordatorios.')
    } finally { setLoading(false) }
  }, [supabase, empresaId])

  useEffect(() => { load() }, [load])

  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      setNotifyOn(Notification.permission === 'granted')
    }
  }, [])

  const allItems = useMemo(
    () => buildReminderFeed({ proyectos, recordatorios, cotizaciones, clientes }),
    [proyectos, recordatorios, cotizaciones, clientes],
  )

  const items = useMemo(() => {
    if (filtro === 'todos') return allItems
    if (filtro === 'crm') return allItems.filter(i => i.kind === 'seguimiento_contacto')
    if (filtro === 'obra') return allItems.filter(i => i.categoria === 'obra' || i.kind === 'proyecto_fin' || i.kind === 'manual')
    if (filtro === 'contacto') return allItems.filter(i => i.categoria === 'contacto' || i.kind === 'seguimiento_contacto')
    if (filtro === 'cotizacion') return allItems.filter(i => i.kind === 'cotizacion_vence' || i.categoria === 'cotizacion')
    return allItems
  }, [allItems, filtro])

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!empresaId || !form.titulo.trim() || !form.fecha) return
    setSaving(true); setError('')
    const { error: insErr } = await supabase.from('proyecto_recordatorios').insert({
      empresa_id: empresaId, titulo: form.titulo.trim(), fecha_recordatorio: form.fecha,
      categoria: form.categoria, proyecto_id: form.proyecto_id || null,
      cliente_id: form.cliente_id || null, notas: form.notas.trim() || null, completado: false,
    })
    setSaving(false)
    if (insErr) { setError(insErr.message); return }
    setForm({ titulo: '', fecha: '', categoria: 'obra', proyecto_id: '', cliente_id: '', notas: '' })
    setShowForm(false)
    await load()
  }

  const markComplete = async (id: string) => {
    await supabase.from('proyecto_recordatorios').update({ completado: true }).eq('id', id)
    await load()
  }

  const enableNotify = async () => {
    const p = await requestReminderNotificationPermission()
    setNotifyOn(p === 'granted')
    if (p === 'denied') setError('Permiso de notificaciones denegado en el navegador.')
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-6 h-6 border-2 rounded-full animate-spin" style={{ borderColor: 'var(--border)', borderTopColor: 'var(--primary)' }} />
      </div>
    )
  }

  const FILTROS = [
    { key: 'todos', label: 'Todos' },
    { key: 'obra', label: 'Obra' },
    { key: 'contacto', label: 'Contacto' },
    { key: 'cotizacion', label: 'Cotizacion' },
    { key: 'crm', label: 'Crm' },
  ] as const

  return (
    <div className="max-w-5xl mx-auto pb-10">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="h-px w-8" style={{ background: 'var(--border)' }} />
            <span className="text-[10px] font-semibold uppercase tracking-[0.15em]" style={{ color: 'var(--tinta-500)' }}>
              Recordatorios · /dashboard/recordatorios
            </span>
          </div>
          <h1 className="font-display text-3xl font-bold" style={{ color: 'var(--tinta)' }}>Recordatorios</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--tinta-500)' }}>
            Feed automatico: vencimiento de cotizaciones, deadlines de obra, seguimiento de contactos.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {!notifyOn && (
            <button type="button" onClick={enableNotify}
              className="flex items-center gap-1.5 text-xs px-3 py-2 rounded-lg transition-colors"
              style={{ border: '1px solid var(--border)', color: 'var(--tinta-500)' }}>
              <Bell className="w-3.5 h-3.5" /> Activar notificaciones
            </button>
          )}
          <button type="button" onClick={() => setShowForm(!showForm)}
            className="flex items-center gap-1.5 text-sm px-4 py-2 rounded-xl font-semibold text-white transition-colors"
            style={{ background: 'var(--bosque-500)' }}>
            <Plus className="w-4 h-4" /> Nuevo recordatorio
          </button>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 text-sm p-3 rounded-xl mb-4"
          style={{ background: 'rgba(224,82,82,0.06)', color: '#c0392b', border: '1px solid rgba(224,82,82,0.15)' }}>
          <AlertCircle className="w-4 h-4 shrink-0" /> {error}
        </div>
      )}

      {/* Filter pills */}
      <div className="flex flex-wrap gap-1.5 mb-5">
        {FILTROS.map(f => (
          <button key={f.key} type="button" onClick={() => setFiltro(f.key)}
            className="text-xs px-4 py-1.5 rounded-full font-medium transition-colors"
            style={filtro === f.key
              ? { background: 'var(--tinta)', color: '#fff' }
              : { background: 'var(--surface)', color: 'var(--tinta-500)', border: '1px solid var(--border)' }
            }>
            {f.label}
            {f.key === 'todos' && ` (${allItems.length})`}
          </button>
        ))}
      </div>

      {/* 2-column layout */}
      <div className="flex gap-6 items-start">
        {/* Feed */}
        <div className="flex-1 min-w-0">
          <ReminderList items={items} onComplete={markComplete} onDismiss={markComplete}
            emptyMessage="No hay pendientes en este filtro." />
          {items.length > 0 && (
            <p className="text-[10px] mt-4 pt-3" style={{ color: 'var(--tinta-500)', borderTop: '1px solid var(--border)' }}>
              Los avisos con etiqueta {kindLabel('proyecto_fin')}, {kindLabel('cotizacion_vence')} o {kindLabel('seguimiento_contacto')} se generan automaticamente.
            </p>
          )}
        </div>

        {/* Sidebar form */}
        {showForm && (
          <div className="w-72 shrink-0 sticky top-4">
            <form onSubmit={handleAdd} className="rounded-2xl p-5 space-y-3" style={{ border: '1px solid var(--border)', background: 'var(--surface)' }}>
              <div className="flex items-center gap-3 mb-1">
                <div className="h-px flex-1" style={{ background: 'var(--border)' }} />
                <span className="text-[10px] font-semibold uppercase tracking-[0.15em]" style={{ color: 'var(--tinta-500)' }}>
                  Nuevo recordatorio
                </span>
                <div className="h-px flex-1" style={{ background: 'var(--border)' }} />
              </div>

              <div>
                <label className="text-[10px] font-semibold uppercase tracking-widest mb-1 block" style={{ color: 'var(--tinta-500)' }}>Titulo</label>
                <input value={form.titulo} onChange={e => setForm({ ...form, titulo: e.target.value })}
                  className="input text-sm" placeholder="Revision planos cliente" required maxLength={120} />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] font-semibold uppercase tracking-widest mb-1 block" style={{ color: 'var(--tinta-500)' }}>Fecha</label>
                  <input type="date" value={form.fecha} onChange={e => setForm({ ...form, fecha: e.target.value })}
                    className="input text-sm" required />
                </div>
                <div>
                  <label className="text-[10px] font-semibold uppercase tracking-widest mb-1 block" style={{ color: 'var(--tinta-500)' }}>Categoria</label>
                  <select value={form.categoria} onChange={e => setForm({ ...form, categoria: e.target.value as RecordatorioCategoria })}
                    className="input text-sm">
                    <option value="obra">obra</option>
                    <option value="contacto">contacto</option>
                    <option value="cotizacion">cotizacion</option>
                    <option value="general">general</option>
                  </select>
                </div>
              </div>

              {form.categoria === 'obra' && proyectos.length > 0 && (
                <div>
                  <label className="text-[10px] font-semibold uppercase tracking-widest mb-1 block" style={{ color: 'var(--tinta-500)' }}>Proyecto (opcional)</label>
                  <select value={form.proyecto_id} onChange={e => setForm({ ...form, proyecto_id: e.target.value })} className="input text-sm">
                    <option value="">—</option>
                    {proyectos.filter(p => p.activo).map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
                  </select>
                </div>
              )}

              {(form.categoria === 'contacto' || form.categoria === 'cotizacion') && clientes.length > 0 && (
                <div>
                  <label className="text-[10px] font-semibold uppercase tracking-widest mb-1 block" style={{ color: 'var(--tinta-500)' }}>Contacto (opcional)</label>
                  <select value={form.cliente_id} onChange={e => setForm({ ...form, cliente_id: e.target.value })} className="input text-sm">
                    <option value="">—</option>
                    {clientes.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                  </select>
                </div>
              )}

              <button type="submit" disabled={saving}
                className="w-full py-2.5 rounded-xl text-sm font-semibold text-white transition-colors disabled:opacity-50"
                style={{ background: 'var(--bosque-500)' }}>
                {saving ? 'Guardando...' : 'Guardar recordatorio'}
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  )
}
