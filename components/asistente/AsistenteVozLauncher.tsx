'use client'
import { useState, useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { LukaIcon } from '@/components/brand/LukaIcon'
import AsistenteVozModal from './AsistenteVozModal'

export const ASISTENTE_VOZ_EVENT = 'open-asistente-voz'
export const ASISTENTE_VOZ_OPENED = 'asistente-voz-opened'
export const ASISTENTE_VOZ_CLOSED = 'asistente-voz-closed'

export function abrirAsistenteVoz() {
  window.dispatchEvent(new CustomEvent(ASISTENTE_VOZ_EVENT))
}

export default function AsistenteVozLauncher({ tier = 'gratuito' }: { tier?: string }) {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)

  useEffect(() => {
    const h = () => { setOpen(true); window.dispatchEvent(new CustomEvent(ASISTENTE_VOZ_OPENED)) }
    window.addEventListener(ASISTENTE_VOZ_EVENT, h)
    return () => window.removeEventListener(ASISTENTE_VOZ_EVENT, h)
  }, [])

  const handleClose = () => {
    setOpen(false)
    window.dispatchEvent(new CustomEvent(ASISTENTE_VOZ_CLOSED))
  }

  // El wizard usa pantalla completa, no mostramos el FAB ahi
  if (pathname.includes('/wizard')) return null

  return (
    <>
      {/* Boton flotante (solo desktop, en mobile se usa la bottom nav) */}
      <motion.button
        onClick={() => setOpen(true)}
        title="Asistente de obra"
        aria-label="Abrir asistente de voz"
        className="hidden lg:flex fixed z-40 items-center gap-2 rounded-2xl"
        style={{
          bottom: '1.5rem',
          right: '1rem',
          background: 'linear-gradient(135deg, #1A2E37 0%, #0f1e24 100%)',
          color: '#FAF6EF',
          padding: '0.7rem 1.1rem',
          boxShadow: '0 6px 22px rgba(26,46,55,0.5), 0 1px 4px rgba(0,0,0,0.2)',
        }}
        initial={{ scale: 0, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 260, damping: 20, delay: 0.6 }}
        whileHover={{ scale: 1.06 }}
        whileTap={{ scale: 0.95 }}
      >
        {/* Anillo de atencion pulsante */}
        <span className="absolute inset-0 rounded-2xl pointer-events-none overflow-visible">
          <motion.span
            className="absolute inset-0 rounded-2xl"
            style={{ border: '2px solid rgba(111,164,204,0.6)' }}
            animate={{ scale: [1, 1.35], opacity: [0.6, 0] }}
            transition={{ duration: 2, repeat: Infinity, ease: 'easeOut' }}
          />
        </span>
        <motion.span
          className="relative flex items-center justify-center"
          animate={{ rotate: [0, -8, 8, 0] }}
          transition={{ duration: 2.4, repeat: Infinity, repeatDelay: 3, ease: 'easeInOut' }}
        >
          <LukaIcon size={18} color="#FAF6EF" accent="#3DDC84" />
        </motion.span>
        <span className="relative text-sm font-semibold">Luka AI</span>
      </motion.button>

      <AnimatePresence>
        {open && <AsistenteVozModal key="asistente-modal" onClose={handleClose} tier={tier} />}
      </AnimatePresence>
    </>
  )
}
