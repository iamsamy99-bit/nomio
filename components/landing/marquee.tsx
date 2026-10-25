'use client'
import { useReducedMotion } from 'framer-motion'

interface Props {
  children: React.ReactNode
  className?: string
  reverse?: boolean
  pauseOnHover?: boolean
  duration?: string
  gap?: string
}

export function Marquee({
  children,
  className = '',
  reverse = false,
  pauseOnHover = true,
  duration = '40s',
  gap = '1.5rem',
}: Props) {
  const reduceMotion = useReducedMotion()

  if (reduceMotion) {
    return (
      <div className={`overflow-hidden ${className}`}>
        <div style={{ display: 'flex', gap, flexWrap: 'wrap' }}>{children}</div>
      </div>
    )
  }

  return (
    <div
      className={`overflow-hidden ${className}`}
      style={{ '--marquee-duration': duration, '--marquee-gap': gap } as React.CSSProperties}
    >
      <div
        style={{
          display: 'flex',
          gap,
          width: 'max-content',
          animation: `marquee-scroll ${duration} linear infinite`,
          animationDirection: reverse ? 'reverse' : 'normal',
        }}
        onMouseEnter={pauseOnHover ? (e) => { (e.currentTarget as HTMLDivElement).style.animationPlayState = 'paused' } : undefined}
        onMouseLeave={pauseOnHover ? (e) => { (e.currentTarget as HTMLDivElement).style.animationPlayState = 'running' } : undefined}
      >
        <div style={{ display: 'flex', gap, flexShrink: 0 }}>{children}</div>
        <div style={{ display: 'flex', gap, flexShrink: 0 }} aria-hidden>{children}</div>
        <div style={{ display: 'flex', gap, flexShrink: 0 }} aria-hidden>{children}</div>
      </div>
    </div>
  )
}
