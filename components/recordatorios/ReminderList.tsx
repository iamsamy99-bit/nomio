'use client'

import Link from 'next/link'
import { Check, X } from 'lucide-react'
import { urgencyLabel, type ReminderUrgency } from '@/lib/proyecto-reminders'
import { kindLabel, type ReminderFeedItem } from '@/lib/recordatorios/feed'

const URGENCY_STYLE: Record<ReminderUrgency, { bg: string; color: string; border: string }> = {
  overdue: { bg: '#F5DAD5', color: 'var(--rojo-falta, #c0392b)', border: 'rgba(192,57,43,0.25)' },
  today:   { bg: '#FAEDD0', color: 'var(--ambar, #d9a441)', border: 'rgba(217,164,65,0.3)' },
  soon:    { bg: 'var(--bosque-50)', color: 'var(--bosque-600)', border: 'var(--bosque-200)' },
  later:   { bg: 'var(--cuero-100, #f5f0e8)', color: 'var(--tinta-500)', border: 'var(--border)' },
}

const CAT_STYLE: Record<string, { bg: string; color: string }> = {
  obra:       { bg: 'var(--bosque-50)', color: 'var(--bosque-600)' },
  contacto:   { bg: 'var(--petroleo-50, rgba(27,108,168,0.08))', color: 'var(--primary)' },
  cotizacion: { bg: 'rgba(217,164,65,0.12)', color: 'var(--ambar)' },
  general:    { bg: 'var(--cuero-100)', color: 'var(--tinta-500)' },
}

type Props = {
  items: ReminderFeedItem[]
  onComplete?: (recordatorioId: string) => void
  onDismiss?: (recordatorioId: string) => void
  emptyMessage?: string
  compact?: boolean
}

export default function ReminderList({ items, onComplete, onDismiss, emptyMessage, compact }: Props) {
  if (!items.length) {
    return (
      <p className={`${compact ? 'text-xs' : 'text-sm'}`} style={{ color: 'var(--tinta-500)' }}>
        {emptyMessage || 'Sin recordatorios pendientes.'}
      </p>
    )
  }

  return (
    <div className={`space-y-2 ${compact ? '' : 'max-h-[560px] overflow-y-auto pr-1'}`}>
      {items.map((item) => {
        const urg = URGENCY_STYLE[item.urgency] || URGENCY_STYLE.later
        const cat = CAT_STYLE[item.categoria || 'general'] || CAT_STYLE.general
        return (
          <div
            key={item.id}
            className="flex items-center justify-between gap-3 rounded-xl px-4 py-3 transition-colors"
            style={{ border: `1px solid ${urg.border}`, background: 'var(--surface)' }}
          >
            <div className="min-w-0 flex-1">
              <p className={`font-medium ${compact ? 'text-xs' : 'text-sm'}`} style={{ color: 'var(--tinta)' }}>
                {item.titulo}
              </p>
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                <span className="text-[10px] font-mono uppercase" style={{ color: 'var(--tinta-500)' }}>
                  {item.fecha}
                </span>
                {item.subtitulo && (
                  <>
                    <span style={{ color: 'var(--tinta-500)' }}>·</span>
                    <span className="text-[10px] font-mono uppercase" style={{ color: 'var(--tinta-500)' }}>
                      {item.subtitulo}
                    </span>
                  </>
                )}
                <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full"
                  style={{ background: urg.bg, color: urg.color }}>
                  {urgencyLabel(item.urgency)}
                </span>
                <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full"
                  style={{ background: cat.bg, color: cat.color }}>
                  {item.categoria || kindLabel(item.kind)}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              {item.recordatorioId && onComplete && (
                <button type="button" onClick={() => onComplete(item.recordatorioId!)}
                  className="flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg transition-colors"
                  style={{ color: 'var(--tinta-500)', border: '1px solid var(--border)' }}
                  title="Completar">
                  <Check className="w-3 h-3" /> Completar
                </button>
              )}
              {item.recordatorioId && onDismiss && (
                <button type="button" onClick={() => onDismiss(item.recordatorioId!)}
                  className="p-1.5 rounded-lg transition-colors hover:bg-red-50"
                  style={{ color: 'var(--tinta-500)' }} title="Descartar">
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
              {!item.recordatorioId && item.href && (
                <Link href={item.href}
                  className="flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg transition-colors"
                  style={{ color: 'var(--tinta-500)', border: '1px solid var(--border)' }}>
                  Ver
                </Link>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
