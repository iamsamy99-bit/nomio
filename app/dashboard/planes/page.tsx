'use client'
import { useEffect, useState } from 'react'
import { useEmpresa } from '@/components/layout/EmpresaContext'
import { CheckCircle, XCircle, Zap, Star, Sparkles } from 'lucide-react'
import { formatDate } from '@/lib/utils'
import { PLANES, isPaidTier, formatLimit } from '@/lib/plan-limits'
import type { Empresa } from '@/types'

const TIER_ORDER = ['basico', 'pro', 'premium'] as const

const TIER_DISPLAY: Record<string, { label: string; icon: React.ReactNode; highlight: boolean }> = {
  basico:  { label: 'Básico',            icon: <Zap className="w-4 h-4" />,      highlight: false },
  pro:     { label: 'Constructor Pro',  icon: <Star className="w-4 h-4" />,     highlight: true  },
  premium: { label: 'Maestro Premium',  icon: <Sparkles className="w-4 h-4" />, highlight: false },
}

const FEATURE_ROWS: Array<{ label: string; key: keyof typeof FEATURES_BY_TIER }> = [
  { label: 'Trabajadores',               key: 'trabajadores' },
  { label: 'Proyectos',                  key: 'proyectos' },
  { label: 'Cotizaciones al mes',        key: 'cotizaciones' },
  { label: 'Control de asistencias',     key: 'asistencias' },
  { label: 'Tipos de pago mixto/hora',   key: 'modalidades' },
  { label: 'Exportacion PDF / Excel',    key: 'export' },
  { label: 'Anticipos y conceptos',      key: 'conceptos' },
  { label: 'Dias festivos automaticos',  key: 'festivos' },
  { label: 'Cuantificaciones con IA',    key: 'ai' },
]

const FEATURES_BY_TIER = {
  trabajadores: { basico: '10',         pro: '80',          premium: 'Ilimitados' },
  proyectos:    { basico: '3',          pro: '20',          premium: 'Ilimitados' },
  cotizaciones: { basico: '50/mes',     pro: 'Ilimitadas',  premium: 'Ilimitadas' },
  asistencias:  { basico: true,         pro: true,          premium: true         },
  modalidades:  { basico: true,         pro: true,          premium: true         },
  export:       { basico: true,         pro: true,          premium: true         },
  conceptos:    { basico: true,         pro: true,          premium: true         },
  festivos:     { basico: true,         pro: true,          premium: true         },
  ai:           { basico: false,        pro: false,         premium: true         },
}

export default function PlanesPage() {
  const { empresa } = useEmpresa()
  const [checkoutLoading, setCheckoutLoading] = useState<string | null>(null)
  const [portalLoading, setPortalLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')
  const [successMsg, setSuccessMsg] = useState('')

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    if (params.get('success') === '1') setSuccessMsg('Plan activado correctamente. Bienvenido.')
    if (params.get('canceled') === '1') setErrorMsg('El proceso de pago fue cancelado.')
  }, [])

  const handleCheckout = async (tier: string) => {
    setCheckoutLoading(tier)
    setErrorMsg('')
    try {
      const res = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tier }),
      })
      const data = await res.json()
      if (data.error) { setErrorMsg(data.error); setCheckoutLoading(null); return }
      window.location.href = data.url
    } catch {
      setErrorMsg('Error de conexion. Intenta de nuevo.')
      setCheckoutLoading(null)
    }
  }

  const handlePortal = async () => {
    setPortalLoading(true)
    setErrorMsg('')
    try {
      const res = await fetch('/api/stripe/portal', { method: 'POST' })
      const data = await res.json()
      if (data.error) { setErrorMsg(data.error); setPortalLoading(false); return }
      window.location.href = data.url
    } catch {
      setErrorMsg('Error de conexion.')
      setPortalLoading(false)
    }
  }


  const currentTier = empresa?.suscripcion_tier ?? 'gratuito'
  const isPaid = isPaidTier(currentTier)
  // Normalize legacy pyme -> pro for display
  const normalizedTier = currentTier === 'pyme' ? 'pro' : currentTier

  return (
    <div className="max-w-5xl mx-auto">
      <h1 className="font-display text-2xl font-bold mb-2" style={{ color: 'var(--tinta)' }}>Planes</h1>
      <p className="text-sm mb-6" style={{ color: 'var(--tinta-500)' }}>14 días de prueba gratis en cualquier plan. Sin contratos. Cancela cuando quieras.</p>

      {errorMsg && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm p-4 rounded-lg mb-5 flex items-center justify-between gap-4">
          <span>{errorMsg}</span>
          <button onClick={() => setErrorMsg('')} className="text-red-400 hover:text-red-600 shrink-0">x</button>
        </div>
      )}
      {successMsg && (
        <div className="bg-green-50 border border-green-200 text-green-700 text-sm p-4 rounded-lg mb-5 flex items-center gap-2">
          <CheckCircle className="w-4 h-4 shrink-0" />
          {successMsg}
        </div>
      )}

      {/* Current plan banner */}
      {isPaid && (
        <div className="bg-accent-light/30 border border-accent/30 rounded-xl p-4 mb-6 flex items-center justify-between gap-4 flex-wrap">
          <div>
            <p className="text-sm font-semibold text-ink">
              Plan actual: <span className="text-primary">{PLANES[normalizedTier]?.nombre ?? currentTier}</span>
              {empresa?.suscripcion_activa && (
                <span className="ml-2 text-xs text-green-600 font-medium inline-flex items-center gap-1">
                  <CheckCircle className="w-3 h-3" /> Activo
                </span>
              )}
            </p>
            {empresa?.fecha_vencimiento && (
              <p className="text-xs text-ink-soft mt-0.5">Valido hasta: {formatDate(empresa.fecha_vencimiento)}</p>
            )}
          </div>
          <button onClick={handlePortal} disabled={portalLoading} className="btn-secondary text-sm shrink-0">
            {portalLoading ? 'Cargando...' : 'Gestionar suscripcion'}
          </button>
        </div>
      )}

      {/* Plan cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        {TIER_ORDER.map(tier => {
          const plan = PLANES[tier]
          const display = TIER_DISPLAY[tier]
          const isCurrent = normalizedTier === tier
          const isUpgrade =
            !isPaid ||
            (normalizedTier === 'basico' && (tier === 'pro' || tier === 'premium')) ||
            (normalizedTier === 'pro' && tier === 'premium')

          return (
            <div
              key={tier}
              className={`rounded-xl border p-5 flex flex-col gap-4 relative ${
                display.highlight
                  ? 'border-primary bg-primary/5 shadow-md'
                  : 'border-border bg-surface'
              }`}
            >
              {display.highlight && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 text-white text-xs font-bold px-3 py-0.5 rounded-full" style={{ background: 'var(--primary)' }}>
                  MÁS POPULAR
                </span>
              )}
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span style={{ color: display.highlight ? 'var(--primary)' : 'var(--tinta-500)' }}>{display.icon}</span>
                  <span className="font-semibold text-sm" style={{ color: 'var(--tinta)' }}>{plan.nombre}</span>
                </div>
                <p className="text-3xl font-bold mt-2" style={{ color: 'var(--tinta)' }}>
                  ${plan.precio}
                  <span className="text-sm font-normal" style={{ color: 'var(--tinta-500)' }}>/mes</span>
                </p>
              </div>

              <ul className="text-sm space-y-1.5 flex-1" style={{ color: 'var(--tinta-500)' }}>
                <li className="flex items-center gap-2">
                  <CheckCircle className="w-3.5 h-3.5 text-green-500 shrink-0" />
                  {formatLimit(plan.trabajadores)} trabajadores
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="w-3.5 h-3.5 text-green-500 shrink-0" />
                  {formatLimit(plan.proyectos)} proyectos
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="w-3.5 h-3.5 text-green-500 shrink-0" />
                  {plan.cotizacionesMes === null ? 'Cotizaciones ilimitadas' : `${plan.cotizacionesMes} cotizaciones/mes`}
                </li>
                {tier === 'premium' && (
                  <li className="flex items-center gap-2">
                    <Sparkles className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                    Cuantificaciones con IA
                  </li>
                )}
              </ul>

              {isCurrent ? (
                <div className="w-full py-2 text-center text-sm font-semibold text-primary border border-primary/30 rounded-lg bg-primary/5">
                  Plan actual
                </div>
              ) : isUpgrade ? (
                <button
                  onClick={() => handleCheckout(tier)}
                  disabled={checkoutLoading !== null}
                  className={`w-full py-2 text-sm font-semibold rounded-lg transition-colors ${
                    display.highlight
                      ? 'bg-primary text-white hover:bg-primary/90'
                      : 'btn-secondary'
                  }`}
                >
                  {checkoutLoading === tier ? 'Redirigiendo...' : `Activar ${plan.nombre}`}
                </button>
              ) : (
                <button
                  onClick={handlePortal}
                  disabled={portalLoading}
                  className="w-full py-2 text-sm text-ink-soft border border-border rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cambiar plan
                </button>
              )}
            </div>
          )
        })}
      </div>

      {/* Feature comparison table */}
      <div className="card overflow-hidden p-0">
        <div className="grid grid-cols-4 border-b border-border" style={{ background: 'var(--surface-2)' }}>
          <div className="py-3 px-4 text-xs font-semibold uppercase" style={{ color: 'var(--tinta-500)' }}>Función</div>
          {TIER_ORDER.map(tier => (
            <div key={tier} className="py-3 px-4 text-xs font-semibold uppercase text-center" style={{ color: normalizedTier === tier ? 'var(--primary)' : 'var(--tinta-500)' }}>
              {TIER_DISPLAY[tier].label}
            </div>
          ))}
        </div>
        <div className="divide-y divide-border">
          {FEATURE_ROWS.map(row => (
            <div key={row.key} className="grid grid-cols-4 items-center py-2.5 px-4">
              <span className="text-sm" style={{ color: 'var(--tinta)' }}>{row.label}</span>
              {TIER_ORDER.map(tier => {
                const val = FEATURES_BY_TIER[row.key][tier]
                return (
                  <div key={tier} className="text-center">
                    {val === true
                      ? <CheckCircle className="w-4 h-4 text-green-500 mx-auto" />
                      : val === false
                      ? <XCircle className="w-4 h-4 text-gray-300 mx-auto" />
                      : <span className="text-sm font-medium" style={{ color: 'var(--tinta)' }}>{val as string}</span>}
                  </div>
                )
              })}
            </div>
          ))}
        </div>
      </div>

      {!isPaid && (
        <div className="mt-6 text-center">
          <p className="text-sm text-ink-soft mb-3">Plan actual: <span className="font-medium text-ink">Gratuito</span> (5 trabajadores, 1 proyecto, 10 cotizaciones/mes)</p>
          <button
            onClick={() => handleCheckout('pro')}
            disabled={checkoutLoading !== null}
            className="btn-accent px-8 py-3 text-base inline-flex items-center gap-2"
          >
            <Star className="w-5 h-5" />
            {checkoutLoading === 'pro' ? 'Redirigiendo a Stripe...' : 'Activar Constructor Pro - $299/mes'}
          </button>
          <p className="text-xs text-gray-400 mt-2">14 dias gratis incluidos</p>
        </div>
      )}
    </div>
  )
}
