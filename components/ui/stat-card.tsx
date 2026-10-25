'use client'

import { ReactNode } from 'react'
import { TrendingUp, TrendingDown } from 'lucide-react'

interface StatCardProps {
  label: string
  value: string | number
  icon?: ReactNode
  trend?: string
  trendUp?: boolean
  description?: string
  className?: string
  iconColor?: 'cyan' | 'blue' | 'green' | 'purple'
  mono?: boolean
}

const iconThemes: Record<NonNullable<StatCardProps['iconColor']>, { bg: string; text: string; border: string; accent: string }> = {
  cyan:   { bg: 'rgba(58,78,46,0.10)',    text: '#3A4E2E', border: 'rgba(58,78,46,0.20)',    accent: '#3A4E2E' },  // bosque
  blue:   { bg: 'rgba(45,70,81,0.12)',    text: '#5A7480', border: 'rgba(45,70,81,0.22)',    accent: '#2D4651' },  // petroleo
  green:  { bg: 'rgba(111,138,79,0.10)',  text: '#6F8A4F', border: 'rgba(111,138,79,0.20)', accent: '#6F8A4F' },  // verde-ok
  purple: { bg: 'rgba(199,122,82,0.10)',  text: '#C77A52', border: 'rgba(199,122,82,0.20)', accent: '#C77A52' },  // terracota
}

export function StatCard({
  label,
  value,
  icon,
  trend,
  trendUp,
  description,
  className = '',
  iconColor = 'cyan',
  mono = false,
}: StatCardProps) {
  const theme = iconThemes[iconColor]

  return (
    <div
      className={['group relative rounded-2xl overflow-hidden transition-all duration-200 cursor-default', className].join(' ')}
      style={{
        background: 'var(--glass-bg)',
        border: `1px solid var(--glass-border)`,
        borderLeft: `3px solid ${theme.accent}`,
        boxShadow: 'var(--glass-shadow)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
      }}
    >
      {/* Subtle glow on hover */}
      <div
        className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
        style={{ background: `radial-gradient(ellipse at top left, ${theme.bg} 0%, transparent 70%)` }}
      />

      <div className="relative p-5">
        {/* Label + Icon row */}
        <div className="flex items-start justify-between gap-3 mb-3">
          <p
            className="text-[11px] font-semibold uppercase tracking-[0.12em] leading-tight"
            style={{ color: 'var(--text-muted)', fontFamily: "'Space Grotesk', sans-serif" }}
          >
            {label}
          </p>
          {icon && (
            <div
              className="shrink-0 w-9 h-9 rounded-xl flex items-center justify-center transition-transform duration-200 group-hover:scale-110"
              style={{ background: theme.bg, border: `1px solid ${theme.border}`, color: theme.text }}
            >
              {icon}
            </div>
          )}
        </div>

        {/* Value */}
        <p
          className="text-[1.65rem] font-bold leading-none tracking-tight break-all"
          style={{
            color: 'var(--text)',
            fontFamily: mono ? "'IBM Plex Mono', monospace" : "'Space Grotesk', sans-serif",
          }}
        >
          {value}
        </p>

        {/* Description */}
        {description && (
          <p className="text-xs mt-1.5 truncate" style={{ color: 'var(--text-muted)' }}>
            {description}
          </p>
        )}

        {/* Trend badge */}
        {trend && (
          <div className="mt-3 flex items-center gap-1.5">
            <span
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold"
              style={{
                background: trendUp ? 'rgba(34,197,94,0.10)' : 'rgba(239,68,68,0.10)',
                color: trendUp ? '#166534' : '#B91C1C',
                border: `1px solid ${trendUp ? 'rgba(34,197,94,0.25)' : 'rgba(239,68,68,0.25)'}`,
              }}
            >
              {trendUp
                ? <TrendingUp size={10} strokeWidth={2.5} />
                : <TrendingDown size={10} strokeWidth={2.5} />
              }
              {trend}
            </span>
          </div>
        )}
      </div>
    </div>
  )
}

export default StatCard
