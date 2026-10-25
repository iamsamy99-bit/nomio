'use client'
import { useState, useEffect, useRef, useMemo, Suspense } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useEmpresa } from '@/components/layout/EmpresaContext'
import * as Sentry from '@sentry/nextjs'
import { Plus, Trash2, ArrowLeft, Upload, Sparkles, Search, X, Lock, Save, Download, Send, ChevronRight } from 'lucide-react'
import { sanitizeText, formatMXN, hoyISO } from '@/lib/utils'
import CuantificarModal, { type CuantificarResultado } from '@/components/cuantificar/CuantificarModal'
import type { Cliente } from '@/types'

interface Item { id: string; concepto: string; descripcion: string; cantidad: number; unidad: string; precio_unitario: number }

const uid = () => Math.random().toString(36).slice(2)

import { UNIDADES } from '@/lib/constants'

function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button type="button" onClick={() => onChange(!checked)}
      className="flex items-center justify-between w-full py-2 group">
      <span className="text-sm" style={{ color: 'var(--tinta)' }}>{label}</span>
      <div className="relative w-10 h-6 rounded-full shrink-0 transition-colors duration-200"
        style={{ background: checked ? 'var(--bosque-500)' : 'var(--bosque-200)' }}>
        <span className="absolute top-1 h-4 w-4 rounded-full shadow transition-transform duration-200"
          style={{ background: 'var(--surface)', left: checked ? 20 : 4 }} />
      </div>
    </button>
  )
}

function SectionHeader({ number, icon, title }: { number: string; icon: React.ReactNode; title: string }) {
  return (
    <div className="flex items-center gap-3 mb-4">
      <div className="flex items-center gap-2">
        <span className="w-6 h-6 rounded-md flex items-center justify-center text-xs font-mono font-bold"
          style={{ background: 'var(--bosque-50)', color: 'var(--bosque-600)' }}>{number}</span>
        {icon}
      </div>
      <span className="text-[11px] font-semibold uppercase tracking-[0.15em]" style={{ color: 'var(--tinta-500)' }}>
        {title}
      </span>
      <div className="flex-1 h-px" style={{ background: 'var(--border)' }} />
    </div>
  )
}

function NuevaCotizacionPageInner() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const contactoParam = searchParams.get('contacto')
  const fromCuantificar = searchParams.get('from') === 'cuantificar'
  const supabase = useMemo(() => createClient(), [])
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')
  const { empresa, empresaId } = useEmpresa()
  const tier = empresa.suscripcion_tier
  const empresaNombre = empresa.nombre || ''
  const empresaRfc = empresa.rfc || ''
  const empresaDireccion = empresa.direccion || ''
  const [showCuantificar, setShowCuantificar] = useState(false)
  const [logoFile, setLogoFile] = useState<File | null>(null)
  const [logoPreview, setLogoPreview] = useState(empresa.logo_url || '')
  const [nextNum, setNextNum] = useState(1)

  const logoBlobRef = useRef<string>('')

  useEffect(() => {
    return () => { if (logoBlobRef.current) URL.revokeObjectURL(logoBlobRef.current) }
  }, [])

  useEffect(() => {
    const loadInit = async () => {
      const { data: maxRow } = await supabase.from('cotizaciones')
        .select('numero_cotizacion').eq('empresa_id', empresaId)
        .order('numero_cotizacion', { ascending: false }).limit(1).maybeSingle()
      setNextNum(((maxRow?.numero_cotizacion as number | null) ?? 0) + 1)
    }
    loadInit()
  }, [supabase, empresaId])

  const [form, setForm] = useState({
    titulo: '', cliente_nombre: '', cliente_email: '', cliente_telefono: '',
    cliente_direccion: '', cliente_rfc: '',
    fecha_emision: hoyISO(),
    fecha_validez: '', notas: '',
    terminos: 'Precios en MXN. Vigencia segun fecha indicada.',
    condiciones_pago: '50% anticipo, 50% contra entrega.',
    iva_porcentaje: 16, mostrar_iva: true,
    tipo_impuesto: 'iva' as 'iva' | 'isr' | 'ieps' | 'ninguno',
    descuento_porcentaje: 0, descuento_monto: 0,
    moneda: 'MXN',
    color_primario: '#1B6CA8',
    color_acento: '#475F44',
    plantilla_estilo: 'moderna' as 'moderna' | 'clasica' | 'minimalista',
    firma_nombre: '', firma_cargo: '',
    show_firma: true, show_terminos: true, show_anticipo: true, show_descuento: false,
  })

  const [clientes, setClientes] = useState<Cliente[]>([])
  const [clientePick, setClientePick] = useState('')
  const [clienteSearch, setClienteSearch] = useState('')
  const [clienteOpen, setClienteOpen] = useState(false)
  const clienteRef = useRef<HTMLDivElement>(null)

  const clientesFiltrados = useMemo(() => {
    const q = clienteSearch.toLowerCase()
    return clientes.filter(c =>
      c.nombre.toLowerCase().includes(q) ||
      (c.empresa_cliente || '').toLowerCase().includes(q) ||
      (c.email || '').toLowerCase().includes(q)
    )
  }, [clientes, clienteSearch])

  const [items, setItems] = useState<Item[]>(() => {
    if (fromCuantificar && typeof window !== 'undefined') {
      try {
        const raw = sessionStorage.getItem('cuantificar_draft')
        if (raw) {
          sessionStorage.removeItem('cuantificar_draft')
          const draft = JSON.parse(raw) as Partial<CuantificarResultado>
          // Defense in depth: the draft comes from AI output stored in sessionStorage.
          // Coerce every numeric field used in price math / DB inserts so a malformed
          // or tampered payload can never inject NaN or negative money values.
          const toNum = (v: unknown) => { const n = Number(v); return Number.isFinite(n) && n >= 0 ? n : 0 }
          const toStr = (v: unknown) => (typeof v === 'string' ? v : '')
          const mats = (Array.isArray(draft.materiales) ? draft.materiales : [])
            .filter(m => m && toStr(m.nombre).trim() && toNum(m.costo_unitario) > 0)
          if (mats.length > 0) {
            return mats.map(m => ({
              id: uid(), concepto: toStr(m.nombre), descripcion: '',
              cantidad: toNum(m.cantidad) || 1, unidad: toStr(m.unidad) || 'pza',
              precio_unitario: toNum(m.costo_unitario),
            }))
          }
          const cantidad = toNum(draft.cantidad)
          const costoTotal = toNum(draft.costo_total_estimado)
          return [{
            id: uid(), concepto: toStr(draft.descripcion),
            descripcion: draft.supuestos ? `Supuestos: ${toStr(draft.supuestos)}` : '',
            cantidad: cantidad || 1, unidad: toStr(draft.unidad) || 'pza',
            precio_unitario: cantidad > 0
              ? Math.round(costoTotal / cantidad)
              : costoTotal,
          }]
        }
      } catch { /* ignore */ }
    }
    return [{ id: uid(), concepto: '', descripcion: '', cantidad: 1, unidad: 'pza', precio_unitario: 0 }]
  })

  const fillFromCliente = (c: Cliente) => {
    setClientePick(c.id)
    setClienteSearch(c.nombre + (c.empresa_cliente ? ` — ${c.empresa_cliente}` : ''))
    setClienteOpen(false)
    setForm(f => ({
      ...f, cliente_nombre: c.nombre,
      cliente_email: c.email || '', cliente_telefono: c.telefono || '',
      cliente_direccion: c.direccion || '',
    }))
  }

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (clienteRef.current && !clienteRef.current.contains(e.target as Node)) setClienteOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  useEffect(() => {
    const loadClientes = async () => {
      let list: Cliente[] = []
      const { data } = await supabase.from('clientes').select('*').eq('empresa_id', empresaId).eq('activo', true).order('nombre')
      if (data) list = data as Cliente[]
      if (contactoParam && !list.some(x => x.id === contactoParam)) {
        const { data: one } = await supabase.from('clientes').select('*').eq('id', contactoParam).single()
        if (one) list = [...list, one as Cliente]
      }
      setClientes(list)
      if (contactoParam) {
        const c = list.find(x => x.id === contactoParam)
        if (c) fillFromCliente(c)
      }
    }
    loadClientes()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [supabase, contactoParam])

  const subtotal = items.reduce((s, i) => s + i.cantidad * i.precio_unitario, 0)
  const descuentoPct = subtotal * (form.descuento_porcentaje / 100)
  const descuentoTotal = form.show_descuento ? (descuentoPct + form.descuento_monto) : 0
  const baseAfterDescuento = Math.max(0, subtotal - descuentoTotal)
  const aplicaImpuesto = form.tipo_impuesto !== 'ninguno' && form.mostrar_iva
  const ivaMonto = aplicaImpuesto ? baseAfterDescuento * (form.iva_porcentaje / 100) : 0
  const total = form.tipo_impuesto === 'isr' ? Math.max(0, baseAfterDescuento - ivaMonto) : baseAfterDescuento + ivaMonto
  const labelImpuesto = form.tipo_impuesto === 'isr' ? 'ISR' : form.tipo_impuesto === 'ieps' ? 'IEPS' : 'IVA'
  const validItems = items.filter(i => i.concepto.trim())

  const addItem = () => setItems(p => [...p, { id: uid(), concepto: '', descripcion: '', cantidad: 1, unidad: 'pza', precio_unitario: 0 }])
  const removeItem = (id: string) => setItems(p => p.filter(i => i.id !== id))
  const updateItem = (id: string, field: string, value: string | number) =>
    setItems(p => p.map(i => i.id === id ? { ...i, [field]: value } : i))

  const handleCuantificarAgregar = (item: CuantificarResultado) => {
    const mats = (item.materiales ?? []).filter(m => m.nombre && m.costo_unitario > 0)
    if (mats.length > 0) {
      setItems(prev => [...prev, ...mats.map(m => ({
        id: uid(), concepto: m.nombre, descripcion: '',
        cantidad: m.cantidad, unidad: m.unidad, precio_unitario: m.costo_unitario,
      }))])
    } else {
      setItems(prev => [...prev, {
        id: uid(), concepto: item.descripcion,
        descripcion: item.supuestos ? `Supuestos: ${item.supuestos}` : '',
        cantidad: item.cantidad, unidad: item.unidad,
        precio_unitario: item.cantidad > 0
          ? Math.round(item.costo_total_estimado / item.cantidad)
          : item.costo_total_estimado,
      }])
    }
  }

  const handleLogo = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (logoBlobRef.current) URL.revokeObjectURL(logoBlobRef.current)
    const url = URL.createObjectURL(file)
    logoBlobRef.current = url
    setLogoFile(file)
    setLogoPreview(url)
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true); setSaveError('')
    try {
      const eid = empresaId

      let logoUrl: string | null = null
      if (logoFile) {
        const ext = logoFile.name.split('.').pop()
        const path = `${eid}/logos/${uid()}.${ext}`
        const { data: up } = await supabase.storage.from('cotizaciones').upload(path, logoFile, { upsert: true })
        if (up) { const { data: pub } = supabase.storage.from('cotizaciones').getPublicUrl(up.path); logoUrl = pub.publicUrl }
      }

      const { data: maxRow } = await supabase.from('cotizaciones').select('numero_cotizacion')
        .eq('empresa_id', eid).order('numero_cotizacion', { ascending: false }).limit(1).maybeSingle()
      const num = ((maxRow?.numero_cotizacion as number | null) ?? 0) + 1

      const { data: cot, error } = await supabase.from('cotizaciones').insert({
        empresa_id: eid, numero_cotizacion: num,
        titulo: sanitizeText(form.titulo),
        cliente_id: clientePick || null,
        cliente_nombre: sanitizeText(form.cliente_nombre),
        cliente_email: form.cliente_email || null,
        cliente_telefono: form.cliente_telefono || null,
        cliente_direccion: form.cliente_direccion ? sanitizeText(form.cliente_direccion) : null,
        fecha_emision: form.fecha_emision, fecha_validez: form.fecha_validez || null,
        logo_url: logoUrl,
        notas: form.notas ? sanitizeText(form.notas) : null,
        terminos: form.show_terminos && form.terminos ? sanitizeText(form.terminos) : null,
        condiciones_pago: form.show_anticipo && form.condiciones_pago ? sanitizeText(form.condiciones_pago) : null,
        mostrar_iva: form.mostrar_iva, tipo_impuesto: form.tipo_impuesto,
        descuento_porcentaje: form.show_descuento ? form.descuento_porcentaje : 0,
        descuento_monto: form.show_descuento ? form.descuento_monto : 0,
        color_primario: form.color_primario, color_acento: form.color_acento,
        plantilla_estilo: form.plantilla_estilo,
        firma_nombre: form.show_firma ? form.firma_nombre || null : null,
        firma_cargo: form.show_firma ? form.firma_cargo || null : null,
        subtotal, iva_porcentaje: form.iva_porcentaje, iva_monto: ivaMonto, total, moneda: form.moneda,
      }).select().single()

      if (error || !cot) { setSaveError(error?.message || 'Error al crear cotizacion.'); return }

      const itemsPayload = validItems.map((i, idx) => ({
        empresa_id: eid, cotizacion_id: cot.id, orden: idx,
        concepto: sanitizeText(i.concepto),
        descripcion: i.descripcion ? sanitizeText(i.descripcion) : null,
        cantidad: i.cantidad, unidad: i.unidad,
        precio_unitario: i.precio_unitario, importe: i.cantidad * i.precio_unitario,
      }))
      if (itemsPayload.length) await supabase.from('cotizacion_items').insert(itemsPayload)
      if (clientePick) await supabase.from('clientes').update({ ultimo_contacto_at: new Date().toISOString() }).eq('id', clientePick)
      router.push(`/dashboard/cotizaciones/${cot.id}`)
    } catch (err) {
      Sentry.captureException(err, { tags: { area: 'cotizaciones.nueva.save' } })
      setSaveError('Error inesperado.')
    } finally { setSaving(false) }
  }

  const folio = `COT-${new Date().getFullYear()}-${String(nextNum).padStart(4, '0')}`
  const vigenciaDias = form.fecha_validez && form.fecha_emision
    ? Math.max(0, Math.ceil((new Date(form.fecha_validez).getTime() - new Date(form.fecha_emision).getTime()) / 86400000))
    : null

  return (
    <div className="h-full flex flex-col">
      {/* Top bar */}
      <div className="shrink-0 px-5 py-3 flex items-center justify-between gap-4 border-b flex-wrap" style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}>
        <div className="flex items-center gap-3 min-w-0">
          <button onClick={() => router.back()} className="p-1.5 rounded-lg hover:bg-black/5 transition-colors">
            <ArrowLeft className="w-4 h-4" style={{ color: 'var(--tinta-500)' }} />
          </button>
          <div className="flex items-center gap-1.5 text-xs" style={{ color: 'var(--tinta-500)' }}>
            <Link href="/dashboard/cotizaciones" className="hover:underline">Cotizaciones</Link>
            <ChevronRight className="w-3 h-3" />
            <span className="font-mono font-semibold">{folio}</span>
            <ChevronRight className="w-3 h-3" />
            <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold"
              style={{ background: 'var(--cuero-100)', color: 'var(--tinta-500)' }}>Borrador</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button type="button" onClick={handleSave} disabled={saving}
            className="flex items-center gap-1.5 text-xs px-3 py-2 rounded-lg transition-colors"
            style={{ border: '1px solid var(--border)', color: 'var(--tinta-500)' }}>
            <Save className="w-3.5 h-3.5" /> {saving ? 'Guardando...' : 'Guardar borrador'}
          </button>
          <button type="button" onClick={handleSave} disabled={saving}
            className="flex items-center gap-1.5 text-xs px-4 py-2 rounded-lg font-semibold text-white transition-colors"
            style={{ background: 'var(--bosque-500)' }}>
            <Send className="w-3.5 h-3.5" /> Crear cotizacion
          </button>
        </div>
      </div>

      {/* Title area */}
      <div className="shrink-0 px-6 pt-4 pb-3">
        <input value={form.titulo} onChange={e => setForm({ ...form, titulo: e.target.value })}
          placeholder="Titulo de la cotizacion..."
          className="w-full text-2xl font-display font-bold bg-transparent border-none outline-none placeholder:text-gray-300"
          style={{ color: 'var(--tinta)' }} required maxLength={200} />
        <p className="text-xs mt-1" style={{ color: 'var(--tinta-500)' }}>
          {form.cliente_nombre || 'Cliente'} · {validItems.length} partida(s)
          {vigenciaDias !== null ? ` · Vigencia ${vigenciaDias} dias` : ''}
        </p>
      </div>

      {/* Split: Form + Preview */}
      <div className="flex-1 overflow-hidden flex">
        {/* LEFT: Form */}
        <div className="w-[440px] shrink-0 overflow-y-auto border-r p-5 space-y-5" style={{ borderColor: 'var(--border)' }}>

          {/* 01 CLIENTE */}
          <div>
            <SectionHeader number="01" icon={<span className="text-sm">👤</span>} title="Cliente" />
            {clientes.length > 0 && (
              <div className="mb-3" ref={clienteRef}>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 pointer-events-none" style={{ color: 'var(--tinta-500)' }} />
                  <input type="text" className="input pl-8 pr-8 text-sm" placeholder="Buscar en red de obra..."
                    value={clienteSearch}
                    onChange={e => { setClienteSearch(e.target.value); setClienteOpen(true); if (!e.target.value) setClientePick('') }}
                    onFocus={() => setClienteOpen(true)} />
                  {clienteSearch && (
                    <button type="button" onClick={() => { setClienteSearch(''); setClientePick('') }}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2" style={{ color: 'var(--tinta-500)' }}>
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                  {clienteOpen && clientesFiltrados.length > 0 && (
                    <div className="absolute z-20 left-0 right-0 top-full mt-1 rounded-xl border bg-white shadow-lg overflow-hidden max-h-48 overflow-y-auto" style={{ borderColor: 'var(--border)' }}>
                      {clientesFiltrados.map(c => (
                        <button key={c.id} type="button" onMouseDown={() => fillFromCliente(c)}
                          className="w-full text-left px-3 py-2 hover:bg-gray-50 transition-colors flex items-center gap-3 border-b last:border-0" style={{ borderColor: 'var(--border)' }}>
                          <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
                            style={{ background: 'var(--bosque-50)', color: 'var(--bosque-600)' }}>
                            {c.nombre[0]?.toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-medium truncate" style={{ color: 'var(--tinta)' }}>{c.nombre}</p>
                            {c.empresa_cliente && <p className="text-[11px] truncate" style={{ color: 'var(--tinta-500)' }}>{c.empresa_cliente}</p>}
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <Link href="/dashboard/contactos" className="text-[11px] hover:underline mt-1 inline-block" style={{ color: 'var(--bosque-500)' }}>
                  Importar desde Red de obra →
                </Link>
              </div>
            )}
            <div className="space-y-2.5">
              <div>
                <label className="text-[10px] font-semibold uppercase tracking-widest mb-1 block" style={{ color: 'var(--tinta-500)' }}>Nombre / Razon Social</label>
                <input value={form.cliente_nombre} onChange={e => setForm({ ...form, cliente_nombre: e.target.value })}
                  className="input text-sm" required maxLength={150} />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] font-semibold uppercase tracking-widest mb-1 block" style={{ color: 'var(--tinta-500)' }}>RFC</label>
                  <input value={form.cliente_rfc} onChange={e => setForm({ ...form, cliente_rfc: e.target.value.toUpperCase() })}
                    className="input text-sm font-mono" maxLength={13} placeholder="XAXX010101000" />
                </div>
                <div>
                  <label className="text-[10px] font-semibold uppercase tracking-widest mb-1 block" style={{ color: 'var(--tinta-500)' }}>WhatsApp</label>
                  <input value={form.cliente_telefono} onChange={e => setForm({ ...form, cliente_telefono: e.target.value })}
                    className="input text-sm" placeholder="+52 55 1234 5678" />
                </div>
              </div>
            </div>
          </div>

          {/* 02 PARTIDAS */}
          <div>
            <SectionHeader number="02" icon={<span className="text-sm">📋</span>} title="Partidas" />
            <div className="space-y-2">
              {items.map((item, idx) => (
                <div key={item.id} className="rounded-xl p-3 space-y-2" style={{ border: '1px solid var(--border)', background: 'rgba(255,255,255,0.5)' }}>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono font-bold" style={{ color: 'var(--tinta-500)' }}>{String(idx + 1).padStart(2, '0')}</span>
                    <button type="button" onClick={() => removeItem(item.id)} disabled={items.length === 1}
                      className="p-1 rounded hover:bg-red-50 transition-colors disabled:opacity-20" style={{ color: 'var(--tinta-500)' }}>
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                  <input value={item.concepto} onChange={e => updateItem(item.id, 'concepto', e.target.value)}
                    className="input text-sm" placeholder="Concepto / Partida" required />
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="text-[9px] font-semibold uppercase tracking-widest block mb-0.5" style={{ color: 'var(--tinta-500)' }}>Cant.</label>
                      <input type="number" step="0.01" min="0" value={item.cantidad}
                        onChange={e => updateItem(item.id, 'cantidad', parseFloat(e.target.value) || 0)}
                        className="input text-sm text-center" />
                    </div>
                    <div>
                      <label className="text-[9px] font-semibold uppercase tracking-widest block mb-0.5" style={{ color: 'var(--tinta-500)' }}>Unidad</label>
                      <select value={item.unidad} onChange={e => updateItem(item.id, 'unidad', e.target.value)} className="input text-sm">
                        {UNIDADES.map(u => <option key={u}>{u}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="text-[9px] font-semibold uppercase tracking-widest block mb-0.5" style={{ color: 'var(--tinta-500)' }}>P. Unit.</label>
                      <input type="number" step="0.01" min="0" value={item.precio_unitario}
                        onChange={e => updateItem(item.id, 'precio_unitario', parseFloat(e.target.value) || 0)}
                        className="input text-sm text-right font-mono" />
                    </div>
                  </div>
                  <div className="text-right text-xs font-mono font-bold" style={{ color: 'var(--bosque-600)' }}>
                    {formatMXN(item.cantidad * item.precio_unitario)}
                  </div>
                </div>
              ))}
            </div>
            <div className="flex gap-2 mt-3">
              <button type="button" onClick={addItem}
                className="flex items-center gap-1.5 text-xs px-3 py-2 rounded-lg transition-colors"
                style={{ border: '1px solid var(--border)', color: 'var(--tinta-500)' }}>
                <Plus className="w-3.5 h-3.5" /> Agregar partida
              </button>
              <button type="button" onClick={() => setShowCuantificar(true)}
                className="flex items-center gap-1.5 text-xs px-3 py-2 rounded-lg transition-colors"
                style={{ border: '1px solid rgba(217,164,65,0.3)', color: 'var(--ambar)', background: 'rgba(217,164,65,0.06)' }}>
                <Sparkles className="w-3.5 h-3.5" /> Cuantificar IA
              </button>
            </div>
          </div>

          {/* 03 CONFIGURACION */}
          <div>
            <SectionHeader number="03" icon={<span className="text-sm">⚙️</span>} title="Configuracion del PDF" />
            <div className="space-y-0.5">
              <Toggle checked={form.mostrar_iva} onChange={v => setForm({ ...form, mostrar_iva: v })}
                label={`${labelImpuesto} ${form.iva_porcentaje}%`} />
              <Toggle checked={form.show_descuento} onChange={v => setForm({ ...form, show_descuento: v })}
                label={`Mostrar descuento${form.descuento_porcentaje > 0 ? ` ${form.descuento_porcentaje}%` : ''}`} />
              <Toggle checked={form.show_firma} onChange={v => setForm({ ...form, show_firma: v })}
                label="Firma del arquitecto" />
              <Toggle checked={form.show_terminos} onChange={v => setForm({ ...form, show_terminos: v })}
                label="Terminos y condiciones" />
              <Toggle checked={form.show_anticipo} onChange={v => setForm({ ...form, show_anticipo: v })}
                label="Anticipo 50% al inicio" />
            </div>

            {form.show_descuento && (
              <div className="grid grid-cols-2 gap-2 mt-3">
                <div>
                  <label className="text-[10px] font-semibold uppercase tracking-widest mb-1 block" style={{ color: 'var(--tinta-500)' }}>Descuento %</label>
                  <input type="number" step="0.01" min="0" max="100" value={form.descuento_porcentaje}
                    onChange={e => setForm({ ...form, descuento_porcentaje: parseFloat(e.target.value) || 0 })}
                    className="input text-sm" />
                </div>
                <div>
                  <label className="text-[10px] font-semibold uppercase tracking-widest mb-1 block" style={{ color: 'var(--tinta-500)' }}>Descuento $</label>
                  <input type="number" step="0.01" min="0" value={form.descuento_monto}
                    onChange={e => setForm({ ...form, descuento_monto: parseFloat(e.target.value) || 0 })}
                    className="input text-sm" />
                </div>
              </div>
            )}

            {form.show_firma && (
              <div className="grid grid-cols-2 gap-2 mt-3">
                <div>
                  <label className="text-[10px] font-semibold uppercase tracking-widest mb-1 block" style={{ color: 'var(--tinta-500)' }}>Nombre firma</label>
                  <input value={form.firma_nombre} onChange={e => setForm({ ...form, firma_nombre: e.target.value })}
                    className="input text-sm" placeholder="Tu nombre" maxLength={100} />
                </div>
                <div>
                  <label className="text-[10px] font-semibold uppercase tracking-widest mb-1 block" style={{ color: 'var(--tinta-500)' }}>Cargo</label>
                  <input value={form.firma_cargo} onChange={e => setForm({ ...form, firma_cargo: e.target.value })}
                    className="input text-sm" placeholder="Arq. / Director" maxLength={80} />
                </div>
              </div>
            )}

            {form.show_terminos && (
              <div className="mt-3">
                <label className="text-[10px] font-semibold uppercase tracking-widest mb-1 block" style={{ color: 'var(--tinta-500)' }}>Notas y condiciones</label>
                <textarea value={form.notas} onChange={e => setForm({ ...form, notas: e.target.value })}
                  className="input text-sm h-16 resize-none" maxLength={500} placeholder="Precios en MXN, vigencia..." />
              </div>
            )}
          </div>

          {/* TOTAL CARD */}
          <div className="rounded-2xl p-5" style={{ background: 'var(--bosque-50)', border: '1px solid var(--bosque-200)' }}>
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] mb-2" style={{ color: 'var(--bosque-600)' }}>Total cotizacion</p>
            <p className="font-display text-3xl font-bold" style={{ color: 'var(--bosque-600)' }}>
              {formatMXN(total)} <span className="text-sm font-normal">{form.moneda}</span>
            </p>
            <div className="mt-3 pt-3 space-y-1.5 text-xs" style={{ borderTop: '1px solid var(--bosque-200)' }}>
              <div className="flex justify-between" style={{ color: 'var(--tinta-500)' }}>
                <span>Subtotal</span><span className="font-mono">{formatMXN(subtotal)}</span>
              </div>
              {descuentoTotal > 0 && (
                <div className="flex justify-between" style={{ color: '#c0392b' }}>
                  <span>Descuento{form.descuento_porcentaje > 0 ? ` ${form.descuento_porcentaje}%` : ''}</span>
                  <span className="font-mono">-{formatMXN(descuentoTotal)}</span>
                </div>
              )}
              {aplicaImpuesto && (
                <div className="flex justify-between" style={{ color: form.tipo_impuesto === 'isr' ? '#c0392b' : 'var(--tinta-500)' }}>
                  <span>{labelImpuesto} {form.iva_porcentaje}%</span>
                  <span className="font-mono">{form.tipo_impuesto === 'isr' ? '-' : ''}{formatMXN(ivaMonto)}</span>
                </div>
              )}
            </div>
          </div>

          {saveError && (
            <div className="rounded-xl p-3 text-sm" style={{ background: 'rgba(224,82,82,0.08)', color: '#c0392b', border: '1px solid rgba(224,82,82,0.2)' }}>
              {saveError}
            </div>
          )}
        </div>

        {/* RIGHT: Live Preview */}
        <div className="flex-1 overflow-y-auto p-6" style={{ background: 'var(--cuero-100)' }}>
          <div className="max-w-[680px] mx-auto bg-white rounded-lg shadow-lg overflow-hidden" style={{ fontFamily: 'var(--font-body)' }}>
            {/* PDF Header */}
            <div className="p-8 pb-6 flex justify-between items-start" style={{ borderBottom: `3px solid ${form.color_primario}` }}>
              <div>
                {logoPreview && <img src={logoPreview} alt="logo" className="h-10 mb-2 object-contain" />}
                <p className="font-display text-lg font-bold" style={{ color: form.color_primario }}>{empresaNombre || 'Tu Empresa'}</p>
                {empresaRfc && <p className="text-[10px] font-mono" style={{ color: '#888' }}>{empresaRfc}</p>}
                {empresaDireccion && <p className="text-[10px]" style={{ color: '#888' }}>{empresaDireccion}</p>}
              </div>
              <div className="text-right">
                <p className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: '#888' }}>Cotizacion</p>
                <p className="font-display text-3xl font-bold" style={{ color: form.color_primario }}>N° {String(nextNum).padStart(4, '0')}</p>
                <div className="text-[10px] mt-2 space-y-0.5" style={{ color: '#666' }}>
                  <p>Fecha · {form.fecha_emision.split('-').reverse().join(' / ')}</p>
                  {vigenciaDias !== null && <p>Vigencia · {vigenciaDias} dias</p>}
                  <p>Folio · {folio}</p>
                </div>
              </div>
            </div>

            {/* Client + Project */}
            <div className="px-8 py-5 grid grid-cols-2 gap-6" style={{ borderBottom: '1px solid #eee' }}>
              <div>
                <p className="text-[9px] font-semibold uppercase tracking-[0.2em] mb-1.5" style={{ color: '#999' }}>Cliente</p>
                <p className="text-sm font-semibold" style={{ color: '#1a1a1a' }}>{form.cliente_nombre || 'Nombre del cliente'}</p>
                {form.cliente_rfc && <p className="text-[10px] font-mono" style={{ color: '#666' }}>RFC: {form.cliente_rfc}</p>}
                {form.cliente_direccion && <p className="text-[10px]" style={{ color: '#666' }}>{form.cliente_direccion}</p>}
                {form.cliente_telefono && <p className="text-[10px]" style={{ color: '#666' }}>{form.cliente_telefono}</p>}
              </div>
              <div>
                <p className="text-[9px] font-semibold uppercase tracking-[0.2em] mb-1.5" style={{ color: '#999' }}>Proyecto</p>
                <p className="text-sm font-semibold" style={{ color: '#1a1a1a' }}>{form.titulo || 'Titulo del proyecto'}</p>
              </div>
            </div>

            {/* Items Table */}
            <div className="px-8 py-5">
              <table className="w-full text-[11px]">
                <thead>
                  <tr style={{ borderBottom: `2px solid ${form.color_primario}` }}>
                    <th className="text-left py-2 pr-2 font-semibold uppercase tracking-widest" style={{ color: '#999', width: 28 }}>#</th>
                    <th className="text-left py-2 pr-2 font-semibold uppercase tracking-widest" style={{ color: '#999' }}>Partida</th>
                    <th className="text-right py-2 px-2 font-semibold uppercase tracking-widest" style={{ color: '#999', width: 50 }}>Cant.</th>
                    <th className="text-right py-2 px-2 font-semibold uppercase tracking-widest" style={{ color: '#999', width: 70 }}>P. Unit.</th>
                    <th className="text-right py-2 pl-2 font-semibold uppercase tracking-widest" style={{ color: '#999', width: 80 }}>Importe</th>
                  </tr>
                </thead>
                <tbody>
                  {(validItems.length > 0 ? validItems : [{ id: '0', concepto: 'Concepto ejemplo', descripcion: '', cantidad: 1, unidad: 'pza', precio_unitario: 0 }]).map((item, idx) => (
                    <tr key={item.id} style={{ borderBottom: '1px solid #f0f0f0' }}>
                      <td className="py-2.5 pr-2 font-mono font-bold" style={{ color: form.color_primario }}>{String(idx + 1).padStart(2, '0')}</td>
                      <td className="py-2.5 pr-2">
                        <p className="font-medium" style={{ color: '#1a1a1a' }}>{item.concepto}</p>
                        <p className="text-[9px] uppercase" style={{ color: '#aaa' }}>{item.unidad}</p>
                      </td>
                      <td className="py-2.5 px-2 text-right font-mono" style={{ color: '#333' }}>{item.cantidad}</td>
                      <td className="py-2.5 px-2 text-right font-mono" style={{ color: '#333' }}>{formatMXN(item.precio_unitario)}</td>
                      <td className="py-2.5 pl-2 text-right font-mono font-bold" style={{ color: '#1a1a1a' }}>{formatMXN(item.cantidad * item.precio_unitario)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Notes + Totals */}
            <div className="px-8 pb-8 flex gap-8">
              <div className="flex-1">
                {(form.show_terminos || form.show_anticipo) && (
                  <div>
                    <p className="text-[9px] font-semibold uppercase tracking-[0.2em] mb-1.5" style={{ color: '#999' }}>Notas y Condiciones</p>
                    <p className="text-[10px] leading-relaxed" style={{ color: '#666' }}>
                      {[form.notas, form.show_anticipo ? form.condiciones_pago : '', form.show_terminos ? form.terminos : ''].filter(Boolean).join('. ')}
                    </p>
                  </div>
                )}
                {form.show_firma && form.firma_nombre && (
                  <div className="mt-6 pt-4" style={{ borderTop: '1px solid #eee' }}>
                    <div className="w-32 border-b border-black mb-1" />
                    <p className="text-[11px] font-semibold" style={{ color: '#1a1a1a' }}>{form.firma_nombre}</p>
                    {form.firma_cargo && <p className="text-[10px]" style={{ color: '#888' }}>{form.firma_cargo}</p>}
                  </div>
                )}
              </div>
              <div className="w-48 shrink-0">
                <div className="space-y-1.5 text-[11px]">
                  <div className="flex justify-between" style={{ color: '#666' }}>
                    <span>Subtotal</span><span className="font-mono">{formatMXN(subtotal)}</span>
                  </div>
                  {descuentoTotal > 0 && (
                    <div className="flex justify-between" style={{ color: '#c0392b' }}>
                      <span>Descuento{form.descuento_porcentaje > 0 ? ` ${form.descuento_porcentaje}%` : ''}</span>
                      <span className="font-mono">-{formatMXN(descuentoTotal)}</span>
                    </div>
                  )}
                  {aplicaImpuesto && (
                    <div className="flex justify-between" style={{ color: '#666' }}>
                      <span>{labelImpuesto} {form.iva_porcentaje}%</span>
                      <span className="font-mono">{formatMXN(ivaMonto)}</span>
                    </div>
                  )}
                  <div className="flex justify-between pt-2 font-bold text-base" style={{ borderTop: `2px solid ${form.color_primario}`, color: '#1a1a1a' }}>
                    <span>Total</span>
                    <span className="font-mono">{formatMXN(total)}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {showCuantificar && (
        <CuantificarModal onClose={() => setShowCuantificar(false)}
          onAgregar={handleCuantificarAgregar} contexto={form.titulo || undefined} />
      )}
    </div>
  )
}

export default function NuevaCotizacionPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center h-64">
        <div className="w-6 h-6 border-2 rounded-full animate-spin" style={{ borderColor: 'var(--border)', borderTopColor: 'var(--primary)' }} />
      </div>
    }>
      <NuevaCotizacionPageInner />
    </Suspense>
  )
}
