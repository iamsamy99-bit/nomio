'use client'
import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useEmpresa } from '@/components/layout/EmpresaContext'
import * as Sentry from '@sentry/nextjs'
import Link from 'next/link'
import { User, Building2, CreditCard, LogOut, AlertCircle, CheckCircle, ExternalLink, Users, Calendar, ShieldCheck } from 'lucide-react'
import { canManageTeam } from '@/lib/permissions'
import { getFestivosDelAño } from '@/lib/dias-festivos'
import type { RolUsuario } from '@/types'

type EmpresaInfo = {
  nombre: string
  rfc: string | null
  suscripcion_tier: string
  stripe_customer_id: string | null
  pagar_dias_festivos: boolean
  aplica_imss: boolean
  aplica_isr: boolean
}

const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']

function formatFechaCorta(iso: string): string {
  const [, m, d] = iso.split('-')
  return `${parseInt(d)} ${MESES[parseInt(m) - 1]}`
}

export default function PerfilPage() {
  const supabase = createClient()
  const { empresaId, rol, userEmail, empresa: empresaCtx } = useEmpresa()
  // Seed local state from context so toggles can update the UI immediately
  // without a refetch; the server cache is busted in handleToggle.
  const [empresa, setEmpresa] = useState<EmpresaInfo>(() => empresaCtx as unknown as EmpresaInfo)
  const [cancelLoading, setCancelLoading] = useState(false)
  const [cancelError, setCancelError] = useState('')
  const [logoutLoading, setLogoutLoading] = useState(false)
  const [toggleError, setToggleError] = useState('')

  const festivosAño = getFestivosDelAño(new Date().getFullYear())

  const handleManageSubscription = async () => {
    setCancelLoading(true)
    setCancelError('')
    try {
      const res = await fetch('/api/stripe/portal', { method: 'POST' })
      const data = await res.json()
      if (!res.ok) {
        setCancelError(data.error || 'Error al abrir el portal de suscripción.')
        setCancelLoading(false)
        return
      }
      window.location.href = data.url
    } catch {
      setCancelError('Error de red. Intenta de nuevo.')
      setCancelLoading(false)
    }
  }

  const TOGGLEABLE_CAMPOS = ['pagar_dias_festivos', 'aplica_imss', 'aplica_isr'] as const

  const handleToggle = async (campo: 'pagar_dias_festivos' | 'aplica_imss' | 'aplica_isr') => {
    if (!empresaId) return
    // Runtime whitelist: the TypeScript union only guards at compile time. Without
    // this check a tampered client could pass any boolean column of its empresas row.
    if (!TOGGLEABLE_CAMPOS.includes(campo)) return
    setToggleError('')
    const nuevoValor = !empresa[campo]
    const { error } = await supabase.from('empresas').update({ [campo]: nuevoValor }).eq('id', empresaId)
    if (error) {
      Sentry.captureException(error, { tags: { area: 'perfil.toggle' }, extra: { campo } })
      setToggleError('No se pudo actualizar la configuración. Intenta de nuevo.')
      return
    }
    // Optimistically reflect the change locally, then invalidate the server-cached
    // empresa context so other pages pick it up before the 180s TTL expires.
    setEmpresa(prev => ({ ...prev, [campo]: nuevoValor }))
    fetch('/api/cache/bust-empresa', { method: 'POST' }).catch(() => {})
  }

  const handleLogout = async () => {
    setLogoutLoading(true)
    await supabase.auth.signOut()
    window.location.href = '/auth/login'
  }

  const isPyme = empresa?.suscripcion_tier === 'pyme'

  return (
    <div className="max-w-2xl mx-auto space-y-5">
      <div className="mb-2">
        <h1 className="font-display text-2xl font-bold" style={{ color: 'var(--tinta)' }}>Perfil</h1>
        <p className="text-sm mt-0.5" style={{ color: 'var(--tinta-500)' }}>Información de tu cuenta y suscripción</p>
      </div>

      {/* Cuenta */}
      <div className="card">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: 'var(--bosque-50)' }}>
            <User className="w-4 h-4" style={{ color: 'var(--primary)' }} />
          </div>
          <h2 className="font-display font-semibold" style={{ color: 'var(--tinta)' }}>Cuenta</h2>
        </div>
        <div>
          <p className="text-xs uppercase tracking-wide font-semibold mb-0.5" style={{ color: 'var(--tinta-500)' }}>Correo electrónico</p>
          <p className="font-medium" style={{ color: 'var(--tinta)' }}>{userEmail}</p>
        </div>
      </div>

      {/* Empresa */}
      {empresa && (
        <div className="card">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: 'var(--bosque-50)' }}>
              <Building2 className="w-4 h-4" style={{ color: 'var(--verde-ok)' }} />
            </div>
            <h2 className="font-display font-semibold" style={{ color: 'var(--tinta)' }}>Empresa</h2>
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <p className="text-xs uppercase tracking-wide font-semibold mb-0.5" style={{ color: 'var(--tinta-500)' }}>Nombre</p>
              <p className="font-medium" style={{ color: 'var(--tinta)' }}>{empresa.nombre}</p>
            </div>
            {empresa.rfc && (
              <div>
                <p className="text-xs uppercase tracking-wide font-semibold mb-0.5" style={{ color: 'var(--tinta-500)' }}>RFC</p>
                <p className="font-mono font-medium" style={{ color: 'var(--tinta)' }}>{empresa.rfc}</p>
              </div>
            )}
          </div>

          {/* Días festivos toggle */}
          <div className="border-t mt-4 pt-4" style={{ borderColor: 'var(--border)' }}>
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-3 flex-1">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5" style={{ background: 'rgba(217,164,65,0.15)' }}>
                  <Calendar className="w-4 h-4" style={{ color: 'var(--ambar)' }} />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold" style={{ color: 'var(--tinta)' }}>Días festivos LFT</p>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--tinta-500)' }}>
                    Paga los 7 festivos oficiales automáticamente al generar nómina. Solo aplica a trabajadores con modalidad por día o mixto.
                  </p>
                </div>
              </div>
              <button
                onClick={() => handleToggle('pagar_dias_festivos')}
                className="relative inline-flex h-6 w-10 shrink-0 cursor-pointer rounded-full transition-colors duration-200 focus:outline-none mt-0.5"
                style={{ background: empresa.pagar_dias_festivos ? 'var(--bosque-500)' : 'var(--bosque-200)' }}
                role="switch"
                aria-checked={empresa.pagar_dias_festivos}
              >
                <span
                  className="inline-block h-4 w-4 rounded-full shadow transform transition-transform duration-200 mt-1"
                  style={{
                    background: 'var(--surface)',
                    transform: empresa.pagar_dias_festivos ? 'translateX(20px)' : 'translateX(4px)',
                  }}
                />
              </button>
            </div>

            {/* Lista de festivos del año */}
            <div className="mt-3 rounded-xl p-3" style={{ background: 'var(--bosque-50)', border: '1px solid var(--bosque-200)' }}>
              <p className="text-xs font-semibold mb-2" style={{ color: 'var(--bosque-600)' }}>
                Festivos {new Date().getFullYear()} — Ley Federal del Trabajo
              </p>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                {festivosAño.map(f => (
                  <div key={f.fecha} className="flex items-center gap-2">
                    <span className="text-xs font-mono w-12 shrink-0" style={{ color: 'var(--bosque-600)' }}>
                      {formatFechaCorta(f.fecha)}
                    </span>
                    <span className="text-xs" style={{ color: 'var(--tinta-500)' }}>{f.nombre}</span>
                  </div>
                ))}
              </div>
            </div>

            {toggleError && (
              <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-700 mt-3">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{toggleError}</span>
              </div>
            )}
          </div>

          {/* IMSS toggle */}
          <div className="border-t mt-4 pt-4" style={{ borderColor: 'var(--border)' }}>
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-3 flex-1">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5" style={{ background: 'rgba(27,108,168,0.10)' }}>
                  <ShieldCheck className="w-4 h-4" style={{ color: 'var(--primary)' }} />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold" style={{ color: 'var(--tinta)' }}>Cuotas IMSS obrero</p>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--tinta-500)' }}>
                    Descuenta automaticamente la cuota obrera (3.275% del SBC) al calcular la nomina. Configura el SBC diario por trabajador en su ficha.
                  </p>
                </div>
              </div>
              <button
                onClick={() => handleToggle('aplica_imss')}
                className="relative inline-flex h-6 w-10 shrink-0 cursor-pointer rounded-full transition-colors duration-200 focus:outline-none mt-0.5"
                style={{ background: empresa.aplica_imss ? 'var(--bosque-500)' : 'var(--bosque-200)' }}
                role="switch"
                aria-checked={empresa.aplica_imss}
              >
                <span
                  className="inline-block h-4 w-4 rounded-full shadow transform transition-transform duration-200 mt-1"
                  style={{
                    background: 'var(--surface)',
                    transform: empresa.aplica_imss ? 'translateX(20px)' : 'translateX(4px)',
                  }}
                />
              </button>
            </div>
          </div>

          {/* ISR toggle */}
          <div className="border-t mt-4 pt-4" style={{ borderColor: 'var(--border)' }}>
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-3 flex-1">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5" style={{ background: 'rgba(217,164,65,0.10)' }}>
                  <ShieldCheck className="w-4 h-4" style={{ color: 'var(--ambar)' }} />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold" style={{ color: 'var(--tinta)' }}>Retencion ISR</p>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--tinta-500)' }}>
                    Calcula y retiene el ISR mensual proporcional usando la tabla SAT 2026 (Art. 96 LISR). Solo recomendado para trabajadores con contrato formal.
                  </p>
                </div>
              </div>
              <button
                onClick={() => handleToggle('aplica_isr')}
                className="relative inline-flex h-6 w-10 shrink-0 cursor-pointer rounded-full transition-colors duration-200 focus:outline-none mt-0.5"
                style={{ background: empresa.aplica_isr ? 'var(--bosque-500)' : 'var(--bosque-200)' }}
                role="switch"
                aria-checked={empresa.aplica_isr}
              >
                <span
                  className="inline-block h-4 w-4 rounded-full shadow transform transition-transform duration-200 mt-1"
                  style={{
                    background: 'var(--surface)',
                    transform: empresa.aplica_isr ? 'translateX(20px)' : 'translateX(4px)',
                  }}
                />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Equipo */}
      {canManageTeam(rol) && (
        <div className="card">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: 'var(--bosque-50)' }}>
              <Users className="w-4 h-4" style={{ color: 'var(--primary)' }} />
            </div>
            <h2 className="font-display font-semibold" style={{ color: 'var(--tinta)' }}>Equipo y permisos</h2>
          </div>
          <p className="text-sm mb-3" style={{ color: 'var(--tinta-500)' }}>
            Agrega capataces que solo registran asistencias, sin ver sueldos ni totales de nómina.
          </p>
          <Link href="/dashboard/equipo" className="btn-secondary text-sm inline-flex items-center gap-2">
            <Users className="w-4 h-4" /> Gestionar equipo
          </Link>
        </div>
      )}

      {/* Suscripción */}
      <div className="card">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: 'var(--petroleo-50)' }}>
            <CreditCard className="w-4 h-4" style={{ color: 'var(--petroleo-500)' }} />
          </div>
          <h2 className="font-display font-semibold" style={{ color: 'var(--tinta)' }}>Suscripción</h2>
        </div>

        <div className="flex items-center gap-3 mb-4">
          <div className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-semibold border"
            style={isPyme
              ? { background: 'var(--petroleo-50)', color: 'var(--petroleo-500)', borderColor: 'var(--petroleo-300)' }
              : { background: 'var(--surface-2)', color: 'var(--tinta-500)', borderColor: 'var(--border)' }
            }>
            {isPyme
              ? <CheckCircle className="w-4 h-4" style={{ color: 'var(--petroleo-500)' }} />
              : <span className="w-2 h-2 rounded-full" style={{ background: 'var(--tinta-500)' }} />
            }
            Plan {isPyme ? 'PYME — $299 MXN/mes' : 'Gratuito'}
          </div>
        </div>

        {isPyme ? (
          <div className="space-y-3">
            <p className="text-sm" style={{ color: 'var(--tinta-500)' }}>
              Administra tu suscripción, actualiza tu método de pago o cancela desde el portal de Stripe.
            </p>
            {cancelError && (
              <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-700">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{cancelError}</span>
              </div>
            )}
            <button
              onClick={handleManageSubscription}
              disabled={cancelLoading}
              className="btn-secondary flex items-center gap-2 text-sm">
              <ExternalLink className="w-4 h-4" />
              {cancelLoading ? 'Abriendo portal...' : 'Gestionar suscripción / Cancelar'}
            </button>
            <p className="text-xs" style={{ color: 'var(--tinta-500)' }}>
              Serás redirigido al portal seguro de Stripe para gestionar o cancelar tu plan.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-sm" style={{ color: 'var(--tinta-500)' }}>
              Actualiza a PYME para desbloquear trabajadores ilimitados, proyectos ilimitados y más.
            </p>
            <a href="/dashboard/planes" className="btn-primary inline-flex items-center gap-2 text-sm">
              <CreditCard className="w-4 h-4" />
              Ver planes
            </a>
          </div>
        )}
      </div>

      {/* Cerrar sesión */}
      <div className="card">
        <button
          onClick={handleLogout}
          disabled={logoutLoading}
          className="flex items-center gap-2 text-sm font-semibold text-red-600 hover:text-red-700 transition-colors">
          <LogOut className="w-4 h-4" />
          {logoutLoading ? 'Cerrando sesión...' : 'Cerrar sesión'}
        </button>
      </div>
    </div>
  )
}
