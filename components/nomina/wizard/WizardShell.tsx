'use client'
import { Suspense } from 'react'
import { useWizard } from './WizardContext'
import WizardProgressHeader from './WizardProgressHeader'
import Step1Periodo from './Step1Periodo'
import Step2Asistencias from './Step2Asistencias'
import Step3Ajustes from './Step3Ajustes'
import Step4Revision from './Step4Revision'

const STEPS: Record<number, React.ComponentType> = {
  1: Step1Periodo,
  2: Step2Asistencias,
  3: Step3Ajustes,
  4: Step4Revision,
}

const Spinner = () => (
  <div className="flex flex-col items-center justify-center gap-4 py-20">
    <div className="flex gap-2">
      <span className="loading-dot" />
      <span className="loading-dot" />
      <span className="loading-dot" />
    </div>
    <p className="text-sm text-stone-400 font-medium">Cargando...</p>
  </div>
)

export default function WizardShell() {
  const { currentStep, navigateToStep, state } = useWizard()
  const StepComponent = STEPS[currentStep] ?? Step1Periodo

  return (
    <div className="flex flex-col h-full" style={{ background: 'var(--surface)' }}>
      {/* Progress header */}
      <div className="shrink-0 border-b" style={{ borderColor: 'var(--divider)' }}>
        <WizardProgressHeader currentStep={currentStep} onStepClick={navigateToStep} />
      </div>

      {/* Step content — key drives the enter animation */}
      <div className="flex-1 min-h-0 overflow-y-auto">
        {state.initialLoading && currentStep !== 1 ? (
          <Spinner />
        ) : (
          <Suspense fallback={<Spinner />}>
            <div key={currentStep} className="wizard-step-enter flex flex-col" style={{ minHeight: '100%' }}>
              <StepComponent />
            </div>
          </Suspense>
        )}
      </div>
    </div>
  )
}
