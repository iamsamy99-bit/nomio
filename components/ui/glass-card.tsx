import { ReactNode } from 'react'

interface GlassCardProps {
  children: ReactNode
  className?: string
  glowColor?: 'cyan' | 'blue' | 'green' | 'purple'
  noBorder?: boolean
  padding?: 'none' | 'sm' | 'md' | 'lg'
  hover?: boolean
  /** Optional left accent border color (CSS color string) */
  accentBorder?: string
}

const glowMap: Record<NonNullable<GlassCardProps['glowColor']>, string> = {
  cyan:   'rgba(58,78,46,0.15)',    // bosque
  blue:   'rgba(45,70,81,0.15)',    // petroleo
  green:  'rgba(111,138,79,0.15)', // verde-ok
  purple: 'rgba(199,122,82,0.15)', // terracota
}

const paddingStyles: Record<NonNullable<GlassCardProps['padding']>, string> = {
  none: '',
  sm:   'p-3',
  md:   'p-5',
  lg:   'p-7',
}

export function GlassCard({
  children,
  className = '',
  glowColor,
  noBorder = false,
  padding = 'md',
  hover = true,
  accentBorder,
}: GlassCardProps) {
  const glowRgba = glowColor ? glowMap[glowColor] : 'rgba(58,78,46,0.10)'

  return (
    <div
      className={['group relative rounded-2xl overflow-hidden transition-all duration-200', paddingStyles[padding], className].join(' ')}
      style={{
        background: 'var(--glass-bg)',
        border: noBorder ? 'none' : '1px solid var(--glass-border)',
        borderLeft: accentBorder ? `3px solid ${accentBorder}` : undefined,
        boxShadow: 'var(--glass-shadow)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
      }}
    >
      {/* Hover glow overlay */}
      {hover && (
        <div
          className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
          style={{ background: `radial-gradient(ellipse at top left, ${glowRgba} 0%, transparent 60%)` }}
        />
      )}
      <div className="relative">
        {children}
      </div>
    </div>
  )
}

export default GlassCard
