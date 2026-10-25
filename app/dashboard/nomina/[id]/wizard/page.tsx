'use client'
import { Suspense } from 'react'
import { use } from 'react'
import { WizardProvider } from '@/components/nomina/wizard/WizardContext'
import WizardShell from '@/components/nomina/wizard/WizardShell'

interface Props {
  params: Promise<{ id: string }>
}

export default function WizardPage({ params }: Props) {
  const { id } = use(params)
  return (
    <Suspense>
      <WizardProvider nominaId={id}>
        <WizardShell />
      </WizardProvider>
    </Suspense>
  )
}
