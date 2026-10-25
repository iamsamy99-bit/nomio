'use client'
import { useRef } from 'react'
import { motion, useInView } from 'framer-motion'

interface Props {
  children: React.ReactNode
  className?: string
  delay?: number
  duration?: number
  y?: number
  as?: 'div' | 'section' | 'article' | 'li' | 'span'
}

export function FadeInUp({ children, className = '', delay = 0, duration = 0.6, y = 28, as = 'div' }: Props) {
  const ref = useRef(null)
  // amount: 0.15 — dispara cuando el 15% del elemento es visible, no antes
  const inView = useInView(ref, { once: true, amount: 0.15 })

  const MotionTag = motion[as] as typeof motion.div

  return (
    <MotionTag
      ref={ref}
      className={className}
      initial={{ opacity: 0, y }}
      animate={inView ? { opacity: 1, y: 0 } : { opacity: 0, y }}
      transition={{ duration, delay, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </MotionTag>
  )
}

// StaggerChildren es solo un wrapper estructural.
// La animación de cada hijo la controla StaggerItem con su propio viewport detector.
export function StaggerChildren({ children, className = '' }: { children: React.ReactNode; className?: string; stagger?: number; delay?: number }) {
  return (
    <div className={className}>
      {children}
    </div>
  )
}

// Cada StaggerItem detecta su propio viewport entry con whileInView.
// Así la animación ocurre cuando EL ITEM entra en pantalla, no cuando el wrapper padre entra.
export function StaggerItem({ children, className = '', y = 22, delay = 0 }: { children: React.ReactNode; className?: string; y?: number; delay?: number }) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.12 }}
      transition={{ duration: 0.6, delay, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  )
}
