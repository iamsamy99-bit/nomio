'use client'

import { useState } from 'react'
import { MessageCircle, Mail, Send } from 'lucide-react'
import {
  buildCotizacionShareText,
  cotizacionEmailSubject,
  openEmailShare,
  openWhatsAppShare,
  type CotizacionShareInput,
} from '@/lib/crm/share-cotizacion'
import type { Cliente } from '@/types'

type Props = {
  cot: CotizacionShareInput
  contacto?: Pick<Cliente, 'telefono' | 'email' | 'nombre'> | null
  empresaNombre: string
  onMarkEnviada?: () => Promise<void>
  compact?: boolean
}

export default function EnviarCotizacionActions({ cot, contacto, empresaNombre, onMarkEnviada, compact }: Props) {
  const [msg, setMsg] = useState('')
  const appUrl = typeof window !== 'undefined'
    ? (process.env.NEXT_PUBLIC_APP_URL || window.location.origin)
    : (process.env.NEXT_PUBLIC_APP_URL || 'https://app.nomio.mx')

  const telefono = contacto?.telefono || (cot as { cliente_telefono?: string }).cliente_telefono
  const email = contacto?.email || (cot as { cliente_email?: string }).cliente_email
  const text = buildCotizacionShareText(cot, empresaNombre, appUrl)
  const subject = cotizacionEmailSubject(cot, empresaNombre)

  const handleWa = async () => {
    setMsg('')
    if (!telefono) { setMsg('Agrega telefono al contacto.'); return }
    const err = openWhatsAppShare(telefono, text)
    if (err) { setMsg(err); return }
    if (onMarkEnviada) await onMarkEnviada()
  }

  const handleMail = async () => {
    setMsg('')
    if (!email) { setMsg('Agrega correo al contacto.'); return }
    openEmailShare(email, subject, text)
    if (onMarkEnviada) await onMarkEnviada()
  }

  const btn = compact ? 'btn-secondary py-1.5 text-xs' : 'btn-secondary text-sm'

  return (
    <div className="flex flex-wrap items-center gap-2">
      <button type="button" onClick={handleWa} className={`${btn} flex items-center gap-1.5`} disabled={!telefono}>
        <MessageCircle className="w-3.5 h-3.5" /> WhatsApp
      </button>
      <button type="button" onClick={handleMail} className={`${btn} flex items-center gap-1.5`} disabled={!email}>
        <Mail className="w-3.5 h-3.5" /> Correo
      </button>
      {!compact && (
        <span className="text-[10px] text-ink-soft flex items-center gap-1">
          <Send className="w-3 h-3" /> Incluye enlace para ver y exportar PDF
        </span>
      )}
      {msg && <p className="text-xs text-amber-400 w-full">{msg}</p>}
    </div>
  )
}
