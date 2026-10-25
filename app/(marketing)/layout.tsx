import '../nomio-landing.css'
import NomioNav from '@/components/landing/nomio/NomioNav'
import NomioFooter from '@/components/landing/nomio/NomioFooter'
import NomioScripts from '@/components/landing/nomio/NomioScripts'

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="nomio" style={{ minHeight: '100vh' }}>
      <div className="progress" aria-hidden="true" />
      <div className="cursor-ring" aria-hidden="true" />
      <div className="cursor-dot" aria-hidden="true" />
      <NomioNav />
      {children}
      <NomioFooter />
      <NomioScripts />
    </div>
  )
}
