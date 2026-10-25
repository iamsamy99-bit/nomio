import type { ReactNode } from 'react'

// Full-page overlay that sits above the dashboard sidebar on desktop
// and above the mobile bottom nav on mobile.
export default function WizardLayout({ children }: { children: ReactNode }) {
  return (
    <div className="fixed inset-0 lg:left-[240px] top-14 z-40 flex flex-col overflow-hidden"
      style={{ background: 'var(--surface)' }}>
      {children}
    </div>
  )
}
