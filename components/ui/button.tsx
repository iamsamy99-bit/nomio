'use client'

import { Loader2 } from 'lucide-react'
import { ButtonHTMLAttributes, ReactNode } from 'react'

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger'
type Size = 'sm' | 'md' | 'lg'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
  loading?: boolean
  children: ReactNode
}

const variantStyles: Record<Variant, string> = {
  primary: [
    'bg-[#06B6D4] text-[#020817] font-semibold',
    'hover:bg-[#22D3EE] hover:shadow-glow',
    'disabled:opacity-50 disabled:cursor-not-allowed',
    'active:scale-[0.98]',
  ].join(' '),

  secondary: [
    'bg-[#1E293B] text-[#F8FAFC] font-semibold',
    'border border-[rgba(56,189,248,0.15)]',
    'hover:bg-[#243044] hover:border-[rgba(56,189,248,0.30)]',
    'disabled:opacity-50 disabled:cursor-not-allowed',
  ].join(' '),

  ghost: [
    'bg-transparent text-[#06B6D4] font-medium',
    'border border-[rgba(6,182,212,0.40)]',
    'hover:bg-[rgba(6,182,212,0.10)] hover:border-[rgba(6,182,212,0.60)]',
    'hover:shadow-[0_0_12px_rgba(6,182,212,0.15)]',
    'disabled:opacity-50 disabled:cursor-not-allowed',
  ].join(' '),

  danger: [
    'bg-[#EF4444] text-white font-semibold',
    'hover:bg-[#DC2626] hover:shadow-[0_0_20px_rgba(239,68,68,0.35)]',
    'disabled:opacity-50 disabled:cursor-not-allowed',
    'active:scale-[0.98]',
  ].join(' '),
}

const sizeStyles: Record<Size, string> = {
  sm: 'px-3 py-1.5 text-xs rounded-lg',
  md: 'px-4 py-2 text-sm rounded-xl',
  lg: 'px-6 py-3 text-base rounded-xl',
}

export function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  children,
  className = '',
  disabled,
  ...props
}: ButtonProps) {
  return (
    <button
      className={[
        'inline-flex items-center justify-center gap-2',
        'cursor-pointer transition-all duration-200',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgba(6,182,212,0.50)]',
        variantStyles[variant],
        sizeStyles[size],
        loading ? 'cursor-wait' : '',
        className,
      ].join(' ')}
      disabled={disabled || loading}
      {...props}
    >
      {loading && <Loader2 size={14} className="animate-spin shrink-0" />}
      {children}
    </button>
  )
}

export default Button
