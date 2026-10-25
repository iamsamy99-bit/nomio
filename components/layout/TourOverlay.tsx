'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { X, ChevronRight, ChevronLeft, FolderOpen, Users, ClipboardList, Receipt, CalendarDays, Sparkles } from 'lucide-react'

const steps = [
  {
    icon: Sparkles,
    title: '¡Bienvenido a Nomiextra!',
    desc: 'Te damos un tour rápido para que conozcas todo lo que puedes hacer. Solo toma 1 minuto.',
    color: 'from-primary to-primary-light',
  },
  {
    icon: FolderOpen,
    title: 'Crea un proyecto',
    desc: 'Empieza creando un proyecto. Puede ser una obra, un contrato, o un centro de costos. Agrupa trabajadores y nóminas por proyecto.',
    color: 'from-blue-500 to-cyan-500',
    link: '/dashboard/proyectos',
  },
  {
    icon: Users,
    title: 'Agrega tus trabajadores',
    desc: 'Captura información completa: nombre, teléfono, contacto de emergencia, RFC, CURP, NSS y datos bancarios. Configura su modalidad de pago.',
    color: 'from-violet-500 to-purple-500',
    link: '/dashboard/trabajadores',
  },
  {
    icon: CalendarDays,
    title: 'Registra asistencias',
    desc: 'Marca los días trabajados en una vista semanal. El sistema calcula automáticamente el pago según la modalidad de cada trabajador.',
    color: 'from-green-500 to-emerald-500',
    link: '/dashboard/asistencias',
  },
  {
    icon: ClipboardList,
    title: 'Genera nóminas',
    desc: 'Crea nóminas por período. Incluye horas extra, préstamos, finiquitos y cualquier concepto adicional que necesites.',
    color: 'from-amber-500 to-orange-500',
    link: '/dashboard/nomina',
  },
  {
    icon: Receipt,
    title: 'Crea cotizaciones profesionales',
    desc: 'Con tu logo, colores personalizados, IVA, descuentos y condiciones de pago. Exporta a PDF y envíalas al cliente.',
    color: 'from-pink-500 to-red-500',
    link: '/dashboard/cotizaciones',
  },
]

export default function TourOverlay({ userId, initiallyOpen = true }: { userId: string; initiallyOpen?: boolean }) {
  const [open, setOpen] = useState(initiallyOpen)
  const [step, setStep] = useState(0)
  const supabase = createClient()

  useEffect(() => {
    if (!initiallyOpen) setOpen(false)
  }, [initiallyOpen])

  const completeTour = async () => {
    await supabase.from('empresa_users').update({ tour_completado: true }).eq('user_id', userId)
    setOpen(false)
  }

  if (!open) return null

  const s = steps[step]
  const Icon = s.icon
  const isFirst = step === 0
  const isLast = step === steps.length - 1

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-surface rounded-2xl max-w-md w-full overflow-hidden shadow-2xl animate-fade-in-up">
        {/* Header */}
        <div className={`bg-gradient-to-br ${s.color} p-6 text-white relative overflow-hidden`}>
          <button onClick={completeTour}
            className="absolute top-3 right-3 p-1.5 rounded-lg bg-surface/20 hover:bg-surface/30 transition-colors">
            <X className="w-4 h-4" />
          </button>
          <div className="w-14 h-14 bg-surface/20 backdrop-blur rounded-xl flex items-center justify-center mb-3">
            <Icon className="w-7 h-7" />
          </div>
          <h3 className="font-display text-xl font-bold">{s.title}</h3>
        </div>

        <div className="p-6">
          <p className="text-ink-soft text-sm leading-relaxed mb-6">{s.desc}</p>

          {/* Progress dots */}
          <div className="flex items-center justify-center gap-1.5 mb-5">
            {steps.map((_, i) => (
              <div key={i}
                className={`h-1.5 rounded-full transition-all ${i === step ? 'w-6 bg-primary' : i < step ? 'w-1.5 bg-primary/50' : 'w-1.5 bg-gray-200'}`} />
            ))}
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between gap-3">
            <button onClick={() => isFirst ? completeTour() : setStep(step - 1)}
              className="btn-secondary flex items-center gap-1.5 text-xs">
              {isFirst ? 'Saltar' : (<><ChevronLeft className="w-3.5 h-3.5" />Anterior</>)}
            </button>
            <p className="text-xs text-gray-400">{step + 1} de {steps.length}</p>
            <button onClick={() => isLast ? completeTour() : setStep(step + 1)}
              className="btn-primary flex items-center gap-1.5 text-xs">
              {isLast ? 'Empezar' : (<>Siguiente<ChevronRight className="w-3.5 h-3.5" /></>)}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
