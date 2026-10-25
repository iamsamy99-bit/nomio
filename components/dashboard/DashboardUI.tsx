'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  Users, FolderOpen, DollarSign, AlertCircle, FileText,
  Plus, FilePlus, Clock, Receipt, UserPlus, ArrowUpRight,
  ClipboardList, Calendar, TrendingUp, ChevronRight,
  Wallet, Activity, CheckCircle2, Circle,
} from 'lucide-react'
import { GlassCard } from '@/components/ui/glass-card'
import { StatCard } from '@/components/ui/stat-card'
import { FadeInUp, StaggerChildren, StaggerItem } from '@/components/landing/fade-in-up'
import { formatMXN, formatDate, padNomina } from '@/lib/utils'
import PwaInstallBanner from '@/components/PwaInstallBanner'
import RemindersHomeWidget from '@/components/recordatorios/RemindersHomeWidget'
import NominasChart from '@/components/NominasChart'

/* ── Types ─────────────────────────────────────────────── */

interface Nomina {
  id: string
  numero_nomina: number
  estado: string
  fecha_inicio: string
  fecha_fin: string
  total_nomina: number
  proyectos: { nombre: string } | null
}

interface Proyecto {
  id: string
  nombre: string
  color_etiqueta: string | null
  trabajadores_count?: number
}

interface Anticipo {
  id: string
  monto: number
  estado: string
  trabajadores: { nombre: string } | null
}

interface NominaGrafica {
  total_nomina: number
  fecha_inicio: string
  fecha_fin: string
  estado: string
}

interface Props {
  userName: string
  rol: string
  totalTrab: number
  totalProyectos: number
  totalMes: number
  totalMesPrevio?: number
  anticiposPendientesCount: number
  nominasRecientes: Nomina[]
  nominasGrafica: NominaGrafica[]
  proyectosActivos: Proyecto[]
  anticiposPendientes: Anticipo[]
}

/* ── Helpers ────────────────────────────────────────────── */

function estadoLabel(e: string) {
  if (e === 'pagada')   return 'Pagada'
  if (e === 'generada') return 'Generada'
  return 'En progreso'
}

function EstadoBadge({ estado }: { estado: string }) {
  const styles =
    estado === 'pagada'
      ? { bg: 'rgba(111,138,79,0.10)', text: '#6F8A4F', border: 'rgba(111,138,79,0.22)' }
      : estado === 'generada'
      ? { bg: 'rgba(45,70,81,0.10)', text: '#5A7480', border: 'rgba(45,70,81,0.22)' }
      : { bg: 'rgba(217,164,65,0.10)', text: '#B8893A', border: 'rgba(217,164,65,0.25)' }

  return (
    <span
      className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wide"
      style={{ background: styles.bg, color: styles.text, border: `1px solid ${styles.border}` }}
    >
      <span className="w-1.5 h-1.5 rounded-full bg-current mr-1.5" />
      {estadoLabel(estado)}
    </span>
  )
}

function ProjectDot({ color }: { color: string | null }) {
  return (
    <span
      className="w-2.5 h-2.5 rounded-full shrink-0 shadow-sm"
      style={{ background: color || '#556B45', boxShadow: `0 0 6px ${color || '#556B45'}50` }}
    />
  )
}

/* ── Section header ─────────────────────────────────────── */
function SectionHeader({
  icon: Icon,
  title,
  href,
  linkLabel = 'Ver todos',
  color = 'var(--primary)',
}: {
  icon: React.ComponentType<{ size?: number; className?: string }>
  title: string
  href: string
  linkLabel?: string
  color?: string
}) {
  return (
    <div className="flex items-center justify-between mb-4">
      <div className="flex items-center gap-2">
        <div
          className="w-7 h-7 rounded-lg flex items-center justify-center"
          style={{ background: 'rgba(58,78,46,0.08)', border: '1px solid rgba(58,78,46,0.15)' }}
        >
          <Icon size={14} className="text-[var(--primary)]" />
        </div>
        <h2
          className="font-semibold text-sm"
          style={{ color: 'var(--text)', fontFamily: "'Space Grotesk', sans-serif" }}
        >
          {title}
        </h2>
      </div>
      <Link
        href={href}
        className="flex items-center gap-1 text-xs font-semibold transition-all duration-200 hover:gap-1.5"
        style={{ color }}
        aria-label={`${linkLabel} — ${title}`}
      >
        {linkLabel}
        <ChevronRight size={13} />
      </Link>
    </div>
  )
}

/* ── Date + greeting helpers ─────────────────────────────── */
function todayLabel(): string {
  return new Date().toLocaleDateString('es-MX', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

function getGreeting(): string {
  const h = new Date().getHours()
  if (h < 12) return 'Buenos días'
  if (h < 19) return 'Buenas tardes'
  return 'Buenas noches'
}

/* ── Main component ─────────────────────────────────────── */

export default function DashboardUI({
  userName,
  rol,
  totalTrab,
  totalProyectos,
  totalMes,
  totalMesPrevio = 0,
  anticiposPendientesCount,
  nominasRecientes,
  nominasGrafica,
  proyectosActivos,
  anticiposPendientes,
}: Props) {
  const firstName = userName?.split(' ')[0] ?? 'equipo'
  // Month-over-month delta for the "Nómina del mes" card; null when there is no
  // previous-month data to compare against.
  const deltaMes = totalMesPrevio > 0
    ? Math.round(((totalMes - totalMesPrevio) / totalMesPrevio) * 100)
    : null
  const totalPagado = nominasGrafica.filter(n => n.estado === 'pagada').reduce((s, n) => s + (n.total_nomina || 0), 0)

  const isOwnerOrAdmin = rol === 'owner' || rol === 'admin'
  const isOperador = rol === 'operador'
  const isCapatazRole = rol === 'capataz'
  const router = useRouter()
  const [notifPerm, setNotifPerm] = useState<string>('default')

  useEffect(() => {
    if (isCapatazRole) router.replace('/dashboard/asistencias')
  }, [isCapatazRole, router])

  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      setNotifPerm(Notification.permission)
    } else {
      setNotifPerm('unsupported')
    }
  }, [])

  if (isCapatazRole) {
    return (
      <div className="max-w-6xl mx-auto flex flex-col items-center justify-center min-h-[40vh] gap-4">
        <p className="text-sm" style={{ color: 'var(--tinta-500)' }}>
          Redirigiendo a Asistencias...
        </p>
        <Link href="/dashboard/asistencias" className="btn-primary text-sm">
          Ir a Asistencias
        </Link>
      </div>
    )
  }

  // For operador: only show trabajadores + proyectos KPI cards (hide nomina del mes + anticipos)
  const allStatCards = [
    {
      label: 'Trabajadores activos',
      value: String(totalTrab),
      icon: <Users size={16} />,
      iconColor: 'cyan' as const,
      href: '/dashboard/trabajadores',
      description: 'En todos los proyectos',
      roles: ['owner', 'admin', 'operador'],
    },
    {
      label: 'Proyectos activos',
      value: String(totalProyectos),
      icon: <FolderOpen size={16} />,
      iconColor: 'blue' as const,
      href: '/dashboard/proyectos',
      description: 'Obra en curso',
      roles: ['owner', 'admin', 'operador'],
    },
    {
      label: 'Nómina del mes',
      value: formatMXN(totalMes),
      icon: <DollarSign size={16} />,
      iconColor: 'green' as const,
      href: '/dashboard/nomina',
      mono: true,
      description: deltaMes === null
        ? 'Total acumulado'
        : `${deltaMes >= 0 ? '+' : ''}${deltaMes}% vs mes anterior`,
      roles: ['owner', 'admin'],
    },
    {
      label: 'Anticipos pendientes',
      value: String(anticiposPendientesCount),
      icon: <AlertCircle size={16} />,
      iconColor: 'purple' as const,
      href: '/dashboard/anticipos',
      description: anticiposPendientesCount > 0 ? 'Requieren atención' : 'Sin pendientes',
      roles: ['owner', 'admin'],
    },
  ]
  const statCards = allStatCards.filter(s => s.roles.includes(rol))

  const allQuickActions = [
    {
      label: 'Nueva Nómina',
      description: 'Calcula sueldos del periodo',
      icon: FilePlus,
      color: '#06B6D4',
      href: '/dashboard/nomina/nueva/wizard',
      roles: ['owner', 'admin'],
    },
    {
      label: 'Asistencias',
      description: 'Registra entradas y salidas',
      icon: Clock,
      color: '#3B82F6',
      href: '/dashboard/asistencias',
      roles: ['owner', 'admin', 'operador'],
    },
    {
      label: 'Cotización',
      description: 'Genera presupuesto al cliente',
      icon: Receipt,
      color: '#22C55E',
      href: '/dashboard/cotizaciones/nueva',
      roles: ['owner', 'admin', 'operador'],
    },
    {
      label: 'Trabajador',
      description: 'Agrega al equipo de obra',
      icon: UserPlus,
      color: '#818CF8',
      href: '/dashboard/trabajadores',
      roles: ['owner', 'admin', 'operador'],
    },
  ]
  const quickActions = allQuickActions.filter(a => a.roles.includes(rol))

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-12">

      {/* PWA install prompt */}
      <PwaInstallBanner />

      {/* ── Header ─────────────────────────────────────────── */}
      <FadeInUp>
        <div className="flex items-start justify-between flex-wrap gap-4 pt-1">
          <div>
            <p
              className="text-xs font-semibold uppercase tracking-[0.16em] mb-1.5"
              style={{ color: 'var(--text-muted)', fontFamily: "'Space Grotesk', sans-serif" }}
            >
              <Calendar size={11} className="inline mr-1.5 -mt-0.5" />
              {todayLabel()}
            </p>
            <h1
              className="text-2xl sm:text-3xl font-bold leading-tight"
              style={{ fontFamily: "'Space Grotesk', sans-serif" }}
            >
              <span style={{ color: 'var(--text)' }}>{getGreeting()}, </span>
              <span className="gradient-text">{firstName}</span>
            </h1>
            <p
              className="text-sm mt-1"
              style={{ color: 'var(--text-muted)', fontFamily: "'DM Sans', sans-serif" }}
            >
              Resumen de tu empresa constructora
            </p>
          </div>
          {isOwnerOrAdmin && (
            <Link
              href="/dashboard/nomina/nueva/wizard"
              className="btn-primary flex items-center gap-2 shrink-0 text-sm"
            >
              <Plus size={15} />
              Nueva Nomina
            </Link>
          )}
        </div>
      </FadeInUp>

      {/* ── Stat cards ─────────────────────────────────────── */}
      <StaggerChildren
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4"
        stagger={0.07}
      >
        {statCards.map((s) => (
          <StaggerItem key={s.label}>
            <Link href={s.href} className="block group cursor-pointer">
              <StatCard
                label={s.label}
                value={s.value}
                icon={s.icon}
                iconColor={s.iconColor}
                description={s.description}
                mono={s.mono}
                className="h-full group-hover:-translate-y-0.5"
              />
            </Link>
          </StaggerItem>
        ))}
      </StaggerChildren>

      {/* ── Onboarding checklist (only for new accounts) ────── */}
      {(totalProyectos === 0 || totalTrab === 0 || nominasRecientes.length === 0 || notifPerm === 'default') && (() => {
        const notifDone = notifPerm === 'granted'
        const notifHidden = notifPerm === 'unsupported' || notifPerm === 'denied'
        const steps: { done: boolean; label: string; sub: string; href?: string; onClick?: () => void }[] = [
          { done: totalProyectos > 0, label: 'Crea tu primer proyecto', href: '/dashboard/proyectos', sub: 'Organiza tu obra con nombre, encargado y fechas' },
          { done: totalTrab > 0,      label: 'Agrega tu primer trabajador', href: '/dashboard/trabajadores', sub: 'Define modalidad de pago y tarifa diaria o por hora' },
          { done: nominasRecientes.length > 0, label: 'Genera tu primera nomina', href: '/dashboard/nomina/nueva/wizard', sub: 'Registra asistencias y calcula sueldos del periodo' },
          ...(!notifHidden ? [{ done: notifDone, label: 'Activa notificaciones', sub: 'Recibe alertas de recordatorios y vencimientos', onClick: async () => {
            if (notifDone) return
            const p = await Notification.requestPermission()
            setNotifPerm(p)
          }}] : []),
        ]
        const completed = steps.filter(s => s.done).length
        return (
          <FadeInUp delay={0.10}>
            <div className="rounded-2xl border p-4 sm:p-5" style={{ background: 'rgba(27,108,168,0.04)', borderColor: 'rgba(27,108,168,0.18)' }}>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-sm font-semibold" style={{ color: 'var(--primary)' }}>Primeros pasos</p>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--tinta-500)' }}>{completed} de {steps.length} completados</p>
                </div>
                <div className="flex gap-1">
                  {steps.map((s, i) => (
                    <div key={i} className="w-8 h-1.5 rounded-full" style={{ background: s.done ? 'var(--primary)' : 'var(--border)' }} />
                  ))}
                </div>
              </div>
              <div className="space-y-2">
                {steps.map((step, i) => {
                  const inner = (
                    <>
                      {step.done
                        ? <CheckCircle2 className="w-5 h-5 shrink-0" style={{ color: 'var(--verde-ok)' }} />
                        : <Circle className="w-5 h-5 shrink-0" style={{ color: 'var(--border)' }} />
                      }
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium" style={{ color: step.done ? 'var(--tinta-500)' : 'var(--tinta)', textDecoration: step.done ? 'line-through' : 'none' }}>{step.label}</p>
                        {!step.done && <p className="text-xs mt-0.5" style={{ color: 'var(--tinta-500)' }}>{step.sub}</p>}
                      </div>
                      {!step.done && <ChevronRight className="w-4 h-4 shrink-0" style={{ color: 'var(--tinta-500)' }} />}
                    </>
                  )
                  const cls = "flex items-center gap-3 p-3 rounded-xl transition-colors w-full text-left"
                  const sty = { background: step.done ? 'transparent' : 'var(--surface)', border: `1px solid ${step.done ? 'transparent' : 'var(--border)'}`, cursor: step.done ? 'default' : 'pointer' }
                  return step.onClick
                    ? <button key={i} type="button" onClick={step.onClick} className={cls} style={sty}>{inner}</button>
                    : <Link key={i} href={step.done ? '#' : (step.href ?? '#')} className={cls} style={sty}>{inner}</Link>
                })}
              </div>
            </div>
          </FadeInUp>
        )
      })()}

      {/* ── Reminders widget ───────────────────────────────── */}
      <FadeInUp delay={0.12}>
        <RemindersHomeWidget />
      </FadeInUp>

      {/* ── Main 2-column layout ───────────────────────────── */}
      <FadeInUp delay={0.18}>
        <div className="grid lg:grid-cols-3 gap-5">

          {/* LEFT: Nominas recientes (2/3) */}
          <div className="lg:col-span-2">
            <GlassCard padding="md" className="h-full" accentBorder="var(--primary)">
              <SectionHeader
                icon={FileText}
                title="Nominas recientes"
                href="/dashboard/nomina"
              />

              {!nominasRecientes.length ? (
                <div className="flex flex-col items-center justify-center py-14 text-center">
                  <div
                    className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4"
                    style={{
                      background: 'rgba(6,182,212,0.08)',
                      border: '1px solid rgba(6,182,212,0.15)',
                    }}
                  >
                    <ClipboardList size={22} style={{ color: 'var(--text-muted)' }} />
                  </div>
                  <p className="text-sm font-semibold mb-1" style={{ color: 'var(--text)' }}>
                    Sin nominas aun
                  </p>
                  <p className="text-xs mb-5" style={{ color: 'var(--text-muted)' }}>
                    Registra asistencias y genera tu primera nomina
                  </p>
                  <Link href="/dashboard/nomina/nueva/wizard" className="btn-primary text-sm">
                    Crear nomina
                  </Link>
                </div>
              ) : (
                <div className="space-y-1">
                  {/* Table header */}
                  <div
                    className="grid grid-cols-12 gap-2 px-3 pb-2 mb-1"
                    style={{ borderBottom: '1px solid var(--divider)' }}
                  >
                    <p className="col-span-5 text-[10px] font-bold uppercase tracking-[0.14em]" style={{ color: 'var(--text-muted)' }}>
                      Proyecto / Periodo
                    </p>
                    <p className="col-span-3 text-[10px] font-bold uppercase tracking-[0.14em]" style={{ color: 'var(--text-muted)' }}>
                      Estado
                    </p>
                    <p className="col-span-4 text-[10px] font-bold uppercase tracking-[0.14em] text-right" style={{ color: 'var(--text-muted)' }}>
                      Total
                    </p>
                  </div>

                  {nominasRecientes.map((n) => (
                    <Link
                      key={n.id}
                      href={`/dashboard/nomina/${n.id}`}
                      className="group grid grid-cols-12 gap-2 items-center p-3 -mx-1 rounded-xl transition-all duration-150 hover:bg-[var(--table-hover)] cursor-pointer"
                    >
                      {/* Project + dates */}
                      <div className="col-span-5 min-w-0">
                        <div className="flex items-center gap-1.5 mb-0.5">
                          <span
                            className="text-[10px] font-bold tabular-nums"
                            style={{
                              color: 'var(--primary)',
                              fontFamily: "'IBM Plex Mono', monospace",
                            }}
                          >
                            {padNomina(n.numero_nomina)}
                          </span>
                        </div>
                        <p
                          className="text-sm font-semibold truncate"
                          style={{ color: 'var(--text)' }}
                        >
                          {n.proyectos?.nombre ?? 'Sin proyecto'}
                        </p>
                        <p className="text-[10px] mt-0.5" style={{ color: 'var(--text-muted)' }}>
                          {formatDate(n.fecha_inicio)} — {formatDate(n.fecha_fin)}
                        </p>
                      </div>

                      {/* Estado */}
                      <div className="col-span-3">
                        <EstadoBadge estado={n.estado} />
                      </div>

                      {/* Amount */}
                      <div className="col-span-4 flex items-center justify-end gap-2">
                        <span
                          className="text-sm font-bold tabular-nums"
                          style={{
                            color: 'var(--accent)',
                            fontFamily: "'IBM Plex Mono', monospace",
                          }}
                        >
                          {formatMXN(n.total_nomina)}
                        </span>
                        <ArrowUpRight
                          size={13}
                          className="opacity-0 group-hover:opacity-50 transition-opacity shrink-0"
                          style={{ color: 'var(--text-muted)' }}
                        />
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </GlassCard>
          </div>

          {/* RIGHT: Proyectos + Anticipos (1/3) */}
          <div className="flex flex-col gap-4">

            {/* Proyectos activos */}
            <GlassCard padding="md" accentBorder="#3B82F6">
              <SectionHeader
                icon={FolderOpen}
                title="Proyectos activos"
                href="/dashboard/proyectos"
                linkLabel="Ver"
                color="#3B82F6"
              />

              {!proyectosActivos.length ? (
                <div className="py-6 flex flex-col items-center text-center gap-2">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center"
                    style={{ background: 'rgba(59,130,246,0.08)', border: '1px solid rgba(59,130,246,0.15)' }}
                  >
                    <FolderOpen size={16} style={{ color: '#3B82F6' }} />
                  </div>
                  <p className="text-xs" style={{ color: 'var(--text-muted)' }}>No hay proyectos activos</p>
                </div>
              ) : (
                <div className="space-y-1">
                  {proyectosActivos.slice(0, 5).map((p) => (
                    <Link
                      key={p.id}
                      href={`/dashboard/proyectos/${p.id}`}
                      className="flex items-center gap-2.5 p-2.5 -mx-1 rounded-xl hover:bg-[var(--table-hover)] transition-colors duration-150 group cursor-pointer"
                    >
                      <ProjectDot color={p.color_etiqueta} />
                      <span
                        className="text-sm truncate flex-1 font-medium"
                        style={{ color: 'var(--text)' }}
                      >
                        {p.nombre}
                      </span>
                      {typeof p.trabajadores_count === 'number' && (
                        <span
                          className="text-[10px] font-semibold tabular-nums shrink-0"
                          style={{ color: 'var(--text-muted)', fontFamily: "'IBM Plex Mono', monospace" }}
                        >
                          {p.trabajadores_count}
                        </span>
                      )}
                      <ArrowUpRight
                        size={12}
                        className="opacity-0 group-hover:opacity-40 transition-opacity shrink-0"
                        style={{ color: 'var(--text-muted)' }}
                      />
                    </Link>
                  ))}
                </div>
              )}
            </GlassCard>

            {/* Anticipos pendientes — hidden for operador */}
            {isOwnerOrAdmin && <GlassCard
              padding="md"
              accentBorder={anticiposPendientes.length > 0 ? '#F59E0B' : 'var(--glass-border)'}
            >
              <SectionHeader
                icon={anticiposPendientes.length > 0 ? AlertCircle : Wallet}
                title="Anticipos pendientes"
                href="/dashboard/anticipos"
                linkLabel="Gestionar"
                color={anticiposPendientes.length > 0 ? '#F59E0B' : 'var(--primary)'}
              />

              {!anticiposPendientes.length ? (
                <div className="py-6 flex flex-col items-center text-center gap-2">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center"
                    style={{ background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.15)' }}
                  >
                    <Activity size={16} style={{ color: '#22C55E' }} />
                  </div>
                  <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                    Sin anticipos pendientes
                  </p>
                </div>
              ) : (
                <div className="space-y-1">
                  {anticiposPendientes.slice(0, 5).map((a) => (
                    <Link
                      key={a.id}
                      href="/dashboard/anticipos"
                      className="flex items-center justify-between p-2.5 -mx-1 rounded-xl hover:bg-[var(--table-hover)] transition-colors duration-150 cursor-pointer group"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <div
                          className="w-6 h-6 rounded-full flex items-center justify-center shrink-0 text-[10px] font-bold"
                          style={{ background: 'rgba(245,158,11,0.12)', color: '#F59E0B' }}
                        >
                          {(a.trabajadores?.nombre ?? 'T')[0].toUpperCase()}
                        </div>
                        <span
                          className="text-sm truncate"
                          style={{ color: 'var(--text)' }}
                        >
                          {a.trabajadores?.nombre ?? 'Trabajador'}
                        </span>
                      </div>
                      <span
                        className="text-xs font-bold shrink-0 ml-2 tabular-nums"
                        style={{
                          color: '#F59E0B',
                          fontFamily: "'IBM Plex Mono', monospace",
                        }}
                      >
                        {formatMXN(a.monto)}
                      </span>
                    </Link>
                  ))}
                </div>
              )}
            </GlassCard>}
          </div>
        </div>
      </FadeInUp>

      {/* ── Gráfica nóminas por mes — hidden for operador ─────── */}
      {isOwnerOrAdmin && nominasGrafica.length > 0 && (
        <FadeInUp delay={0.24}>
          <NominasChart data={nominasGrafica} totalPagado={totalPagado} />
        </FadeInUp>
      )}

      {/* ── Quick actions ───────────────────────────────────── */}
      <FadeInUp delay={0.28}>
        <div>
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp size={14} style={{ color: 'var(--text-muted)' }} />
            <p
              className="text-xs font-bold uppercase tracking-[0.14em]"
              style={{ color: 'var(--text-muted)', fontFamily: "'Space Grotesk', sans-serif" }}
            >
              Acciones rapidas
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {quickActions.map((a) => {
              const Icon = a.icon
              return (
                <Link
                  key={a.label}
                  href={a.href}
                  className="group relative rounded-2xl p-5 flex flex-col gap-3 cursor-pointer transition-all duration-200 text-left overflow-hidden"
                  style={{
                    background: 'var(--glass-bg)',
                    border: '1px solid var(--glass-border)',
                    boxShadow: 'var(--glass-shadow)',
                    backdropFilter: 'blur(16px)',
                  }}
                  aria-label={a.label}
                >
                  {/* Hover glow */}
                  <div
                    className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
                    style={{ background: `radial-gradient(ellipse at top left, ${a.color}18 0%, transparent 70%)` }}
                  />

                  <div
                    className="relative w-10 h-10 rounded-xl flex items-center justify-center transition-transform duration-200 group-hover:scale-110"
                    style={{
                      background: `${a.color}18`,
                      border: `1px solid ${a.color}30`,
                    }}
                  >
                    <Icon size={18} style={{ color: a.color }} />
                  </div>

                  <div className="relative">
                    <p
                      className="text-sm font-bold leading-tight"
                      style={{ color: 'var(--text)', fontFamily: "'Space Grotesk', sans-serif" }}
                    >
                      {a.label}
                    </p>
                    <p
                      className="text-[11px] mt-0.5 leading-snug"
                      style={{ color: 'var(--text-muted)' }}
                    >
                      {a.description}
                    </p>
                  </div>

                  <ArrowUpRight
                    size={14}
                    className="absolute bottom-4 right-4 opacity-0 group-hover:opacity-40 transition-opacity"
                    style={{ color: a.color }}
                  />
                </Link>
              )
            })}
          </div>
        </div>
      </FadeInUp>
    </div>
  )
}
