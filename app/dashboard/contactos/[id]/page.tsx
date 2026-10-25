'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { useEmpresa } from '@/components/layout/EmpresaContext'
import {
  ArrowLeft, FilePlus, Pencil, MessageCircle, Mail, Bell, Plus,
} from 'lucide-react'
import { formatDate, formatMXN } from '@/lib/utils'
import ContactoTipoBadge from '@/components/crm/ContactoTipoBadge'
import EnviarCotizacionActions from '@/components/crm/EnviarCotizacionActions'
import { openEmailShare, openWhatsAppShare } from '@/lib/crm/share-cotizacion'
import type { Cliente, Cotizacion, TipoContacto } from '@/types'

export default function ContactoDetallePage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const supabase = useMemo(() => createClient(), [])
  const { empresaId, empresa } = useEmpresa()
  const empresaNombre = empresa.nombre || 'Tu empresa'
  const [contacto, setContacto] = useState<Cliente | null>(null)
  const [cotizaciones, setCotizaciones] = useState<Cotizacion[]>([])
  const [loading, setLoading] = useState(true)
  const [remTitulo, setRemTitulo] = useState('')
  const [remFecha, setRemFecha] = useState('')
  const [remSaving, setRemSaving] = useState(false)
  const [remMsg, setRemMsg] = useState('')

  const loadData = useCallback(async () => {
    const { data: c } = await supabase.from('clientes').select('*').eq('id', id).single()
    if (!c) { setLoading(false); return }
    setContacto({ ...c, tipo: (c.tipo as TipoContacto) || 'cliente' })

    const { data: cotById } = await supabase
      .from('cotizaciones')
      .select('*')
      .eq('empresa_id', empresaId)
      .eq('cliente_id', id)
      .order('created_at', { ascending: false })
      .limit(20)

    let list = cotById || []
    if (!list.length) {
      const { data: cotByName } = await supabase
        .from('cotizaciones')
        .select('*')
        .eq('empresa_id', empresaId)
        .ilike('cliente_nombre', c.nombre)
        .order('created_at', { ascending: false })
        .limit(20)
      list = cotByName || []
    }
    setCotizaciones(list)
    setLoading(false)
  }, [id, supabase, empresaId])

  useEffect(() => { loadData() }, [loadData])

  const touchContacto = async () => {
    await supabase.from('clientes').update({ ultimo_contacto_at: new Date().toISOString() }).eq('id', id)
  }

  const addReminder = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!empresaId || !contacto || !remTitulo.trim() || !remFecha) return
    setRemSaving(true)
    setRemMsg('')
    const { error } = await supabase.from('proyecto_recordatorios').insert({
      empresa_id: empresaId,
      cliente_id: contacto.id,
      titulo: remTitulo.trim(),
      fecha_recordatorio: remFecha,
      categoria: 'contacto',
      completado: false,
    })
    setRemSaving(false)
    if (error) {
      setRemMsg('No se pudo guardar. Verifica la migracion de recordatorios.')
      return
    }
    setRemTitulo('')
    setRemFecha('')
    setRemMsg('Recordatorio creado. Lo veras en Recordatorios.')
  }

  const markCotEnviada = async (cotId: string) => {
    await supabase.from('cotizaciones').update({ estado: 'enviada' }).eq('id', cotId)
    await touchContacto()
    await loadData()
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-6 h-6 border-2 border-stone-600 border-t-primary rounded-full animate-spin" />
      </div>
    )
  }

  if (!contacto) {
    return (
      <div className="text-center py-20 text-ink-soft">
        <p>Contacto no encontrado.</p>
        <Link href="/dashboard/contactos" className="btn-secondary text-sm mt-4 inline-block">Volver</Link>
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto pb-10">
      <div className="flex items-center gap-3 mb-6">
        <button type="button" onClick={() => router.back()} className="p-2 rounded-xl hover:bg-surface-2 border border-border">
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="font-display text-2xl font-bold truncate">{contacto.nombre}</h1>
            <ContactoTipoBadge tipo={contacto.tipo} />
          </div>
          <p className="text-sm text-ink-soft">
            {[contacto.puesto, contacto.empresa_cliente].filter(Boolean).join(' · ')}
          </p>
        </div>
        <Link href="/dashboard/contactos" className="btn-secondary text-sm hidden sm:flex items-center gap-1">
          <Pencil className="w-4 h-4" /> Lista
        </Link>
      </div>

      <div className="tile mb-4 space-y-3">
        <h2 className="font-display font-semibold text-sm">Datos de contacto</h2>
        <dl className="grid sm:grid-cols-2 gap-3 text-sm">
          <div>
            <dt className="text-xs text-ink-soft uppercase tracking-wide">Telefono</dt>
            <dd>{contacto.telefono || '—'}</dd>
          </div>
          <div>
            <dt className="text-xs text-ink-soft uppercase tracking-wide">Email</dt>
            <dd className="truncate">{contacto.email || '—'}</dd>
          </div>
          <div className="sm:col-span-2">
            <dt className="text-xs text-ink-soft uppercase tracking-wide">Direccion</dt>
            <dd>{contacto.direccion || '—'}</dd>
          </div>
          {contacto.notas && (
            <div className="sm:col-span-2">
              <dt className="text-xs text-ink-soft uppercase tracking-wide">Notas</dt>
              <dd className="text-ink-soft whitespace-pre-wrap">{contacto.notas}</dd>
            </div>
          )}
          {contacto.ultimo_contacto_at && (
            <div>
              <dt className="text-xs text-ink-soft uppercase tracking-wide">Ultimo contacto</dt>
              <dd>{formatDate(contacto.ultimo_contacto_at.slice(0, 10))}</dd>
            </div>
          )}
        </dl>
        <div className="flex flex-wrap gap-2 pt-2 border-t border-border">
          <button
            type="button"
            onClick={() => router.push(`/dashboard/cotizaciones/nueva?contacto=${contacto.id}`)}
            className="btn-primary text-sm flex items-center gap-2"
          >
            <FilePlus className="w-4 h-4" /> Nueva cotizacion
          </button>
          {contacto.telefono && (
            <button
              type="button"
              className="btn-secondary text-sm flex items-center gap-2"
              onClick={() => {
                openWhatsAppShare(contacto.telefono!, `Hola ${contacto.nombre}, te escribe ${empresaNombre}.`)
                touchContacto()
              }}
            >
              <MessageCircle className="w-4 h-4" /> WhatsApp
            </button>
          )}
          {contacto.email && (
            <button
              type="button"
              className="btn-secondary text-sm flex items-center gap-2"
              onClick={() => {
                openEmailShare(contacto.email!, `${empresaNombre}`, `Hola ${contacto.nombre},\n\n`)
                touchContacto()
              }}
            >
              <Mail className="w-4 h-4" /> Correo
            </button>
          )}
        </div>
      </div>

      <form onSubmit={addReminder} className="tile mb-4 space-y-3">
        <h2 className="font-display font-semibold text-sm flex items-center gap-2">
          <Bell className="w-4 h-4 text-primary" /> Recordatorio de seguimiento
        </h2>
        <div className="grid sm:grid-cols-2 gap-2">
          <input value={remTitulo} onChange={(e) => setRemTitulo(e.target.value)} className="input text-sm" placeholder="Ej. Llamar para confirmar cotizacion" required maxLength={120} />
          <input type="date" value={remFecha} onChange={(e) => setRemFecha(e.target.value)} className="input text-sm" required />
        </div>
        <button type="submit" disabled={remSaving} className="btn-secondary text-sm flex items-center gap-2 w-fit">
          <Plus className="w-4 h-4" /> {remSaving ? 'Guardando...' : 'Agendar'}
        </button>
        {remMsg && <p className="text-xs text-accent">{remMsg}</p>}
        <Link href="/dashboard/recordatorios" className="text-xs text-primary hover:underline block">Ver agenda completa</Link>
      </form>

      <div className="tile">
        <h2 className="font-display font-semibold mb-4">Cotizaciones ({cotizaciones.length})</h2>
        {!cotizaciones.length ? (
          <p className="text-sm text-ink-soft">Aun no hay cotizaciones vinculadas a este contacto.</p>
        ) : (
          <ul className="space-y-4">
            {cotizaciones.map((cot) => (
              <li key={cot.id} className="p-4 rounded-xl border border-border bg-surface-2/50">
                <div className="flex flex-wrap items-start justify-between gap-2 mb-2">
                  <div>
                    <Link href={`/dashboard/cotizaciones/${cot.id}`} className="font-semibold text-ink hover:text-primary transition-colors">
                      {cot.titulo}
                    </Link>
                    <p className="text-xs text-ink-soft font-mono mt-0.5">
                      #COT-{String(cot.numero_cotizacion).padStart(4, '0')} · {formatDate(cot.fecha_emision)} · {cot.estado}
                    </p>
                  </div>
                  <span className="font-mono text-accent font-semibold">{formatMXN(cot.total)}</span>
                </div>
                <EnviarCotizacionActions
                  cot={cot}
                  contacto={contacto}
                  empresaNombre={empresaNombre}
                  onMarkEnviada={() => markCotEnviada(cot.id)}
                  compact
                />
              </li>
            ))}
          </ul>
        )}
      </div>

      <Link href="/dashboard/contactos" className="text-sm text-primary hover:underline mt-6 inline-block">
        ← Toda la red de obra
      </Link>
    </div>
  )
}
