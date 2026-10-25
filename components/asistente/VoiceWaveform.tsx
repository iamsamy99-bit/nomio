'use client'
import { motion } from 'framer-motion'

const BARS = 32

/**
 * Visualizador de onda de voz. Barras animadas mientras el microfono escucha.
 * Decorativo (no lee audio real), pero da feedback inmediato de "te estoy oyendo".
 */
export default function VoiceWaveform({
  active,
  color = '#DC2626',
  height = 40,
}: {
  active: boolean
  color?: string
  height?: number
}) {
  return (
    <div className="flex items-center justify-center gap-[3px]" style={{ height }} aria-hidden="true">
      {Array.from({ length: BARS }).map((_, i) => {
        // Curva tipo campana para que el centro tenga mas amplitud
        const center = Math.abs(i - BARS / 2) / (BARS / 2)
        const amp = (1 - center) * (height * 0.7) + 4
        return (
          <motion.span
            key={i}
            style={{ width: 3, borderRadius: 3, background: color, display: 'block' }}
            initial={{ height: 4 }}
            animate={active ? { height: [4, amp, amp * 0.4, amp * 0.8, 4] } : { height: 4 }}
            transition={active ? {
              duration: 0.9 + (i % 5) * 0.12,
              repeat: Infinity,
              ease: 'easeInOut',
              delay: i * 0.025,
            } : { duration: 0.25 }}
          />
        )
      })}
    </div>
  )
}
