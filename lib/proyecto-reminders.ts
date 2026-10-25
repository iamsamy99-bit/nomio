import type { Proyecto, ProyectoRecordatorio } from '@/types'

export type { ProyectoRecordatorio }

export type ReminderUrgency = 'overdue' | 'today' | 'soon' | 'later'

const MS_DAY = 86400000

export function reminderUrgency(fecha: string, today = new Date()): ReminderUrgency {
  const t0 = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime()
  const d = new Date(fecha + 'T12:00:00').getTime()
  const diff = Math.round((d - t0) / MS_DAY)
  if (diff < 0) return 'overdue'
  if (diff === 0) return 'today'
  if (diff <= 7) return 'soon'
  return 'later'
}

export function urgencyLabel(u: ReminderUrgency): string {
  switch (u) {
    case 'overdue': return 'Vencido'
    case 'today': return 'Hoy'
    case 'soon': return 'Proximo'
    default: return 'Programado'
  }
}

/** Alertas automaticas por fecha_fin_estimada del proyecto (sin tabla extra). */
export function deadlinesFromProyectos(proyectos: Proyecto[], today = new Date()): {
  proyecto: Proyecto
  fecha: string
  urgency: ReminderUrgency
  titulo: string
}[] {
  const out: { proyecto: Proyecto; fecha: string; urgency: ReminderUrgency; titulo: string }[] = []
  for (const p of proyectos) {
    if (!p.activo || !p.fecha_fin_estimada) continue
    const u = reminderUrgency(p.fecha_fin_estimada, today)
    if (u === 'later') continue
    out.push({
      proyecto: p,
      fecha: p.fecha_fin_estimada,
      urgency: u,
      titulo: `Fin estimado: ${p.nombre}`,
    })
  }
  return out.sort((a, b) => a.fecha.localeCompare(b.fecha))
}

export function sortRecordatorios<T extends { fecha_recordatorio: string; completado: boolean }>(
  items: T[]
): T[] {
  return [...items].sort((a, b) => {
    if (a.completado !== b.completado) return a.completado ? 1 : -1
    return a.fecha_recordatorio.localeCompare(b.fecha_recordatorio)
  })
}
