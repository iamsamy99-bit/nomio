'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { Bell } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { buildReminderFeed } from '@/lib/recordatorios/feed'
import { notifyReminderToday, requestReminderNotificationPermission } from '@/lib/recordatorios/browser-notify'
import ReminderList from '@/components/recordatorios/ReminderList'
import type { Cliente, Cotizacion, Proyecto, ProyectoRecordatorio } from '@/types'

const MS_DAY = 86400000

export default function RemindersBell() {
  const supabase = useMemo(() => createClient(), [])
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const [empresaId, setEmpresaId] = useState('')
  const ref = useRef<HTMLDivElement>(null)

  const [proyectos, setProyectos] = useState<Proyecto[]>([])
  const [recordatorios, setRecordatorios] = useState<ProyectoRecordatorio[]>([])
  const [cotizaciones, setCotizaciones] = useState<Cotizacion[]>([])
  const [clientes, setClientes] = useState<Cliente[]>([])

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data: eu } = await supabase.from('empresa_users').select('empresa_id').eq('user_id', user.id).single()
      if (!eu) return
      setEmpresaId(eu.empresa_id)

      const [p, r, c, cl] = await Promise.all([
        supabase.from('proyectos').select('*').eq('empresa_id', eu.empresa_id).eq('activo', true),
        supabase.from('proyecto_recordatorios').select('*, proyectos(nombre), clientes(nombre)').eq('empresa_id', eu.empresa_id).eq('completado', false),
        supabase.from('cotizaciones').select('id, titulo, numero_cotizacion, cliente_nombre, fecha_validez, estado, total, moneda').eq('empresa_id', eu.empresa_id).not('fecha_validez', 'is', null).in('estado', ['borrador', 'enviada']),
        supabase.from('clientes').select('id, nombre, tipo, ultimo_contacto_at, activo').eq('empresa_id', eu.empresa_id).eq('activo', true).eq('tipo', 'cliente'),
      ])

      setProyectos(p.data || [])
      setRecordatorios((r.data || []) as ProyectoRecordatorio[])
      setCotizaciones((c.data || []) as Cotizacion[])
      setClientes((cl.data || []) as Cliente[])
    } finally {
      setLoading(false)
    }
  }, [supabase])

  useEffect(() => { load() }, [load])

  const items = useMemo(
    () => buildReminderFeed({ proyectos, recordatorios, cotizaciones, clientes }),
    [proyectos, recordatorios, cotizaciones, clientes],
  )

  const preview = items.slice(0, 6)
  const count = items.length

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])

  useEffect(() => {
    if (loading || !items.length) return
    const todayItems = items.filter((i) => i.urgency === 'today' || i.urgency === 'overdue')
    if (!todayItems.length) return
    requestReminderNotificationPermission().then((p) => {
      if (p === 'granted') {
        notifyReminderToday(todayItems.map((i) => ({ titulo: i.titulo, subtitulo: i.subtitulo })))
      }
    })
  }, [loading, items])

  const markComplete = async (id: string) => {
    await supabase.from('proyecto_recordatorios').update({ completado: true }).eq('id', id)
    await load()
  }

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="p-2 rounded-xl hover:bg-surface/10 transition-colors relative"
        aria-label={`Recordatorios${count ? `, ${count} pendientes` : ''}`}
      >
        <Bell className="w-4 h-4 text-slate-300 dark:text-slate-300 hover:text-white transition-colors duration-200" />
        {count > 0 && (
          <span
            key={count}
            className="absolute top-1 right-1 bg-red-600 text-white text-xs font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center animate-badge-pop"
          >
            {count > 9 ? '9+' : count}
          </span>
        )}
      </button>

      {open && (
        <div
          className="absolute top-full right-0 mt-2 w-[min(100vw-2rem,360px)] rounded-2xl shadow-2xl z-50 border overflow-hidden animate-slide-in-down"
          style={{ background: 'var(--surface-2)', borderColor: 'var(--border-bright)' }}
        >
          <div className="px-4 py-3 border-b flex items-center justify-between" style={{ borderColor: 'var(--divider)' }}>
            <p className="font-display font-semibold text-sm">Recordatorios</p>
            <Link href="/dashboard/recordatorios" onClick={() => setOpen(false)} className="text-xs text-primary hover:underline">
              Ver todos
            </Link>
          </div>
          <div className="p-3">
            {loading ? (
              <p className="text-xs text-ink-soft text-center py-6">Cargando...</p>
            ) : (
              <ReminderList items={preview} onComplete={markComplete} compact emptyMessage="Todo al dia." />
            )}
          </div>
        </div>
      )}
    </div>
  )
}
