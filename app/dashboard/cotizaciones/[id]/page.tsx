'use client'
import { useEffect, useState, useCallback, useMemo } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useEmpresa } from '@/components/layout/EmpresaContext'
import { ArrowLeft, Download, Plus, Trash2, Save, Sparkles, Lock } from 'lucide-react'
import EnviarCotizacionActions from '@/components/crm/EnviarCotizacionActions'
import type { Cliente } from '@/types'
import { formatMXN, formatDate, sanitizeText } from '@/lib/utils'
import { logAudit } from '@/lib/audit'
import { toast } from 'sonner'
import type { Cotizacion, CotizacionItem } from '@/types'
import CuantificarModal, { type CuantificarResultado } from '@/components/cuantificar/CuantificarModal'
import { UNIDADES } from '@/lib/constants'
import { ATELIER, atelierPdfHeader, atelierTable, atelierTotales, atelierPdfFooter } from '@/lib/export/atelier-theme'

const uid = () => Math.random().toString(36).slice(2)

export default function CotizacionDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const supabase = useMemo(() => createClient(), [])
  const [cot, setCot] = useState<Cotizacion | null>(null)
  const [items, setItems] = useState<CotizacionItem[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [exporting, setExporting] = useState(false)
  const { empresa } = useEmpresa()
  const tier = empresa.suscripcion_tier
  const [showCuantificar, setShowCuantificar] = useState(false)
  const [contacto, setContacto] = useState<Cliente | null>(null)

  const loadData = useCallback(async () => {
    const [{ data: c }, { data: i }] = await Promise.all([
      supabase.from('cotizaciones').select('*').eq('id', id).single(),
      supabase.from('cotizacion_items').select('*').eq('cotizacion_id', id).order('orden'),
    ])
    setCot(c); setItems(i || []); setLoading(false)
    if (c?.cliente_id) {
      const { data: cl } = await supabase.from('clientes').select('*').eq('id', c.cliente_id).single()
      if (cl) setContacto(cl as Cliente)
    } else {
      setContacto(null)
    }
  }, [id, supabase])

  useEffect(() => { loadData() }, [loadData])

  const subtotal = items.reduce((s, i) => s + i.cantidad * i.precio_unitario, 0)
  const ivaMonto = subtotal * ((cot?.iva_porcentaje || 16) / 100)
  const total = subtotal + ivaMonto

  const updateItem = (iid: string, field: string, value: string | number) =>
    setItems(p => p.map(i => {
      if (i.id !== iid) return i
      const updated = { ...i, [field]: value }
      updated.importe = updated.cantidad * updated.precio_unitario
      return updated
    }))

  const addItem = () => setItems(p => [...p, { id: uid(), empresa_id: cot!.empresa_id, cotizacion_id: id, orden: p.length, concepto: '', descripcion: '', cantidad: 1, unidad: 'pza', precio_unitario: 0, importe: 0 }])
  const removeItem = (iid: string) => setItems(p => p.filter(i => i.id !== iid))

  const handleCuantificarAgregar = (item: CuantificarResultado) => {
    if (!cot) return
    setItems(prev => [...prev, {
      id: uid(),
      empresa_id: cot.empresa_id,
      cotizacion_id: id,
      orden: prev.length,
      concepto: item.descripcion,
      descripcion: item.supuestos ? `Supuestos: ${item.supuestos}` : '',
      cantidad: item.cantidad,
      unidad: item.unidad,
      precio_unitario: 0,
      importe: 0,
    }])
  }

  const handleSave = async () => {
    if (!cot) return
    setSaving(true)
    await supabase.from('cotizaciones').update({
      titulo: sanitizeText(cot.titulo),
      cliente_nombre: sanitizeText(cot.cliente_nombre),
      estado: cot.estado, notas: cot.notas, terminos: cot.terminos,
      subtotal, iva_monto: ivaMonto, total,
    }).eq('id', id)
    await supabase.from('cotizacion_items').delete().eq('cotizacion_id', id)
    const payload = items.filter(i => i.concepto).map((i, idx) => ({
      empresa_id: cot.empresa_id, cotizacion_id: id, orden: idx,
      concepto: sanitizeText(i.concepto), descripcion: i.descripcion || null,
      cantidad: i.cantidad, unidad: i.unidad,
      precio_unitario: i.precio_unitario, importe: i.cantidad * i.precio_unitario,
    }))
    if (payload.length) await supabase.from('cotizacion_items').insert(payload)
    setSaving(false)
    toast.success('Cotización guardada')
  }

  // Export PDF disponible para TODOS los usuarios (incluye plan gratuito — 10/mes)
  const handleExportPDF = async () => {
    if (!cot) return
    setExporting(true)
    try {
      const jsPDF = (await import('jspdf')).default
      const autoTable = (await import('jspdf-autotable')).default
      const doc = new jsPDF()

      const y = atelierPdfHeader(doc, {
        titulo: 'Cotización',
        subtitulo: `#COT-${String(cot.numero_cotizacion).padStart(4, '0')}`,
        empresa: `${empresa?.nombre || ''}${empresa?.rfc ? ` · RFC: ${empresa.rfc}` : ''}`,
        meta: [
          `Fecha: ${formatDate(cot.fecha_emision)}`,
          ...(cot.fecha_validez ? [`Válida hasta: ${formatDate(cot.fecha_validez)}`] : []),
          `Para: ${cot.cliente_nombre}`,
          ...(cot.cliente_email ? [cot.cliente_email] : []),
          ...(cot.cliente_telefono ? [cot.cliente_telefono] : []),
        ],
      })

      autoTable(doc, atelierTable({
        startY: y,
        head: [['#', 'Concepto', 'Descripción', 'Cant.', 'Unidad', 'P. Unit.', 'Importe']],
        body: items.map((i, idx) => [
          idx + 1, i.concepto, i.descripcion || '', i.cantidad, i.unidad,
          formatMXN(i.precio_unitario), formatMXN(i.cantidad * i.precio_unitario)
        ]),
        columnStyles: { 5: { halign: 'right' }, 6: { halign: 'right' } },
      }))

      const finalY = (doc as unknown as InstanceType<typeof jsPDF> & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 9

      atelierTotales(doc, finalY, [
        ['Subtotal', formatMXN(subtotal)],
        [`IVA (${cot.iva_porcentaje}%)`, formatMXN(ivaMonto)],
      ], [`TOTAL ${cot.moneda}`, formatMXN(total)])

      if (cot.notas) {
        doc.setFont('helvetica', 'normal'); doc.setFontSize(8); doc.setTextColor(...ATELIER.tinta500)
        doc.text('Notas:', 14, finalY); doc.text(cot.notas, 14, finalY + 5)
      }
      if (cot.terminos) {
        const ty = finalY + (cot.notas ? 14 : 0)
        doc.setFont('helvetica', 'normal'); doc.setFontSize(8); doc.setTextColor(...ATELIER.tinta500)
        doc.text('Términos:', 14, ty); doc.text(cot.terminos, 14, ty + 5)
      }

      atelierPdfFooter(doc)

      doc.save(`cotizacion-${cot.numero_cotizacion}.pdf`)
      toast.success('PDF generado correctamente')
    } catch (err) {
      toast.error('Error al generar PDF. Intenta de nuevo.')
      console.error(err)
    } finally {
      setExporting(false)
    }
  }

  if (loading) return <div className="flex items-center justify-center h-64 text-gray-400">Cargando...</div>
  if (!cot) return <div className="text-center text-ink-soft mt-20">Cotización no encontrada</div>

  const badgeCls = { borrador: 'bg-gray-100 text-ink-soft', enviada: 'bg-blue-100 text-blue-700', aceptada: 'bg-green-100 text-green-700', rechazada: 'bg-red-100 text-red-700' }[cot.estado] || 'bg-gray-100 text-ink-soft'

  return (
    <div className="max-w-5xl mx-auto pb-10">
      <div className="flex items-center justify-between gap-3 mb-6 flex-wrap">
        <div className="flex items-center gap-3">
          <button onClick={() => router.back()} className="p-2 rounded-lg hover:bg-surface border border-border">
            <ArrowLeft className="w-4 h-4 text-ink-soft" />
          </button>
          <div>
            <div className="flex items-center gap-2 mb-0.5">
              <span className="font-mono text-xs text-ink-soft">#COT-{String(cot.numero_cotizacion).padStart(4, '0')}</span>
              <select value={cot.estado} onChange={e => setCot({ ...cot, estado: e.target.value as Cotizacion['estado'] })}
                className={`text-xs font-medium px-2 py-0.5 rounded border-0 cursor-pointer ${badgeCls}`}>
                <option value="borrador">borrador</option>
                <option value="enviada">enviada</option>
                <option value="aceptada">aceptada</option>
                <option value="rechazada">rechazada</option>
              </select>
            </div>
            <p className="font-display font-bold text-ink">{cot.titulo}</p>
            <p className="text-sm text-ink-soft">Para: {cot.cliente_nombre}</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2 justify-end">
          <button onClick={handleSave} disabled={saving} className="btn-secondary flex items-center gap-2 text-sm">
            <Save className="w-4 h-4" />{saving ? 'Guardando...' : 'Guardar'}
          </button>
          <button onClick={handleExportPDF} disabled={exporting} className="btn-primary flex items-center gap-2 text-sm">
            <Download className="w-4 h-4" />{exporting ? 'Generando...' : 'Exportar PDF'}
          </button>
        </div>
      </div>

      {cot && empresa && (
        <div className="tile mb-4">
          <p className="text-xs text-ink-soft uppercase tracking-wide font-semibold mb-2">Enviar al cliente</p>
          <EnviarCotizacionActions
            cot={{
              id: cot.id,
              titulo: cot.titulo,
              numero_cotizacion: cot.numero_cotizacion,
              total,
              moneda: cot.moneda,
              cliente_nombre: cot.cliente_nombre,
            }}
            contacto={contacto ?? { nombre: cot.cliente_nombre, telefono: cot.cliente_telefono, email: cot.cliente_email }}
            empresaNombre={empresa.nombre}
            onMarkEnviada={async () => {
              await supabase.from('cotizaciones').update({ estado: 'enviada' }).eq('id', id)
              if (cot) logAudit({ supabase, empresaId: cot.empresa_id, tabla: 'cotizaciones', operacion: 'cotizacion_enviada', registroId: id })
              setCot({ ...cot, estado: 'enviada' })
              if (contacto?.id) {
                await supabase.from('clientes').update({ ultimo_contacto_at: new Date().toISOString() }).eq('id', contacto.id)
              }
            }}
          />
        </div>
      )}

      <div className="card mb-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display font-semibold" style={{ color: 'var(--tinta)' }}>Conceptos</h2>
          <div className="flex items-center gap-2">
            {tier === 'premium' ? (
              <button
                onClick={() => setShowCuantificar(true)}
                className="btn-secondary py-1.5 text-xs flex items-center gap-1.5 text-amber-700 border-amber-200 hover:bg-amber-50"
              >
                <Sparkles className="w-3.5 h-3.5" /> Cuantificar IA
              </button>
            ) : (
              <a
                href="/dashboard/planes"
                title="Disponible en Plan Maestro Premium — clic para ver planes"
                className="btn-secondary py-1.5 text-xs flex items-center gap-1.5 opacity-60 cursor-pointer"
                style={{ color: 'var(--tinta-500)' }}
              >
                <Lock className="w-3 h-3" /><Sparkles className="w-3 h-3" /> IA
              </a>
            )}
            <button onClick={addItem} className="btn-secondary py-1.5 text-xs flex items-center gap-1"><Plus className="w-3.5 h-3.5" />Agregar</button>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="border-b border-border text-xs uppercase" style={{ color: 'var(--tinta-500)' }}>
              <th className="text-left py-2 w-8">#</th>
              <th className="text-left py-2">Concepto</th>
              <th className="text-right py-2 w-16">Cant.</th>
              <th className="text-left py-2 w-20">Unidad</th>
              <th className="text-right py-2 w-28">Precio Unit.</th>
              <th className="text-right py-2 w-28">Importe</th>
              <th className="w-8" />
            </tr></thead>
            <tbody className="divide-y divide-border">
              {items.map((item, idx) => (
                <tr key={item.id}>
                  <td className="py-2 text-gray-400 text-xs">{idx + 1}</td>
                  <td className="py-2 pr-2"><input value={item.concepto} onChange={e => updateItem(item.id, 'concepto', e.target.value)} className="input py-1 text-sm" placeholder="Concepto" /></td>
                  <td className="py-2 text-right"><input type="number" min="0" step="0.01" value={item.cantidad} onChange={e => updateItem(item.id, 'cantidad', parseFloat(e.target.value) || 0)} className="input py-1 text-sm w-16 text-right" /></td>
                  <td className="py-2 px-1">
                    <select value={item.unidad} onChange={e => updateItem(item.id, 'unidad', e.target.value)} className="input py-1 text-sm">
                      {UNIDADES.map(u => <option key={u}>{u}</option>)}
                    </select>
                  </td>
                  <td className="py-2"><input type="number" min="0" step="0.01" value={item.precio_unitario} onChange={e => updateItem(item.id, 'precio_unitario', parseFloat(e.target.value) || 0)} className="input py-1 text-sm text-right" /></td>
                  <td className="py-2 text-right font-mono text-accent font-semibold text-sm">{formatMXN(item.cantidad * item.precio_unitario)}</td>
                  <td className="py-2 pl-1"><button onClick={() => removeItem(item.id)} disabled={items.length === 1} className="p-1 hover:bg-red-50 rounded text-gray-400 hover:text-red-500 disabled:opacity-30"><Trash2 className="w-3.5 h-3.5" /></button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="mt-4 pt-4 border-t border-border space-y-1.5 text-sm max-w-xs ml-auto">
          <div className="flex justify-between" style={{ color: 'var(--tinta-500)' }}><span>Subtotal</span><span className="font-mono">{formatMXN(subtotal)}</span></div>
          <div className="flex justify-between" style={{ color: 'var(--tinta-500)' }}><span>IVA ({cot.iva_porcentaje}%)</span><span className="font-mono">{formatMXN(ivaMonto)}</span></div>
          <div className="flex justify-between font-bold text-base border-t pt-2">
            <span>Total {cot.moneda}</span><span className="font-mono text-accent">{formatMXN(total)}</span>
          </div>
        </div>
      </div>

      <div className="card grid sm:grid-cols-2 gap-4">
        <div><label className="label">Notas</label><textarea value={cot.notas || ''} onChange={e => setCot({ ...cot, notas: e.target.value })} className="input h-24 resize-none" maxLength={500} /></div>
        <div><label className="label">Términos y condiciones</label><textarea value={cot.terminos || ''} onChange={e => setCot({ ...cot, terminos: e.target.value })} className="input h-24 resize-none" maxLength={500} /></div>
      </div>

      {showCuantificar && (
        <CuantificarModal
          onClose={() => setShowCuantificar(false)}
          onAgregar={handleCuantificarAgregar}
          contexto={cot.titulo || undefined}
        />
      )}
    </div>
  )
}
