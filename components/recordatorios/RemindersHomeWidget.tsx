'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { Bell, ChevronRight } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { buildReminderFeed } from '@/lib/recordatorios/feed'
import ReminderList from '@/components/recordatorios/ReminderList'
import type { Cliente, Cotizacion, Proyecto, ProyectoRecordatorio } from '@/types'

export default function RemindersHomeWidget() {
  const supabase = useMemo(() => createClient(), [])
  const [loading, setLoading] = useState(true)
  const [proyectos, setProyectos] = useState<Proyecto[]>([])
  const [recordatorios, setRecordatorios] = useState<ProyectoRecordatorio[]>([])
  const [cotizaciones, setCotizaciones] = useState<Cotizacion[]>([])
  const [clientes, setClientes] = useState<Cliente[]>([])

  const load = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data: eu } = await supabase.from('empresa_users').select('empresa_id').eq('user_id', user.id).single()
      if (!eu) return

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
    () => buildReminderFeed({ proyectos, recordatorios, cotizaciones, clientes }).slice(0, 4),
    [proyectos, recordatorios, cotizaciones, clientes],
  )

  const markComplete = async (id: string) => {
    await supabase.from('proyecto_recordatorios').update({ completado: true }).eq('id', id)
    await load()
  }

  if (loading) return null

  return (
    <div className="tile mb-6">
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-display font-semibold text-sm flex items-center gap-2">
          <Bell className="w-4 h-4 text-primary" />
          Recordatorios proximos
        </h2>
        <Link href="/dashboard/recordatorios" className="text-xs text-primary hover:underline flex items-center gap-0.5">
          Ver todos <ChevronRight className="w-3 h-3" />
        </Link>
      </div>
      <ReminderList
        items={items}
        onComplete={markComplete}
        compact
        emptyMessage="Sin pendientes urgentes. Define fechas fin en proyectos o recordatorios en la agenda."
      />
    </div>
  )
}
