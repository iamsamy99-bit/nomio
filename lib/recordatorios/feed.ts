import {
  deadlinesFromProyectos,
  reminderUrgency,
  sortRecordatorios,
  type ReminderUrgency,
} from '@/lib/proyecto-reminders'
import type { Cliente, Cotizacion, Proyecto, ProyectoRecordatorio } from '@/types'

export type ReminderKind =
  | 'proyecto_fin'
  | 'manual'
  | 'cotizacion_vence'
  | 'seguimiento_contacto'

export interface ReminderFeedItem {
  id: string
  kind: ReminderKind
  titulo: string
  subtitulo?: string
  fecha: string
  urgency: ReminderUrgency
  href?: string
  recordatorioId?: string
  auto?: boolean
  categoria?: string
}

const MS_DAY = 86400000
const DIAS_SEGUIMIENTO = 14

function daysSince(iso: string | null | undefined, today: Date): number | null {
  if (!iso) return null
  const t0 = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime()
  const d = new Date(iso.slice(0, 10) + 'T12:00:00').getTime()
  return Math.round((t0 - d) / MS_DAY)
}

export function recordatoriosFromManual(rows: ProyectoRecordatorio[]): ReminderFeedItem[] {
  return sortRecordatorios(rows.filter((r) => !r.completado)).map((r) => ({
    id: `manual-${r.id}`,
    kind: 'manual' as const,
    titulo: r.titulo,
    subtitulo: r.proyectos?.nombre || r.clientes?.nombre || undefined,
    fecha: r.fecha_recordatorio,
    urgency: reminderUrgency(r.fecha_recordatorio),
    href: r.proyecto_id
      ? `/dashboard/proyectos/${r.proyecto_id}`
      : r.cliente_id
        ? `/dashboard/contactos/${r.cliente_id}`
        : r.cotizacion_id
          ? `/dashboard/cotizaciones/${r.cotizacion_id}`
          : '/dashboard/recordatorios',
    recordatorioId: r.id,
    categoria: r.categoria || 'obra',
  }))
}

export function recordatoriosFromProyectos(proyectos: Proyecto[]): ReminderFeedItem[] {
  return deadlinesFromProyectos(proyectos).map((d) => ({
    id: `fin-${d.proyecto.id}`,
    kind: 'proyecto_fin' as const,
    titulo: d.titulo,
    subtitulo: d.proyecto.encargado ? `Encargado: ${d.proyecto.encargado}` : undefined,
    fecha: d.fecha,
    urgency: d.urgency,
    href: `/dashboard/proyectos`,
    auto: true,
    categoria: 'obra',
  }))
}

export function recordatoriosFromCotizaciones(cotizaciones: Cotizacion[], today = new Date()): ReminderFeedItem[] {
  const out: ReminderFeedItem[] = []
  for (const c of cotizaciones) {
    if (!c.fecha_validez) continue
    if (!['borrador', 'enviada'].includes(c.estado)) continue
    const u = reminderUrgency(c.fecha_validez, today)
    if (u === 'later') continue
    const num = String(c.numero_cotizacion).padStart(4, '0')
    out.push({
      id: `cot-${c.id}`,
      kind: 'cotizacion_vence',
      titulo: `Vence cotizacion #COT-${num}`,
      subtitulo: `${c.titulo} · ${c.cliente_nombre}`,
      fecha: c.fecha_validez,
      urgency: u,
      href: `/dashboard/cotizaciones/${c.id}`,
      auto: true,
      categoria: 'cotizacion',
    })
  }
  return out.sort((a, b) => a.fecha.localeCompare(b.fecha))
}

export function recordatoriosSeguimientoContactos(clientes: Cliente[], today = new Date()): ReminderFeedItem[] {
  const out: ReminderFeedItem[] = []
  for (const c of clientes) {
    if (!c.activo || c.tipo !== 'cliente') continue
    const dias = daysSince(c.ultimo_contacto_at, today)
    if (dias !== null && dias < DIAS_SEGUIMIENTO) continue
    const fecha = today.toISOString().slice(0, 10)
    out.push({
      id: `seg-${c.id}`,
      kind: 'seguimiento_contacto',
      titulo: `Dar seguimiento: ${c.nombre}`,
      subtitulo: dias === null ? 'Sin contacto registrado' : `Ultimo contacto hace ${dias} dias`,
      fecha,
      urgency: dias === null || dias > 30 ? 'today' : 'soon',
      href: `/dashboard/contactos/${c.id}`,
      auto: true,
      categoria: 'contacto',
    })
  }
  return out.slice(0, 8)
}

export function buildReminderFeed(input: {
  proyectos: Proyecto[]
  recordatorios: ProyectoRecordatorio[]
  cotizaciones?: Cotizacion[]
  clientes?: Cliente[]
  includeSeguimiento?: boolean
}): ReminderFeedItem[] {
  const items = [
    ...recordatoriosFromProyectos(input.proyectos),
    ...recordatoriosFromManual(input.recordatorios),
    ...recordatoriosFromCotizaciones(input.cotizaciones || []),
    ...(input.includeSeguimiento !== false
      ? recordatoriosSeguimientoContactos(input.clientes || [])
      : []),
  ]
  const order: Record<ReminderUrgency, number> = { overdue: 0, today: 1, soon: 2, later: 3 }
  return items
    .filter((i) => i.urgency !== 'later')
    .sort((a, b) => order[a.urgency] - order[b.urgency] || a.fecha.localeCompare(b.fecha))
}

export function kindLabel(kind: ReminderKind): string {
  switch (kind) {
    case 'proyecto_fin': return 'Obra'
    case 'manual': return 'Recordatorio'
    case 'cotizacion_vence': return 'Cotizacion'
    case 'seguimiento_contacto': return 'CRM'
    default: return 'Aviso'
  }
}
