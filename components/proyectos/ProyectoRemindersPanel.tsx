'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { Bell, Plus, Check, AlertCircle } from 'lucide-react'
import {
  deadlinesFromProyectos,
  reminderUrgency,
  sortRecordatorios,
  urgencyLabel,
  type ProyectoRecordatorio,
  type ReminderUrgency,
} from '@/lib/proyecto-reminders'
import type { Proyecto } from '@/types'

type Props = {
  proyectos: Proyecto[]
  recordatorios: ProyectoRecordatorio[]
  empresaId: string
  onReload: () => void
  supabase: ReturnType<typeof import('@/lib/supabase/client').createClient>
  compact?: boolean
}

function urgencyClass(u: ReminderUrgency): string {
  switch (u) {
    case 'overdue': return 'text-red-400 bg-red-500/10 border-red-500/25'
    case 'today': return 'text-amber-400 bg-amber-500/10 border-amber-500/25'
    case 'soon': return 'text-primary bg-primary/10 border-primary/25'
    default: return 'text-ink-soft bg-surface-2 border-border'
  }
}

export default function ProyectoRemindersPanel({
  proyectos,
  recordatorios,
  empresaId,
  onReload,
  supabase,
  compact = false,
}: Props) {
  const [showAdd, setShowAdd] = useState(false)
  const [titulo, setTitulo] = useState('')
  const [fecha, setFecha] = useState('')
  const [proyectoId, setProyectoId] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [tableMissing, setTableMissing] = useState(false)

  const autoDeadlines = useMemo(() => deadlinesFromProyectos(proyectos), [proyectos])
  const manual = useMemo(
    () => sortRecordatorios(recordatorios.filter((r) => !r.completado)),
    [recordatorios]
  )

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!titulo.trim() || !fecha) return
    setSaving(true)
    setError('')
    const { error: insErr } = await supabase.from('proyecto_recordatorios').insert({
      empresa_id: empresaId,
      proyecto_id: proyectoId || null,
      titulo: titulo.trim(),
      fecha_recordatorio: fecha,
      categoria: 'obra',
      completado: false,
    })
    setSaving(false)
    if (insErr) {
      if (insErr.message.includes('proyecto_recordatorios')) setTableMissing(true)
      else setError(insErr.message)
      return
    }
    setTitulo('')
    setFecha('')
    setProyectoId('')
    setShowAdd(false)
    onReload()
  }

  const markDone = async (id: string) => {
    await supabase.from('proyecto_recordatorios').update({ completado: true }).eq('id', id)
    onReload()
  }

  const totalAlerts = autoDeadlines.length + manual.length
  if (compact && totalAlerts === 0 && !showAdd) return null

  return (
    <div className={compact ? 'tile' : 'card mb-6'}>
      <div className="flex items-center justify-between gap-2 mb-3">
        <h2 className={`font-display font-semibold flex items-center gap-2 ${compact ? 'text-base' : 'text-lg'}`}>
          <Bell className="w-4 h-4 text-primary" />
          Recordatorios
          {totalAlerts > 0 && (
            <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-primary/15 text-primary">
              {totalAlerts}
            </span>
          )}
        </h2>
        <div className="flex items-center gap-2">
          <Link href="/dashboard/recordatorios" className="text-xs text-primary hover:underline">Agenda</Link>
          {!tableMissing && (
            <button type="button" onClick={() => setShowAdd(!showAdd)} className="btn-secondary text-xs py-1 flex items-center gap-1">
              <Plus className="w-3.5 h-3.5" /> Nuevo
            </button>
          )}
        </div>
      </div>

      {tableMissing && (
        <p className="text-xs text-ink-soft">
          Ejecuta la migracion SQL para habilitar recordatorios personalizados. Las alertas por fecha fin del proyecto siguen activas abajo.
        </p>
      )}

      {error && (
        <p className="text-xs text-red-400 mb-2 flex items-center gap-1">
          <AlertCircle className="w-3.5 h-3.5" /> {error}
        </p>
      )}

      {showAdd && !tableMissing && (
        <form onSubmit={handleAdd} className="mb-4 p-3 rounded-xl bg-surface-2 border border-border space-y-2">
          <input value={titulo} onChange={(e) => setTitulo(e.target.value)} className="input text-sm" placeholder="Titulo del recordatorio" required maxLength={120} />
          <input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} className="input text-sm" required />
          <select value={proyectoId} onChange={(e) => setProyectoId(e.target.value)} className="input text-sm">
            <option value="">Sin proyecto</option>
            {proyectos.filter((p) => p.activo).map((p) => (
              <option key={p.id} value={p.id}>{p.nombre}</option>
            ))}
          </select>
          <button type="submit" disabled={saving} className="btn-primary text-xs w-full">{saving ? 'Guardando...' : 'Guardar'}</button>
        </form>
      )}

      <ul className="space-y-2">
        {autoDeadlines.map((d) => (
          <li key={`auto-${d.proyecto.id}`} className={`flex items-center justify-between gap-2 text-sm px-3 py-2 rounded-lg border ${urgencyClass(d.urgency)}`}>
            <span>{d.titulo}</span>
            <span className="text-xs shrink-0">{d.fecha} · {urgencyLabel(d.urgency)}</span>
          </li>
        ))}
        {manual.map((r) => {
          const u = reminderUrgency(r.fecha_recordatorio)
          return (
            <li key={r.id} className={`flex items-center justify-between gap-2 text-sm px-3 py-2 rounded-lg border ${urgencyClass(u)}`}>
              <div>
                <span className="font-medium">{r.titulo}</span>
                {r.proyectos?.nombre && <span className="text-xs text-ink-soft block">{r.proyectos.nombre}</span>}
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className="text-xs">{r.fecha_recordatorio}</span>
                <button type="button" onClick={() => markDone(r.id)} className="p-1 rounded hover:bg-surface-3" title="Marcar hecho" aria-label="Completar">
                  <Check className="w-4 h-4" />
                </button>
              </div>
            </li>
          )
        })}
      </ul>

      {totalAlerts === 0 && !showAdd && (
        <p className="text-sm text-ink-soft">Sin recordatorios proximos. Agrega fecha fin estimada en cada proyecto.</p>
      )}
    </div>
  )
}
