'use client'
import { useId } from 'react'

interface NomioLogoProps {
  size?: number
  dark?: boolean
}

export function NomioIcon({ size = 32 }: { size?: number }) {
  const uid = useId().replace(/:/g, '')
  const bgId = `nomio-bg-${uid}`
  const nId = `nomio-n-${uid}`
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" style={{ flexShrink: 0, display: 'block' }}>
      <defs>
        <linearGradient id={bgId} x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stopColor="#22315A" /><stop offset="100%" stopColor="#121C36" /></linearGradient>
        <linearGradient id={nId} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#4ADE80" /><stop offset="100%" stopColor="#22D3BB" /></linearGradient>
      </defs>
      <rect width="100" height="100" rx="24" fill={`url(#${bgId})`} />
      <g strokeWidth="11" strokeLinecap="round" strokeLinejoin="round" fill="none">
        <path d="M32 78 L32 34" stroke="#FAF6EF" /><path d="M32 34 L64 78" stroke="#FAF6EF" /><path d="M64 78 L64 34" stroke={`url(#${nId})`} />
      </g>
      <path d="M82 11 L85 18.5 L92.5 21 L85 23.5 L82 31 L79 23.5 L71.5 21 L79 18.5 Z" fill="#22D3BB" />
    </svg>
  )
}

export default function NomioLogo({ size = 32, dark = false }: NomioLogoProps) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      <NomioIcon size={size} />
      <span style={{ fontFamily: 'Fraunces, Georgia, serif', fontSize: size * 0.56, fontWeight: 500, color: dark ? '#FAF6EF' : '#1A1714', letterSpacing: '-0.01em', lineHeight: 1 }}>
        Nomi<span style={{ color: '#22D3BB' }}>extra</span>
      </span>
    </div>
  )
}
