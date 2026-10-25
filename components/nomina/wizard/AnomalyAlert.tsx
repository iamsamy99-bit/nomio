'use client'
import { AlertTriangle, XCircle, Info } from 'lucide-react'
import type { AnomalyResult } from '@/types/wizard'

const CONFIG = {
  error:   { icon: XCircle,        bg: 'bg-red-50',    border: 'border-red-200',    text: 'text-red-700',    icon_color: 'text-red-500' },
  warning: { icon: AlertTriangle,  bg: 'bg-amber-50',  border: 'border-amber-200',  text: 'text-amber-700',  icon_color: 'text-amber-500' },
  info:    { icon: Info,           bg: 'bg-blue-50',   border: 'border-blue-200',   text: 'text-blue-700',   icon_color: 'text-blue-500' },
}

interface Props {
  anomaly: AnomalyResult
}

export default function AnomalyAlert({ anomaly }: Props) {
  const c = CONFIG[anomaly.level]
  const Icon = c.icon
  return (
    <div className={`flex items-start gap-2.5 p-3 rounded-lg border ${c.bg} ${c.border}`}>
      <Icon className={`w-4 h-4 shrink-0 mt-0.5 ${c.icon_color}`} />
      <p className={`text-sm ${c.text}`}>{anomaly.message}</p>
    </div>
  )
}
