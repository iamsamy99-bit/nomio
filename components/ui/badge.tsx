import { ReactNode } from 'react'

type BadgeVariant = 'default' | 'success' | 'warning' | 'error' | 'purple'

interface BadgeProps {
  variant?: BadgeVariant
  children: ReactNode
  className?: string
  dot?: boolean
}

const variantStyles: Record<BadgeVariant, { wrapper: string; dot: string }> = {
  default: {
    wrapper: 'bg-[rgba(6,182,212,0.12)] text-[#06B6D4] border-[rgba(6,182,212,0.28)]',
    dot:     'bg-[#06B6D4]',
  },
  success: {
    wrapper: 'bg-[rgba(34,197,94,0.12)] text-[#22C55E] border-[rgba(34,197,94,0.28)]',
    dot:     'bg-[#22C55E]',
  },
  warning: {
    wrapper: 'bg-[rgba(245,158,11,0.12)] text-[#F59E0B] border-[rgba(245,158,11,0.28)]',
    dot:     'bg-[#F59E0B]',
  },
  error: {
    wrapper: 'bg-[rgba(239,68,68,0.12)] text-[#EF4444] border-[rgba(239,68,68,0.28)]',
    dot:     'bg-[#EF4444]',
  },
  purple: {
    wrapper: 'bg-[rgba(129,140,248,0.12)] text-[#818CF8] border-[rgba(129,140,248,0.28)]',
    dot:     'bg-[#818CF8]',
  },
}

export function Badge({
  variant = 'default',
  children,
  className = '',
  dot = true,
}: BadgeProps) {
  const styles = variantStyles[variant]

  return (
    <span
      className={[
        'inline-flex items-center gap-1.5',
        'px-2.5 py-0.5 rounded-full',
        'text-xs font-semibold',
        'border backdrop-blur-sm',
        'font-[\'Space_Grotesk\',sans-serif]',
        styles.wrapper,
        className,
      ].join(' ')}
    >
      {dot && (
        <span
          className={[
            'w-1.5 h-1.5 rounded-full shrink-0',
            styles.dot,
          ].join(' ')}
        />
      )}
      {children}
    </span>
  )
}

export default Badge
