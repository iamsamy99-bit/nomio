'use client'
import { useState, useMemo } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { sanitizeAuthError } from '@/lib/auth/errors'
import { AlertCircle, ArrowLeft } from 'lucide-react'

function NomioMark({ size = 36, dark = false }: { size?: number; dark?: boolean }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/icon-192.png" alt="Nomiextra" style={{ width: size, height: size, borderRadius: 8, flexShrink: 0, objectFit: 'cover' }} />
      <span style={{ fontFamily: 'Fraunces, Georgia, serif', fontSize: size * 0.55, fontWeight: 500, color: dark ? '#FAF6EF' : '#1A1714', letterSpacing: '-0.01em' }}>
        Nomiextra
      </span>
    </div>
  )
}

export default function ResetPasswordRequestPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const supabase = useMemo(() => createClient(), [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true); setError('')
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/reset/confirmar`,
    })
    if (error) { setError(sanitizeAuthError(error.message)); setLoading(false) }
    else { setSuccess(true); setLoading(false) }
  }

  if (success) {
    return (
      <div className="atelier" style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--cuero-50)', padding: 32 }}>
        <div style={{ width: '100%', maxWidth: 420, textAlign: 'center' }}>
          <div style={{ marginBottom: 28 }}>
            <NomioMark size={32} />
          </div>
          <div style={{ width: 48, height: 48, margin: '0 auto 24px', borderRadius: '50%', background: 'rgba(58,78,46,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#3A4E2E" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
              <polyline points="22,6 12,13 2,6" />
            </svg>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, marginBottom: 20 }}>
            <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, fontWeight: 500, textTransform: 'uppercase' as const, letterSpacing: '0.16em', color: 'var(--tinta-300)' }}>N° 004</span>
            <div style={{ width: 24, height: 1, background: 'var(--tinta-300)' }} />
            <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, fontWeight: 500, textTransform: 'uppercase' as const, letterSpacing: '0.16em', color: 'var(--tinta-500)' }}>Correo enviado</span>
          </div>
          <h2 style={{ fontFamily: 'Fraunces, Georgia, serif', fontSize: 36, fontWeight: 400, letterSpacing: '-0.02em', lineHeight: 1.1, color: 'var(--tinta)', marginBottom: 16 }}>
            Revisa tu <em style={{ fontStyle: 'italic', fontWeight: 300, color: 'var(--bosque-500)' }}>bandeja</em>.
          </h2>
          <p style={{ fontFamily: 'Inter Tight, system-ui, sans-serif', fontSize: 15, color: 'var(--tinta-500)', lineHeight: 1.55, marginBottom: 32 }}>
            Enviamos un enlace de recuperación a{' '}
            <strong style={{ color: 'var(--tinta)', fontWeight: 600 }}>{email}</strong>.
            Puede tardar un minuto en llegar.
          </p>
          <div style={{ height: 1, background: 'rgba(26,23,20,0.1)', marginBottom: 28 }} />
          <Link href="/auth/login" style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            padding: '13px 24px', fontFamily: 'Inter Tight, system-ui, sans-serif',
            fontSize: 14, fontWeight: 500, background: 'var(--bosque-500)',
            color: 'var(--cuero-50)', borderRadius: 999, textDecoration: 'none',
          }}>
            <ArrowLeft size={15} />
            Volver al inicio de sesión
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="atelier" style={{ minHeight: '100vh', display: 'flex', background: 'var(--cuero-100)' }}>

      {/* Left: photo panel */}
      <div className="hidden lg:block" style={{ flex: '0 0 44%', position: 'relative', overflow: 'hidden' }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/atelier/img-architect-blueprints.jpg" alt=""
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', filter: 'brightness(0.58) saturate(0.8)' }} />
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(14,26,32,0.2) 0%, rgba(14,26,32,0.7) 100%)' }} />

        <div style={{ position: 'absolute', top: 40, left: 40 }}>
          <NomioMark size={36} dark />
        </div>

        <div style={{ position: 'absolute', top: '50%', left: 48, right: 48, transform: 'translateY(-50%)' }}>
          <p style={{ fontFamily: 'Fraunces, Georgia, serif', fontSize: 26, fontWeight: 300, lineHeight: 1.25, letterSpacing: '-0.015em', color: '#FAF6EF', marginBottom: 24 }}>
            "Una obra bien planeada nunca pierde el norte."
          </p>
          <div style={{ height: 1, background: 'rgba(250,246,239,0.15)', marginBottom: 20 }} />
          <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, textTransform: 'uppercase' as const, letterSpacing: '0.12em', color: 'rgba(250,246,239,0.45)' }}>
            Fig. 09 · Planos · Proyecto residencial, CDMX
          </div>
        </div>
      </div>

      {/* Right: form panel */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '48px 32px', background: 'var(--cuero-50)', overflowY: 'auto', minHeight: '100vh' }}>

        <div className="lg:hidden" style={{ marginBottom: 40 }}>
          <NomioMark size={36} />
        </div>

        <div style={{ width: '100%', maxWidth: 400 }}>

          {/* Header */}
          <div style={{ marginBottom: 36 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
              <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, fontWeight: 500, textTransform: 'uppercase' as const, letterSpacing: '0.16em', color: 'var(--tinta-300)' }}>N° 004</span>
              <div style={{ width: 24, height: 1, background: 'var(--tinta-300)' }} />
              <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, fontWeight: 500, textTransform: 'uppercase' as const, letterSpacing: '0.16em', color: 'var(--tinta-500)' }}>Recuperar acceso</span>
            </div>
            <h1 style={{ fontFamily: 'Fraunces, Georgia, serif', fontSize: 42, fontWeight: 400, letterSpacing: '-0.025em', lineHeight: 1.05, color: 'var(--tinta)', margin: 0 }}>
              ¿Olvidaste tu<br />
              <em style={{ fontStyle: 'italic', fontWeight: 300, color: 'var(--bosque-500)' }}>contraseña</em>?
            </h1>
            <p style={{ fontFamily: 'Inter Tight, system-ui, sans-serif', fontSize: 15, color: 'var(--tinta-500)', lineHeight: 1.5, marginTop: 10 }}>
              Escribe tu correo y te enviamos un enlace para crear una nueva.
            </p>
          </div>

          {/* Error */}
          {error && (
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, background: '#FEF2F2', color: '#991B1B', fontSize: 13, padding: '12px 14px', borderRadius: 8, marginBottom: 20, border: '1px solid rgba(153,27,27,0.15)', fontFamily: 'Inter Tight, system-ui, sans-serif' }}>
              <AlertCircle size={15} style={{ flexShrink: 0, marginTop: 1 }} />
              {error}
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <label htmlFor="reset-email" style={{ display: 'block', fontFamily: 'JetBrains Mono, monospace', fontSize: 10, fontWeight: 500, textTransform: 'uppercase' as const, letterSpacing: '0.12em', color: 'var(--tinta-500)', marginBottom: 8 }}>
                Correo electrónico
              </label>
              <input id="reset-email" type="email" value={email} required
                onChange={e => setEmail(e.target.value)}
                placeholder="tu@empresa.com"
                className="atelier-input" />
            </div>

            <button type="submit" disabled={loading} style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              width: '100%', padding: '14px 24px', marginTop: 4,
              fontFamily: 'Inter Tight, system-ui, sans-serif', fontSize: 15, fontWeight: 500,
              background: 'var(--bosque-500)', color: 'var(--cuero-50)',
              border: 'none', borderRadius: 999, cursor: loading ? 'not-allowed' : 'pointer',
              transition: 'background 0.2s ease', opacity: loading ? 0.75 : 1,
            }}>
              {loading
                ? <><span className="at-spin" style={{ width: 16, height: 16, border: '2px solid rgba(250,246,239,0.3)', borderTopColor: '#FAF6EF', borderRadius: '50%', display: 'inline-block' }} />&nbsp;Enviando...</>
                : 'Enviar enlace de recuperación'}
            </button>
          </form>

          {/* Back link */}
          <div style={{ marginTop: 28, textAlign: 'center' }}>
            <Link href="/auth/login" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontFamily: 'Inter Tight, system-ui, sans-serif', fontSize: 14, color: 'var(--tinta-500)', textDecoration: 'none', fontWeight: 500 }}>
              <ArrowLeft size={14} />
              Volver al inicio de sesión
            </Link>
          </div>

        </div>
      </div>
    </div>
  )
}
