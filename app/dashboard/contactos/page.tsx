'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useEmpresa } from '@/components/layout/EmpresaContext'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  Plus, Upload, X, AlertCircle, BookUser, Pencil, Trash2,
  Search, MessageCircle, Mail, FilePlus, ChevronRight,
  LayoutList, Columns,
} from 'lucide-react'
import { sanitizeText, formatDate } from '@/lib/utils'
import { parseVCardText, type ClienteImportRow } from '@/lib/import/contactos'
import ImportWizardModal from '@/components/import/ImportWizardModal'
import { TIPOS_CONTACTO } from '@/lib/crm/contacto-meta'
import ContactoTipoBadge from '@/components/crm/ContactoTipoBadge'
import { openEmailShare, openWhatsAppShare } from '@/lib/crm/share-cotizacion'
import type { Cliente, RolUsuario, TipoContacto } from '@/types'

const emptyForm = {
  nombre: '',
  tipo: 'cliente' as TipoContacto,
  email: '',
  telefono: '',
  direccion: '',
  empresa_cliente: '',
  puesto: '',
  notas: '',
}

export default function ContactosCrmPage() {
  const supabase = useMemo(() => createClient(), [])
  const router = useRouter()
  const { empresaId, empresa } = useEmpresa()
  const empresaNombre = empresa.nombre || 'Tu empresa'
  const [contactos, setContactos] = useState<Cliente[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [importMsg, setImportMsg] = useState('')
  const [showImport, setShowImport] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<Cliente | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const [tableMissing, setTableMissing] = useState(false)
  const [filtroTipo, setFiltroTipo] = useState<TipoContacto | 'todos'>('todos')
  const [busqueda, setBusqueda] = useState('')
  const [viewMode, setViewMode] = useState<'list' | 'kanban'>('list')

  const loadData = useCallback(async () => {
    setError('')
    try {
      const { data, error: qErr } = await supabase
        .from('clientes')
        .select('*')
        .eq('empresa_id', empresaId)
        .eq('activo', true)
        .order('nombre')

      if (qErr) {
        if (qErr.message.includes('clientes') || qErr.code === '42P01') setTableMissing(true)
        else setError(qErr.message)
        return
      }
      setContactos((data || []).map((c) => ({ ...c, tipo: (c.tipo as TipoContacto) || 'cliente' })))
    } catch (err) {
      console.error('[contactos crm] load', err)
      setError('No se pudieron cargar los contactos.')
    } finally {
      setLoading(false)
    }
  }, [supabase, empresaId])

  useEffect(() => { loadData() }, [loadData])

  const filtrados = useMemo(() => {
    const q = busqueda.trim().toLowerCase()
    return contactos.filter((c) => {
      if (filtroTipo !== 'todos' && c.tipo !== filtroTipo) return false
      if (!q) return true
      const blob = [c.nombre, c.empresa_cliente, c.email, c.telefono, c.puesto, c.notas].filter(Boolean).join(' ').toLowerCase()
      return blob.includes(q)
    })
  }, [contactos, filtroTipo, busqueda])

  const counts = useMemo(() => {
    const m: Record<string, number> = { todos: contactos.length }
    for (const t of TIPOS_CONTACTO) m[t.value] = contactos.filter((c) => c.tipo === t.value).length
    return m
  }, [contactos])

  // Kanban: group by tipo, applying only the busqueda filter (not filtroTipo)
  const kanbanColumns = useMemo(() => {
    const q = busqueda.trim().toLowerCase()
    return TIPOS_CONTACTO.map((t) => {
      const cards = contactos.filter((c) => {
        if (c.tipo !== t.value) return false
        if (!q) return true
        const blob = [c.nombre, c.empresa_cliente, c.email, c.telefono, c.puesto, c.notas]
          .filter(Boolean).join(' ').toLowerCase()
        return blob.includes(q)
      })
      return { tipo: t, cards }
    })
  }, [contactos, busqueda])

  const openNew = (tipo?: TipoContacto) => {
    setEditing(null)
    setForm({ ...emptyForm, tipo: tipo || 'cliente' })
    setShowForm(true)
  }

  const openEdit = (c: Cliente) => {
    setEditing(c)
    setForm({
      nombre: c.nombre,
      tipo: c.tipo || 'cliente',
      email: c.email || '',
      telefono: c.telefono || '',
      direccion: c.direccion || '',
      empresa_cliente: c.empresa_cliente || '',
      puesto: c.puesto || '',
      notas: c.notas || '',
    })
    setShowForm(true)
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!empresaId) return
    setSaving(true)
    setError('')
    const payload = {
      nombre: sanitizeText(form.nombre),
      tipo: form.tipo,
      email: form.email.trim() || null,
      telefono: form.telefono.trim() || null,
      direccion: form.direccion.trim() ? sanitizeText(form.direccion) : null,
      empresa_cliente: form.empresa_cliente.trim() ? sanitizeText(form.empresa_cliente) : null,
      puesto: form.puesto.trim() ? sanitizeText(form.puesto) : null,
      notas: form.notas.trim() ? sanitizeText(form.notas) : null,
      activo: true,
    }
    let saveErr: string | null = null
    if (editing) {
      const { error: uErr } = await supabase.from('clientes').update(payload).eq('id', editing.id)
      if (uErr) saveErr = uErr.message
    } else {
      const { error: iErr } = await supabase.from('clientes').insert({ ...payload, empresa_id: empresaId })
      if (iErr) saveErr = iErr.message
    }
    setSaving(false)
    if (saveErr) { setError(saveErr); return }
    setShowForm(false)
    await loadData()
  }

  const handleDelete = async (c: Cliente) => {
    if (!confirm(`¿Eliminar "${c.nombre}" de tu red de obra?`)) return
    const { error: dErr } = await supabase.from('clientes').update({ activo: false }).eq('id', c.id)
    if (dErr) setError(dErr.message)
    else await loadData()
  }

  const insertRows = async (rows: ClienteImportRow[]) => {
    if (!empresaId || !rows.length) return
    const payload = rows.map((r) => ({
      empresa_id: empresaId,
      nombre: r.nombre,
      tipo: r.tipo,
      email: r.email,
      telefono: r.telefono,
      direccion: r.direccion,
      empresa_cliente: r.empresa_cliente,
      puesto: r.puesto,
      notas: r.notas,
      activo: true,
    }))
    const { error: impErr } = await supabase.from('clientes').insert(payload)
    if (impErr) throw new Error(impErr.message)
    setImportMsg(`${payload.length} contacto(s) importado(s).`)
    await loadData()
  }

  // Excel/CSV/PDF se importan con el modal universal. El .vcf (agenda de
  // teléfono) se mantiene aquí porque su parseo es específico.
  const handleVcf = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setImportMsg(''); setError('')
    try {
      const rows = parseVCardText(await file.text())
      if (!rows.length) { setError('No se encontraron contactos en el vCard.'); return }
      await insertRows(rows)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al importar.')
    }
  }

  const quickWhatsApp = (c: Cliente) => {
    if (!c.telefono) { setError('Sin telefono en este contacto.'); return }
    const text = `Hola ${c.nombre}, te contacto desde ${empresaNombre} (Nomio).`
    const err = openWhatsAppShare(c.telefono, text)
    if (err) setError(err)
  }

  const quickEmail = (c: Cliente) => {
    if (!c.email) { setError('Sin correo en este contacto.'); return }
    openEmailShare(c.email, `${empresaNombre} — seguimiento de obra`, `Hola ${c.nombre},\n\n`)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-6 h-6 border-2 border-stone-600 border-t-primary rounded-full animate-spin" />
      </div>
    )
  }

  if (tableMissing) {
    return (
      <div className="max-w-lg mx-auto tile">
        <AlertCircle className="w-8 h-8 text-amber-500 mb-3" />
        <h1 className="font-display text-xl font-bold mb-2">Red de obra no disponible</h1>
        <p className="text-sm text-ink-soft mb-4">
          Ejecuta las migraciones SQL en Supabase: <code className="text-xs">20260522180000</code> y <code className="text-xs">20260523100000</code>.
        </p>
        <Link href="/dashboard" className="btn-secondary text-sm inline-block">Volver</Link>
      </div>
    )
  }

  return (
    <div className="max-w-5xl mx-auto pb-10">
      <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
        <div>
          <p className="lt mb-1">CRM de obra</p>
          <h1 className="font-display text-2xl font-bold text-ink">Red de obra</h1>
          <p className="text-sm text-ink-soft mt-1 max-w-xl">
            Clientes, proveedores y aliados. Crea cotizaciones y envialas por WhatsApp o correo en un clic.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button onClick={() => setShowImport(true)} className="btn-secondary flex items-center gap-1 text-xs py-1.5">
            <Upload className="w-3.5 h-3.5" /> Importar
          </button>
          <label className="btn-secondary flex items-center gap-1 cursor-pointer text-xs py-1.5" title="Importar agenda .vcf">
            vCard
            <input type="file" accept=".vcf" onChange={handleVcf} className="hidden" />
          </label>
          <button type="button" onClick={() => openNew()} className="btn-primary flex items-center gap-2 text-sm">
            <Plus className="w-4 h-4" /> Contacto
          </button>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 text-sm p-3 rounded-xl mb-4" style={{ background: '#F5DAD5', color: 'var(--rojo-falta)', border: '1px solid rgba(160,78,62,0.25)' }}>
          <AlertCircle className="w-4 h-4 shrink-0" /> {error}
          <button type="button" className="ml-auto text-xs underline" onClick={() => setError('')}>Cerrar</button>
        </div>
      )}
      {importMsg && <p className="text-sm text-accent mb-4">{importMsg}</p>}

      <div className="tile mb-4 space-y-3">
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-ink-soft" />
            <input
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Buscar nombre, empresa, telefono..."
              className="input pl-9"
            />
          </div>
          <div className="flex items-center gap-1 p-1 rounded-lg border border-border shrink-0">
            <button
              type="button"
              onClick={() => setViewMode('list')}
              title="Vista lista"
              className={`p-1.5 rounded-md transition-colors ${viewMode === 'list' ? 'bg-primary/20 text-ink' : 'text-ink-soft hover:text-ink'}`}
            >
              <LayoutList className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => setViewMode('kanban')}
              title="Vista kanban"
              className={`p-1.5 rounded-md transition-colors ${viewMode === 'kanban' ? 'bg-primary/20 text-ink' : 'text-ink-soft hover:text-ink'}`}
            >
              <Columns className="w-4 h-4" />
            </button>
          </div>
        </div>
        {viewMode === 'list' && (
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setFiltroTipo('todos')}
              className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${filtroTipo === 'todos' ? 'bg-primary/20 border-primary/40 text-ink' : 'border-border text-ink-soft hover:border-border-bright'}`}
            >
              Todos ({counts.todos})
            </button>
            {TIPOS_CONTACTO.map((t) => (
              <button
                key={t.value}
                type="button"
                onClick={() => setFiltroTipo(t.value)}
                className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${filtroTipo === t.value ? 'bg-primary/20 border-primary/40 text-ink' : 'border-border text-ink-soft hover:border-border-bright'}`}
              >
                {t.label} ({counts[t.value] ?? 0})
              </button>
            ))}
          </div>
        )}
      </div>

      {viewMode === 'kanban' ? (
        <div className="overflow-x-auto pb-4">
          <div className="flex gap-3 min-w-max">
            {kanbanColumns.map(({ tipo, cards }) => (
              <div
                key={tipo.value}
                className="flex flex-col rounded-xl border border-border bg-white/5"
                style={{ width: 240, minWidth: 240 }}
              >
                {/* Column header */}
                <div className="flex items-center justify-between px-3 py-2.5 border-b border-border">
                  <span className="text-xs font-semibold text-ink">{tipo.label}</span>
                  <span className="text-xs px-1.5 py-0.5 rounded-full bg-primary/15 text-ink-soft font-medium tabular-nums">
                    {cards.length}
                  </span>
                </div>
                {/* Cards */}
                <div className="flex flex-col gap-2 p-2 flex-1">
                  {cards.length === 0 ? (
                    <p className="text-xs text-ink-soft text-center py-6 opacity-50">Sin contactos</p>
                  ) : (
                    cards.map((c) => (
                      <Link
                        key={c.id}
                        href={`/dashboard/contactos/${c.id}`}
                        className="block rounded-lg border border-border bg-surface p-3 hover:border-border-bright transition-colors group"
                      >
                        <div className="flex items-start justify-between gap-1 mb-1">
                          <span className="text-sm font-semibold text-ink leading-snug line-clamp-2 group-hover:text-primary transition-colors">
                            {c.nombre}
                          </span>
                          <ChevronRight className="w-3.5 h-3.5 text-ink-soft shrink-0 mt-0.5 opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>
                        {c.empresa_cliente && (
                          <p className="text-xs text-ink-soft truncate mb-1">{c.empresa_cliente}</p>
                        )}
                        {c.telefono && (
                          <p className="text-xs text-ink-soft truncate mb-1.5">{c.telefono}</p>
                        )}
                        <ContactoTipoBadge tipo={c.tipo || 'cliente'} />
                      </Link>
                    ))
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : !filtrados.length ? (
        <div className="card text-center py-16">
          <BookUser className="w-12 h-12 mx-auto text-ink-soft mb-3 opacity-40" />
          <p className="text-ink-soft mb-4">Sin contactos en este filtro.</p>
          <button type="button" onClick={() => openNew(filtroTipo === 'todos' ? 'cliente' : filtroTipo)} className="btn-primary">
            Agregar contacto
          </button>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {filtrados.map((c) => (
            <article key={c.id} className="card group hover:border-border-bright transition-colors">
              <div className="flex items-start justify-between gap-2 mb-2">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <h2 className="font-semibold text-ink truncate">{c.nombre}</h2>
                    <ContactoTipoBadge tipo={c.tipo || 'cliente'} />
                  </div>
                  {(c.empresa_cliente || c.puesto) && (
                    <p className="text-xs text-ink-soft truncate">
                      {[c.puesto, c.empresa_cliente].filter(Boolean).join(' · ')}
                    </p>
                  )}
                </div>
                <Link href={`/dashboard/contactos/${c.id}`} className="p-1.5 rounded-lg hover:bg-surface-2 text-ink-soft shrink-0" title="Ver ficha">
                  <ChevronRight className="w-4 h-4" />
                </Link>
              </div>
              <p className="text-xs text-ink-soft mb-1 truncate">
                {[c.telefono, c.email].filter(Boolean).join(' · ') || 'Sin telefono ni correo'}
              </p>
              <p className="text-xs text-ink-soft mb-3 opacity-70">
                {c.ultimo_contacto_at
                  ? `Último contacto: ${formatDate(String(c.ultimo_contacto_at).slice(0, 10))}`
                  : 'Sin contacto registrado'}
              </p>
              <div className="flex flex-wrap gap-1.5">
                <button
                  type="button"
                  onClick={() => router.push(`/dashboard/cotizaciones/nueva?contacto=${c.id}`)}
                  className="btn-primary text-xs py-1.5 flex items-center gap-1"
                >
                  <FilePlus className="w-3.5 h-3.5" /> Cotizar
                </button>
                <button type="button" onClick={() => quickWhatsApp(c)} className="btn-secondary text-xs py-1.5 flex items-center gap-1" disabled={!c.telefono}>
                  <MessageCircle className="w-3.5 h-3.5" />
                </button>
                <button type="button" onClick={() => quickEmail(c)} className="btn-secondary text-xs py-1.5 flex items-center gap-1" disabled={!c.email}>
                  <Mail className="w-3.5 h-3.5" />
                </button>
                <button type="button" onClick={() => openEdit(c)} className="btn-secondary text-xs py-1.5 p-1.5" aria-label="Editar">
                  <Pencil className="w-3.5 h-3.5" />
                </button>
                <button type="button" onClick={() => handleDelete(c)} className="btn-secondary text-xs py-1.5 p-1.5 text-red-400 hover:bg-red-500/10" aria-label="Eliminar">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </article>
          ))}
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/55 backdrop-blur-sm">
          <div className="bg-surface rounded-2xl w-full max-w-lg border border-border shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b border-border sticky top-0 bg-surface z-10">
              <h2 className="font-display font-bold">{editing ? 'Editar' : 'Nuevo'} contacto</h2>
              <button type="button" onClick={() => setShowForm(false)} aria-label="Cerrar"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleSave} className="p-5 space-y-3">
              <div>
                <label className="label">Tipo</label>
                <select value={form.tipo} onChange={(e) => setForm({ ...form, tipo: e.target.value as TipoContacto })} className="input">
                  {TIPOS_CONTACTO.map((t) => (
                    <option key={t.value} value={t.value}>{t.label} — {t.desc}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label">Nombre *</label>
                <input value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} className="input" required maxLength={150} />
              </div>
              <div className="grid sm:grid-cols-2 gap-3">
                <div>
                  <label className="label">Telefono</label>
                  <input value={form.telefono} onChange={(e) => setForm({ ...form, telefono: e.target.value })} className="input" placeholder="10 digitos" />
                </div>
                <div>
                  <label className="label">Email</label>
                  <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="input" />
                </div>
              </div>
              <div className="grid sm:grid-cols-2 gap-3">
                <div>
                  <label className="label">Empresa / razon social</label>
                  <input value={form.empresa_cliente} onChange={(e) => setForm({ ...form, empresa_cliente: e.target.value })} className="input" />
                </div>
                <div>
                  <label className="label">Puesto</label>
                  <input value={form.puesto} onChange={(e) => setForm({ ...form, puesto: e.target.value })} className="input" placeholder="Encargado, ventas..." />
                </div>
              </div>
              <div>
                <label className="label">Direccion</label>
                <input value={form.direccion} onChange={(e) => setForm({ ...form, direccion: e.target.value })} className="input" />
              </div>
              <div>
                <label className="label">Notas</label>
                <textarea value={form.notas} onChange={(e) => setForm({ ...form, notas: e.target.value })} className="input h-20 resize-none" placeholder="Preferencias, horarios, materiales que surte..." />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowForm(false)} className="btn-secondary flex-1">Cancelar</button>
                <button type="submit" disabled={saving} className="btn-primary flex-1">{saving ? 'Guardando...' : 'Guardar'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showImport && (
        <ImportWizardModal
          schemaId="clientes"
          empresaId={empresaId}
          onClose={() => setShowImport(false)}
          onDone={() => { setShowImport(false); loadData() }}
        />
      )}
    </div>
  )
}
