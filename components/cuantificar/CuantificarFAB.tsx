'use client'
import { useState } from 'react'
import { Sparkles, HardHat, X, Cpu } from 'lucide-react'
import { usePathname, useRouter } from 'next/navigation'
import CuantificarModal, { type CuantificarResultado } from './CuantificarModal'
import ConsultorModal from '@/components/consultor/ConsultorModal'

type ActiveModal = 'cuantificar' | 'consultor' | null

export default function CuantificarFAB({ tier = 'gratuito' }: { tier?: string }) {
  const pathname = usePathname()
  const router = useRouter()
  const [menuOpen, setMenuOpen] = useState(false)
  const [active, setActive] = useState<ActiveModal>(null)

  if (pathname.includes('/wizard')) return null

  const open = (modal: ActiveModal) => {
    setMenuOpen(false)
    setActive(modal)
  }

  const handleAgregar = (item: CuantificarResultado) => {
    sessionStorage.setItem('cuantificar_draft', JSON.stringify(item))
    router.push('/dashboard/cotizaciones/nueva?from=cuantificar')
  }

  return (
    <>
      {/* Speed-dial options */}
      {menuOpen && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setMenuOpen(false)} />
          <div className="fixed z-40 flex flex-col items-end gap-2" style={{ bottom: '8rem', right: '1rem' }}>
            <button
              onClick={() => open('consultor')}
              className="flex items-center gap-2 rounded-2xl shadow-lg transition-all duration-150 hover:scale-105 active:scale-95 pr-4 pl-3 py-2.5"
              style={{ background: '#1A2E37', color: '#FAF6EF', boxShadow: '0 4px 16px rgba(26,46,55,0.35)' }}
            >
              <HardHat className="w-4 h-4 text-[#6FA4CC] shrink-0" />
              <span className="text-sm font-semibold">Consultor de obra</span>
            </button>
            <button
              onClick={() => open('cuantificar')}
              className="flex items-center gap-2 rounded-2xl shadow-lg transition-all duration-150 hover:scale-105 active:scale-95 pr-4 pl-3 py-2.5"
              style={{ background: '#3a4f2e', color: '#FAF6EF', boxShadow: '0 4px 16px rgba(85,107,69,0.35)' }}
            >
              <Sparkles className="w-4 h-4 text-amber-300 shrink-0" />
              <span className="text-sm font-semibold">Cuantificar</span>
            </button>
          </div>
        </>
      )}

      {/* Main FAB */}
      <button
        onClick={() => setMenuOpen(v => !v)}
        title="IA de obra"
        className="fixed z-40 flex items-center gap-2 rounded-2xl shadow-xl transition-all duration-200 hover:scale-105 active:scale-95"
        style={{
          bottom: '5.5rem',
          right: '1rem',
          background: menuOpen
            ? 'linear-gradient(135deg, #1A2E37 0%, #0f1e24 100%)'
            : 'linear-gradient(135deg, #556B45 0%, #3a4f2e 100%)',
          color: '#FAF6EF',
          padding: '0.625rem 1rem',
          boxShadow: menuOpen
            ? '0 4px 20px rgba(26,46,55,0.50), 0 1px 4px rgba(0,0,0,0.18)'
            : '0 4px 20px rgba(85,107,69,0.45), 0 1px 4px rgba(0,0,0,0.18)',
        }}
      >
        {menuOpen ? <X className="w-4 h-4 shrink-0" /> : <Cpu className="w-4 h-4 shrink-0" />}
        <span className="text-sm font-semibold hidden sm:inline">
          {menuOpen ? 'Cerrar' : 'IA de obra'}
        </span>
      </button>

      {active === 'cuantificar' && (
        <CuantificarModal
          onClose={() => setActive(null)}
          onAgregar={handleAgregar}
          actionLabel="Crear cotización"
        />
      )}
      {active === 'consultor' && (
        <ConsultorModal onClose={() => setActive(null)} tier={tier} />
      )}
    </>
  )
}
