'use client'
import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useEmpresa } from '@/components/layout/EmpresaContext'
import Link from 'next/link'
import {
  Plus, Users, Edit2, AlertCircle, X, Upload, Download, Phone, Mail,
  Trash2, ChevronRight, Search,
  CheckSquare, Square, Minus, ToggleLeft, ToggleRight,
} from 'lucide-react'
import { sanitizeText, formatMXN } from '@/lib/utils'
import { aplicarEstiloFila, xlsxHeaderStyle } from '@/lib/export/atelier-theme'
import ImportWizardModal from '@/components/import/ImportWizardModal'
import { logAudit } from '@/lib/audit'
import { SkeletonList } from '@/components/ui/Skeleton'
import TrabajadorFormModal, { type TrabajadorFormState, EMPTY_FORM } from '@/components/trabajadores/TrabajadorFormModal'
import type { Trabajador, Empresa } from '@/types'
import { toast } from 'sonner'

import { MODALIDADES } from '@/lib/constants'

type InlineField = 'telefono' | 'email'

export default function TrabajadoresPage() {
  const supabase = createClient()
  const { empresaId, empresa } = useEmpresa()
  const [trabajadores, setTrabajadores] = useState<Trabajador[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<Trabajador | null>(null)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  // tab state now inside TrabajadorFormModal
  const [form, setForm] = useState<TrabajadorFormState>(EMPTY_FORM)

  // Row actions state
  const [deleteConfirm, setDeleteConfirm] = useState<Trabajador | null>(null)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [showImport, setShowImport] = useState(false)

  // Inline edit state
  const [inlineEdit, setInlineEdit] = useState<{ id: string; field: InlineField; value: string } | null>(null)
  const [inlineSaving, setInlineSaving] = useState(false)

  // Bulk selection state
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [bulkWorking, setBulkWorking] = useState(false)

  // Search + filter state
  const [busqueda, setBusqueda] = useState('')
  const [filtroActivo, setFiltroActivo] = useState<'todos' | 'activos' | 'inactivos'>('todos')

  useEffect(() => { loadData() }, [])

  const loadData = useCallback(async () => {
    try {
      const { data } = await supabase.from('trabajadores').select('*').eq('empresa_id', empresaId).order('nombre')
      setTrabajadores(data || [])
    } catch (err) {
      console.error('Error cargando trabajadores:', err)
    } finally {
      setLoading(false)
    }
  }, [supabase])

  // ── Selection helpers ──────────────────────────────────────────────
  const toggleSelect = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id); else next.add(id)
      return next
    })
  }
  const toggleSelectAll = () => {
    setSelected(prev => {
      const visibleIds = visibles.map(t => t.id)
      const allVisible = visibleIds.length > 0 && visibleIds.every(id => prev.has(id))
      return allVisible ? new Set() : new Set(visibleIds)
    })
  }
  const clearSelection = () => setSelected(new Set())

  // ── Inline edit ────────────────────────────────────────────────────
  const saveInline = async () => {
    if (!inlineEdit || inlineSaving) return
    setInlineSaving(true)
    const { error } = await supabase.from('trabajadores').update({ [inlineEdit.field]: inlineEdit.value || null }).eq('id', inlineEdit.id)
    if (!error) {
      setTrabajadores(prev => prev.map(t => t.id === inlineEdit.id ? { ...t, [inlineEdit.field]: inlineEdit.value } : t))
    } else {
      toast.error('Error al guardar')
    }
    setInlineEdit(null)
    setInlineSaving(false)
  }

  // ── Form open ──────────────────────────────────────────────────────
  const openNew = () => {
    setEditing(null); setForm(EMPTY_FORM); setError(''); setShowForm(true)
  }
  const openEdit = (t: Trabajador) => {
    setEditing(t)
    setForm({
      nombre: t.nombre, modalidad_pago: t.modalidad_pago,
      tarifa_dia: t.tarifa_dia?.toString() || '', tarifa_hora: t.tarifa_hora?.toString() || '',
      sueldo_fijo: t.sueldo_fijo?.toString() || '', tarifa_hora_extra: t.tarifa_hora_extra?.toString() || '',
      es_administrativo: t.es_administrativo, notas: t.notas || '',
      puesto: t.puesto || '',
      telefono: t.telefono || '',
      email: t.email || '',
      direccion: t.direccion || '',
      fecha_ingreso: t.fecha_ingreso || '',
      fecha_nacimiento: t.fecha_nacimiento || '',
      rfc: t.rfc || '',
      curp: t.curp || '',
      nss: t.nss || '',
      sbc_diario: t.sbc_diario?.toString() || '',
      banco: t.banco || '',
      cuenta_clabe: t.cuenta_clabe || '',
      contacto_emergencia_nombre: t.contacto_emergencia_nombre || '',
      contacto_emergencia_parentesco: t.contacto_emergencia_parentesco || '',
      telefono_emergencia: t.telefono_emergencia || '',
    })
    setError(''); setShowForm(true)
  }

  // ── Save form ──────────────────────────────────────────────────────
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true); setError('')

    if (!editing) {
      const activos = trabajadores.filter(t => t.activo).length
      if (empresa && activos >= empresa.limite_trabajadores) {
        setError(`Límite de ${empresa.limite_trabajadores} trabajadores alcanzado. Actualiza tu plan.`)
        setSaving(false); return
      }
    }

    const payload = {
      nombre: sanitizeText(form.nombre),
      modalidad_pago: form.modalidad_pago,
      tarifa_dia: form.tarifa_dia ? parseFloat(form.tarifa_dia) : null,
      tarifa_hora: form.tarifa_hora ? parseFloat(form.tarifa_hora) : null,
      sueldo_fijo: form.sueldo_fijo ? parseFloat(form.sueldo_fijo) : null,
      tarifa_hora_extra: form.tarifa_hora_extra ? parseFloat(form.tarifa_hora_extra) : null,
      es_administrativo: form.es_administrativo,
      notas: form.notas ? sanitizeText(form.notas) : null,
      puesto: form.puesto ? sanitizeText(form.puesto) : null,
      telefono: form.telefono || null,
      email: form.email || null,
      direccion: form.direccion ? sanitizeText(form.direccion) : null,
      fecha_ingreso: form.fecha_ingreso || null,
      fecha_nacimiento: form.fecha_nacimiento || null,
      rfc: form.rfc ? form.rfc.toUpperCase() : null,
      curp: form.curp ? form.curp.toUpperCase() : null,
      nss: form.nss || null,
      sbc_diario: form.sbc_diario ? parseFloat(form.sbc_diario) : null,
      banco: form.banco ? sanitizeText(form.banco) : null,
      cuenta_clabe: form.cuenta_clabe || null,
      contacto_emergencia_nombre: form.contacto_emergencia_nombre ? sanitizeText(form.contacto_emergencia_nombre) : null,
      contacto_emergencia_parentesco: form.contacto_emergencia_parentesco ? sanitizeText(form.contacto_emergencia_parentesco) : null,
      telefono_emergencia: form.telefono_emergencia || null,
    }

    const { error: dbError, data: savedData } = editing
      ? await supabase.from('trabajadores').update(payload).eq('id', editing.id).select('id').single()
      : await supabase.from('trabajadores').insert({ ...payload, empresa_id: empresaId }).select('id').single()

    if (dbError) { setError(dbError.message); setSaving(false); toast.error('Error al guardar'); return }
    if (!editing && savedData) {
      logAudit({ supabase, empresaId: empresaId, tabla: 'trabajadores', operacion: 'trabajador_creado', registroId: savedData.id, payload: { nombre: payload.nombre } })
    }
    setSaving(false); setShowForm(false)
    toast.success(editing ? 'Trabajador actualizado' : 'Trabajador agregado')
    loadData()
  }

  // ── Toggle activo ──────────────────────────────────────────────────
  const toggleActivo = async (t: Trabajador) => {
    await supabase.from('trabajadores').update({ activo: !t.activo }).eq('id', t.id)
    setTrabajadores(prev => prev.map(w => w.id === t.id ? { ...w, activo: !w.activo } : w))
  }

  // ── Delete ─────────────────────────────────────────────────────────
  const confirmDelete = async () => {
    if (!deleteConfirm) return
    setDeleting(deleteConfirm.id)
    const { error } = await supabase.from('trabajadores').delete().eq('id', deleteConfirm.id)
    if (error) { toast.error(`No se pudo eliminar: ${error.message}`); setDeleting(null); setDeleteConfirm(null); return }
    logAudit({ supabase, empresaId, tabla: 'trabajadores', operacion: 'trabajador_eliminado', registroId: deleteConfirm.id, payload: { nombre: deleteConfirm.nombre } })
    setTrabajadores(prev => prev.filter(x => x.id !== deleteConfirm.id))
    setSelected(prev => { const s = new Set(prev); s.delete(deleteConfirm.id); return s })
    toast.success(`${deleteConfirm.nombre} eliminado`)
    setDeleteConfirm(null); setDeleting(null)
  }

  // ── Bulk actions ───────────────────────────────────────────────────
  const bulkSetActivo = async (activo: boolean) => {
    setBulkWorking(true)
    const ids = [...selected]
    await supabase.from('trabajadores').update({ activo }).in('id', ids)
    setTrabajadores(prev => prev.map(t => ids.includes(t.id) ? { ...t, activo } : t))
    toast.success(`${ids.length} trabajador${ids.length !== 1 ? 'es' : ''} ${activo ? 'activado' : 'desactivado'}${ids.length !== 1 ? 's' : ''}`)
    clearSelection(); setBulkWorking(false)
  }

  const bulkDelete = async () => {
    if (!confirm(`¿Eliminar ${selected.size} trabajador${selected.size !== 1 ? 'es' : ''} permanentemente?`)) return
    setBulkWorking(true)
    const ids = [...selected]
    const { error } = await supabase.from('trabajadores').delete().in('id', ids)
    if (error) { toast.error(`Error al eliminar: ${error.message}`); setBulkWorking(false); return }
    for (const id of ids) {
      const t = trabajadores.find(w => w.id === id)
      if (t) logAudit({ supabase, empresaId, tabla: 'trabajadores', operacion: 'trabajador_eliminado', registroId: id, payload: { nombre: t.nombre } })
    }
    setTrabajadores(prev => prev.filter(t => !ids.includes(t.id)))
    toast.success(`${ids.length} trabajador${ids.length !== 1 ? 'es' : ''} eliminado${ids.length !== 1 ? 's' : ''}`)
    clearSelection(); setBulkWorking(false)
  }

  // ── Export ─────────────────────────────────────────────────────────
  const handleExport = async () => {
    if (!empresa?.modulo_export_pdf) { toast.error('La exportación es una función del Plan PYME'); return }
    const XLSX = await import('xlsx-js-style')
    const list = selected.size > 0 ? trabajadores.filter(t => selected.has(t.id)) : trabajadores
    const data = list.map(t => ({
      Nombre: t.nombre,
      Puesto: t.puesto || '',
      Teléfono: t.telefono || '',
      Email: t.email || '',
      Modalidad: MODALIDADES.find(m => m.value === t.modalidad_pago)?.label,
      'Tarifa Día': t.tarifa_dia || '',
      'Tarifa Hora': t.tarifa_hora || '',
      'Sueldo Fijo': t.sueldo_fijo || '',
      'Tarifa HE': t.tarifa_hora_extra || '',
      RFC: t.rfc || '',
      CURP: t.curp || '',
      NSS: t.nss || '',
      Banco: t.banco || '',
      CLABE: t.cuenta_clabe || '',
      'Contacto Emergencia': t.contacto_emergencia_nombre || '',
      'Tel. Emergencia': t.telefono_emergencia || '',
      Activo: t.activo ? 'Sí' : 'No',
    }))
    const ws = XLSX.utils.json_to_sheet(data)
    aplicarEstiloFila(ws, 0, 17, xlsxHeaderStyle) // encabezados Atelier
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Trabajadores')
    XLSX.writeFile(wb, `trabajadores-${new Date().toISOString().slice(0,10)}.xlsx`)
  }

  const openImport = () => {
    if (!empresa?.modulo_multi_modalidad) { toast.error('La importación es una función del Plan PYME'); return }
    setShowImport(true)
  }

  // ─────────────────────────────── RENDER ───────────────────────────

  if (loading) return (
    <div className="max-w-4xl mx-auto space-y-4">
      <div className="flex items-center justify-between mb-2">
        <div className="h-8 w-40 rounded-xl animate-pulse" style={{ background: 'var(--border)' }} />
        <div className="h-9 w-36 rounded-xl animate-pulse" style={{ background: 'var(--border)' }} />
      </div>
      <SkeletonList rows={6} />
    </div>
  )


  const q = busqueda.trim().toLowerCase()
  const visibles = trabajadores.filter(t => {
    if (filtroActivo === 'activos' && !t.activo) return false
    if (filtroActivo === 'inactivos' && t.activo) return false
    if (!q) return true
    return [t.nombre, t.puesto, t.telefono, t.email]
      .some(v => v && String(v).toLowerCase().includes(q))
  })

  const allSelected = visibles.length > 0 && visibles.every(t => selected.has(t.id))
  const someSelected = selected.size > 0 && !allSelected

  return (
    <div className="max-w-4xl mx-auto" style={{ paddingBottom: selected.size > 0 ? 80 : 0 }}>

      {/* ── Header ── */}
      <div className="flex items-center justify-between mb-6 gap-3 flex-wrap">
        <div>
          <h1 className="font-display text-2xl font-bold" style={{ color: 'var(--tinta)' }}>Trabajadores</h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--tinta-500)' }}>
            {trabajadores.filter(t => t.activo).length} activos
            {empresa && ` / ${empresa.limite_trabajadores} permitidos`}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button onClick={openImport} className="btn-secondary flex items-center gap-1 text-xs py-1.5">
            <Upload className="w-3.5 h-3.5" /> Importar
          </button>
          <button onClick={handleExport} className="btn-secondary flex items-center gap-1 text-xs py-1.5">
            <Download className="w-3.5 h-3.5" /> {selected.size > 0 ? `Exportar (${selected.size})` : 'Exportar'}
          </button>
          <button onClick={openNew} className="btn-primary flex items-center gap-2">
            <Plus className="w-4 h-4" /> Agregar
          </button>
        </div>
      </div>

      {/* ── Search + filter toolbar ── */}
      {trabajadores.length > 0 && (
        <div className="flex items-center gap-2 flex-wrap mb-4">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--tinta-300)' }} />
            <input
              value={busqueda}
              onChange={e => setBusqueda(e.target.value)}
              placeholder="Buscar por nombre, puesto, teléfono o email..."
              className="input pl-9 py-2 text-sm w-full"
              maxLength={100}
            />
            {busqueda && (
              <button onClick={() => setBusqueda('')} className="absolute right-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--tinta-400)' }}>
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
          <div className="flex items-center gap-1.5">
            {([
              { key: 'todos', label: `Todos (${trabajadores.length})` },
              { key: 'activos', label: `Activos (${trabajadores.filter(t => t.activo).length})` },
              { key: 'inactivos', label: `Inactivos (${trabajadores.filter(t => !t.activo).length})` },
            ] as const).map(f => (
              <button
                key={f.key}
                onClick={() => setFiltroActivo(f.key)}
                className="text-xs font-medium px-3 py-1.5 rounded-full transition-colors"
                style={filtroActivo === f.key
                  ? { background: 'var(--tinta)', color: 'var(--surface)' }
                  : { background: 'var(--surface-2)', color: 'var(--tinta-500)', border: '1px solid var(--border)' }}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── Empty state ── */}
      {!trabajadores.length ? (
        <div className="card text-center py-16">
          <Users className="w-12 h-12 mx-auto text-gray-300 mb-3" />
          <p className="mb-4" style={{ color: 'var(--tinta-500)' }}>No hay trabajadores registrados.</p>
          <button onClick={openNew} className="btn-primary">Agregar primer trabajador</button>
        </div>
      ) : (
        <div className="card p-0 overflow-hidden">

          {/* Select-all header — appears when list exists */}
          <div className="flex items-center gap-3 px-4 py-2.5 border-b"
            style={{ borderColor: 'var(--border)', background: selected.size > 0 ? 'var(--bosque-50)' : 'var(--surface-2)' }}>
            <button onClick={toggleSelectAll} className="flex items-center justify-center w-5 h-5 shrink-0 transition-opacity"
              style={{ color: allSelected ? 'var(--bosque-500)' : someSelected ? 'var(--bosque-400)' : 'var(--tinta-300)' }}
              title={allSelected ? 'Deseleccionar todos' : 'Seleccionar todos'}>
              {allSelected ? <CheckSquare size={16} /> : someSelected ? <Minus size={16} /> : <Square size={16} />}
            </button>
            {selected.size > 0 ? (
              <span className="text-xs font-medium" style={{ color: 'var(--bosque-600)' }}>
                {selected.size} seleccionado{selected.size !== 1 ? 's' : ''}
              </span>
            ) : (
              <span className="text-xs" style={{ color: 'var(--tinta-400)' }}>Trabajador</span>
            )}
          </div>

          {/* ── Rows ── */}
          {visibles.length === 0 && (
            <p className="text-sm text-center py-10" style={{ color: 'var(--tinta-500)' }}>
              Sin resultados para esta búsqueda o filtro.
            </p>
          )}
          {visibles.map(t => {
            const tel = (t as unknown as { telefono?: string }).telefono
            const email = (t as unknown as { email?: string }).email
            const puesto = (t as unknown as { puesto?: string }).puesto
            const isSelected = selected.has(t.id)
            const isInlinePhone = inlineEdit?.id === t.id && inlineEdit.field === 'telefono'
            const isInlineEmail = inlineEdit?.id === t.id && inlineEdit.field === 'email'

            return (
              <div key={t.id}
                className="group flex items-center gap-3 px-4 py-3 border-b transition-colors"
                style={{
                  borderColor: 'var(--border)',
                  background: isSelected ? 'var(--bosque-50)' : undefined,
                }}>

                {/* Checkbox */}
                <button
                  onClick={() => toggleSelect(t.id)}
                  className="flex items-center justify-center w-5 h-5 shrink-0 transition-all md:opacity-0 md:group-hover:opacity-100"
                  style={{
                    opacity: isSelected ? 1 : undefined,
                    color: isSelected ? 'var(--bosque-500)' : 'var(--tinta-300)',
                  }}
                  title={isSelected ? 'Deseleccionar' : 'Seleccionar'}
                >
                  {isSelected ? <CheckSquare size={16} /> : <Square size={16} />}
                </button>

                {/* Name + info → links to detail */}
                <Link href={`/dashboard/trabajadores/${t.id}`} className="flex items-center gap-3 flex-1 min-w-0 group/link">
                  <div className="w-9 h-9 rounded-full flex items-center justify-center shrink-0" style={{ background: t.activo ? 'var(--bosque-50)' : 'var(--surface-3)' }}>
                    <span className="text-sm font-bold" style={{ color: t.activo ? 'var(--primary)' : 'var(--tinta-500)' }}>{t.nombre[0]}</span>
                  </div>
                  <div className={`flex-1 min-w-0 ${!t.activo ? 'opacity-50' : ''}`}>
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-medium text-sm truncate" style={{ color: 'var(--tinta)' }}>{t.nombre}</p>
                      {puesto && <span className="text-xs hidden sm:inline" style={{ color: 'var(--tinta-500)' }}>· {puesto}</span>}
                      {t.es_administrativo && <span className="text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded">Admin</span>}
                    </div>
                    <div className="flex items-center gap-2 text-xs flex-wrap" style={{ color: 'var(--tinta-500)' }}>
                      <span>
                        {MODALIDADES.find(m => m.value === t.modalidad_pago)?.label}
                        {t.tarifa_dia && ` · ${formatMXN(t.tarifa_dia)}/día`}
                        {t.tarifa_hora && ` · ${formatMXN(t.tarifa_hora)}/hr`}
                        {t.sueldo_fijo && ` · Fijo: ${formatMXN(t.sueldo_fijo)}`}
                      </span>
                      {/* Inline-editable phone */}
                      {isInlinePhone ? (
                        <span onClick={e => e.preventDefault()} className="flex items-center gap-1">
                          <Phone size={10} />
                          <input
                            autoFocus
                            value={inlineEdit.value}
                            onChange={e => setInlineEdit({ ...inlineEdit, value: e.target.value })}
                            onBlur={saveInline}
                            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); saveInline() } if (e.key === 'Escape') setInlineEdit(null) }}
                            disabled={inlineSaving}
                            className="border rounded px-1 py-0 h-5 text-xs w-28 outline-none"
                            style={{ borderColor: 'var(--bosque-300)', background: 'white', color: 'var(--tinta)' }}
                            placeholder="Teléfono"
                            maxLength={20}
                          />
                        </span>
                      ) : tel ? (
                        <span
                          onClick={e => { e.preventDefault(); setInlineEdit({ id: t.id, field: 'telefono', value: tel }) }}
                          className="flex items-center gap-1 cursor-text hover:underline decoration-dotted"
                          title="Click para editar"
                        >
                          <Phone size={10} />{tel}
                        </span>
                      ) : null}
                      {/* Inline-editable email */}
                      {isInlineEmail ? (
                        <span onClick={e => e.preventDefault()} className="flex items-center gap-1">
                          <Mail size={10} />
                          <input
                            autoFocus
                            value={inlineEdit.value}
                            onChange={e => setInlineEdit({ ...inlineEdit, value: e.target.value })}
                            onBlur={saveInline}
                            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); saveInline() } if (e.key === 'Escape') setInlineEdit(null) }}
                            disabled={inlineSaving}
                            className="border rounded px-1 py-0 h-5 text-xs w-36 outline-none"
                            style={{ borderColor: 'var(--bosque-300)', background: 'white', color: 'var(--tinta)' }}
                            placeholder="Email"
                            maxLength={100}
                          />
                        </span>
                      ) : email ? (
                        <span
                          onClick={e => { e.preventDefault(); setInlineEdit({ id: t.id, field: 'email', value: email }) }}
                          className="flex items-center gap-1 cursor-text hover:underline decoration-dotted hidden sm:flex"
                          title="Click para editar"
                        >
                          <Mail size={10} />{email}
                        </span>
                      ) : null}
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-gray-300 group-hover/link:text-ink-soft transition-colors shrink-0" />
                </Link>

                {/* Row actions — fade in on hover */}
                <div className="flex items-center gap-1 shrink-0 transition-all duration-150 md:opacity-0 md:group-hover:opacity-100"
                  style={{ opacity: isSelected ? 1 : undefined }}>
                  {/* Activo toggle */}
                  <button
                    onClick={() => toggleActivo(t)}
                    title={t.activo ? 'Desactivar' : 'Activar'}
                    className="p-1.5 rounded-lg transition-colors"
                    style={{ color: t.activo ? 'var(--bosque-500)' : 'var(--tinta-300)' }}
                  >
                    {t.activo ? <ToggleRight size={17} /> : <ToggleLeft size={17} />}
                  </button>
                  {/* Edit */}
                  <button
                    onClick={() => openEdit(t)}
                    className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
                    style={{ color: 'var(--tinta-500)' }}
                    title="Editar"
                  >
                    <Edit2 size={14} />
                  </button>
                  {/* Delete */}
                  <button
                    onClick={() => setDeleteConfirm(t)}
                    className="p-1.5 rounded-lg hover:bg-red-50 transition-colors"
                    style={{ color: 'var(--tinta-300)' }}
                    title="Eliminar"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* ── Bulk action bar ── */}
      {selected.size > 0 && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-40 flex items-center gap-3 px-5 py-3 rounded-2xl shadow-2xl animate-fade-in"
          style={{ background: 'var(--petroleo-900)', border: '1px solid rgba(250,246,239,0.12)', color: 'var(--cuero-100)', minWidth: 340 }}>
          <span className="text-sm font-medium flex-1">
            {selected.size} seleccionado{selected.size !== 1 ? 's' : ''}
          </span>
          <button onClick={() => bulkSetActivo(true)} disabled={bulkWorking}
            className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg transition-colors"
            style={{ background: 'rgba(58,110,58,0.25)', color: 'var(--bosque-200)' }}
            title="Activar seleccionados">
            <ToggleRight size={13} /> Activar
          </button>
          <button onClick={() => bulkSetActivo(false)} disabled={bulkWorking}
            className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg transition-colors"
            style={{ background: 'rgba(250,246,239,0.08)', color: 'rgba(250,246,239,0.6)' }}
            title="Desactivar seleccionados">
            <ToggleLeft size={13} /> Desactivar
          </button>
          <button onClick={handleExport} disabled={bulkWorking}
            className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg transition-colors"
            style={{ background: 'rgba(250,246,239,0.08)', color: 'rgba(250,246,239,0.6)' }}
            title="Exportar seleccionados">
            <Download size={13} /> Exportar
          </button>
          <button onClick={bulkDelete} disabled={bulkWorking}
            className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg transition-colors"
            style={{ background: 'rgba(160,78,62,0.25)', color: 'var(--cuero-300)' }}
            title="Eliminar seleccionados">
            <Trash2 size={13} /> Eliminar
          </button>
          <button onClick={clearSelection} className="p-1.5 rounded-lg" style={{ color: 'rgba(250,246,239,0.4)' }}>
            <X size={14} />
          </button>
        </div>
      )}

      {/* ── Delete confirmation modal ── */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-surface rounded-2xl w-full max-w-sm p-6 shadow-2xl">
            <div className="w-10 h-10 rounded-full flex items-center justify-center mb-4" style={{ background: 'rgba(160,78,62,0.1)' }}>
              <Trash2 size={18} style={{ color: 'var(--rojo-falta)' }} />
            </div>
            <h3 className="font-display font-bold text-base mb-1" style={{ color: 'var(--tinta)' }}>Eliminar trabajador</h3>
            <p className="text-sm mb-5" style={{ color: 'var(--tinta-500)' }}>
              ¿Eliminar permanentemente a <strong style={{ color: 'var(--tinta)' }}>{deleteConfirm.nombre}</strong>? Se eliminarán todos sus registros de asistencia y nómina.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteConfirm(null)} className="btn-secondary flex-1" disabled={!!deleting}>
                Cancelar
              </button>
              <button
                onClick={confirmDelete}
                disabled={!!deleting}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-colors"
                style={{ background: 'var(--rojo-falta)', color: 'white' }}
              >
                {deleting ? 'Eliminando...' : 'Sí, eliminar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Form modal ── */}
      {showForm && (
        <TrabajadorFormModal
          editing={!!editing}
          form={form}
          setForm={setForm}
          error={error}
          saving={saving}
          onSave={handleSave}
          onClose={() => setShowForm(false)}
        />
      )}

      {showImport && (
        <ImportWizardModal
          schemaId="trabajadores"
          empresaId={empresaId}
          onClose={() => setShowImport(false)}
          onDone={() => { setShowImport(false); loadData() }}
        />
      )}
    </div>
  )
}
