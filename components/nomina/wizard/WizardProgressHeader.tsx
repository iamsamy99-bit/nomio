'use client'
import { Check } from 'lucide-react'

const STEPS = [
  { n: 1, label: 'Periodo' },
  { n: 2, label: 'Asistencias' },
  { n: 3, label: 'Ajustes' },
  { n: 4, label: 'Revisión' },
]

interface Props {
  currentStep: number
  onStepClick?: (n: number) => void
}

export default function WizardProgressHeader({ currentStep, onStepClick }: Props) {
  return (
    <div className="px-4 py-5 sm:px-8" style={{ background: 'var(--cuero-50, var(--surface))' }}>
      <div className="flex items-start justify-between gap-0 max-w-2xl mx-auto">
        {STEPS.map((s, i) => {
          const done = s.n < currentStep
          const active = s.n === currentStep
          const accessible = onStepClick && s.n <= currentStep
          return (
            <div key={s.n} className="flex items-center flex-1 last:flex-none">
              <div className="flex flex-col items-center gap-2">
                <button
                  onClick={() => accessible && onStepClick(s.n)}
                  disabled={!accessible}
                  className="relative w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300 focus-visible:outline-none"
                  style={
                    done
                      ? { background: 'var(--bosque-500)', color: '#fff', border: '2px solid var(--bosque-500)' }
                      : active
                      ? { background: 'var(--surface)', color: 'var(--tinta)', border: '2px solid var(--tinta)', fontWeight: 800 }
                      : { background: 'var(--surface)', color: 'var(--tinta-500)', border: '2px solid var(--border)', opacity: 0.5 }
                  }
                >
                  {done ? <Check className="w-4 h-4" strokeWidth={3} /> : s.n}
                </button>
                <span
                  className="text-[10px] font-semibold uppercase tracking-[0.12em] hidden sm:block whitespace-nowrap"
                  style={{ color: active ? 'var(--tinta)' : done ? 'var(--bosque-500)' : 'var(--tinta-500)', opacity: active || done ? 1 : 0.4 }}
                >
                  {s.label}
                </span>
              </div>
              {i < STEPS.length - 1 && (
                <div className="flex-1 mx-2 -mt-5 sm:-mt-6">
                  <div className="h-0.5 rounded-full overflow-hidden" style={{ background: 'var(--border)' }}>
                    <div className="h-full rounded-full transition-all duration-500 ease-out"
                      style={{ width: done ? '100%' : '0%', background: 'var(--bosque-500)' }} />
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
