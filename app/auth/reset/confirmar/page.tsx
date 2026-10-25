'use client'
import { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { sanitizeAuthError } from '@/lib/auth/errors'
import { Eye, EyeOff, AlertCircle, ArrowLeft } from 'lucide-react'

function NomioMark({ size = 36 }: { size?: number }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/icon-192.png" alt="Nomiextra" style={{ width: size, height: size, borderRadius: 8, flexShrink: 0, objectFit: 'cover' }} />
      <span style={{ fontFamily: 'Fraunces, Georgia, serif', fontSize: size * 0.55, fontWeight: 500, color: '#1A1714', letterSpacing: '-0.01em' }}>
        Nomiextra
      </span>
    </div>
  )
}

export default function ResetPasswordConfirmPage() {
  const [password, setPassword] = useState('')
  const [password2, setPassword2] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  // null = checking, true = ready, false = no valid session
  const [sessionReady, setSessionReady] = useState<boolean | null>(null)
  const supabase = useMemo(() => createClient(), [])

  useEffect(() => {
    let subscription: { unsubscribe: () => void } | null = null

    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (session) {
        setSessionReady(true)
        return
      }
      // Fallback for implicit (non-PKCE) link format with hash fragment
      const { data: sub } = supabase.auth.onAuthStateChange((event) => {
        if (event === 'PASSWORD_RECOVERY' || event === 'SIGNED_IN') {
          setSessionReady(true)
        }
      })
      subscription = sub.subscription
      setTimeout(() => {
        setSessionReady(prev => prev === null ? false : prev)
      }, 5000)
    }

    checkSession()
    return () => { subscription?.unsubscribe() }
  }, [supabase])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (password.length < 8) { setError('La contraseña debe tener al menos 8 caracteres.'); return }
    if (password !== password2) { setError('Las contraseñas no coinciden.'); return }
    setLoading(true)
    const { error } = await supabase.auth.updateUser({ password })
    if (error) { setError(sanitizeAuthError(error.message)); setLoading(false) }
    else { setSuccess(true); setLoading(false) }
  }

  /* ── Success state ── */
  if (success) {
    return (
      <div className="atelier" style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--cuero-50)', padding: 32 }}>
        <div style={{ width: '100%', maxWidth: 420, textAlign: 'center' }}>
          <div style={{ marginBottom: 28 }}>
            <NomioMark size={32} />
          </div>
          <div style={{ width: 48, height: 48, margin: '0 auto 24px', borderRadius: '50%', background: 'rgba(58,78,46,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#3A4E2E" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
              <polyline points="22 4 12 14.01 9 11.01" />
            </svg>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, marginBottom: 20 }}>
            <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, fontWeight: 500, textTransform: 'uppercase' as const, letterSpacing: '0.16em', color: 'var(--tinta-300)' }}>N° 005</span>
            <div style={{ width: 24, height: 1, background: 'var(--tinta-300)' }} />
            <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, fontWeight: 500, textTransform: 'uppercase' as const, letterSpacing: '0.16em', color: 'var(--tinta-500)' }}>Contraseña actualizada</span>
          </div>
          <h2 style={{ fontFamily: 'Fraunces, Georgia, serif', fontSize: 36, fontWeight: 400, letterSpacing: '-0.02em', lineHeight: 1.1, color: 'var(--tinta)', marginBottom: 16 }}>
            Todo <em style={{ fontStyle: 'italic', fontWeight: 300, color: 'var(--bosque-500)' }}>listo</em>.
          </h2>
          <p style={{ fontFamily: 'Inter Tight, system-ui, sans-serif', fontSize: 15, color: 'var(--tinta-500)', lineHeight: 1.55, marginBottom: 32 }}>
            Tu contraseña ha sido actualizada. Ya puedes iniciar sesión con ella.
          </p>
          <div style={{ height: 1, background: 'rgba(26,23,20,0.1)', marginBottom: 28 }} />
          <Link href="/auth/login" style={{
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            padding: '13px 28px', fontFamily: 'Inter Tight, system-ui, sans-serif',
            fontSize: 14, fontWeight: 500, background: 'var(--bosque-500)',
            color: 'var(--cuero-50)', borderRadius: 999, textDecoration: 'none',
          }}>
            Iniciar sesión
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="atelier" style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--cuero-100)', padding: '48px 32px' }}>
      <div style={{ width: '100%', maxWidth: 400 }}>

        {/* Logo */}
        <div style={{ marginBottom: 40 }}>
          <NomioMark size={36} />
        </div>

        {/* Header */}
        <div style={{ marginBottom: 32 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
            <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, fontWeight: 500, textTransform: 'uppercase' as const, letterSpacing: '0.16em', color: 'var(--tinta-300)' }}>N° 005</span>
            <div style={{ width: 24, height: 1, background: 'var(--tinta-300)' }} />
            <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, fontWeight: 500, textTransform: 'uppercase' as const, letterSpacing: '0.16em', color: 'var(--tinta-500)' }}>Nueva contraseña</span>
          </div>
          <h1 style={{ fontFamily: 'Fraunces, Georgia, serif', fontSize: 42, fontWeight: 400, letterSpacing: '-0.025em', lineHeight: 1.05, color: 'var(--tinta)', margin: 0 }}>
            Elige una<br />
            <em style={{ fontStyle: 'italic', fontWeight: 300, color: 'var(--bosque-500)' }}>nueva</em> contraseña.
          </h1>
        </div>

        {/* Content based on session state */}
        <div style={{ background: 'var(--cuero-50)', borderRadius: 12, padding: 24, border: '1px solid rgba(26,23,20,0.08)' }}>
          {sessionReady === null ? (
            <div style={{ textAlign: 'center', padding: '24px 0' }}>
              <span className="at-spin" style={{ width: 24, height: 24, border: '2px solid rgba(26,23,20,0.12)', borderTopColor: 'var(--bosque-500)', borderRadius: '50%', display: 'inline-block', marginBottom: 12 }} />
              <p style={{ fontFamily: 'Inter Tight, system-ui, sans-serif', fontSize: 14, color: 'var(--tinta-500)' }}>Verificando enlace...</p>
            </div>
          ) : sessionReady === false ? (
            <div style={{ textAlign: 'center', padding: '16px 0' }}>
              <div style={{ width: 48, height: 48, borderRadius: '50%', background: '#FEF2F2', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                <AlertCircle size={22} color="#991B1B" />
              </div>
              <p style={{ fontFamily: 'Fraunces, Georgia, serif', fontSize: 20, fontWeight: 400, color: 'var(--tinta)', marginBottom: 8 }}>
                Enlace expirado
              </p>
              <p style={{ fontFamily: 'Inter Tight, system-ui, sans-serif', fontSize: 14, color: 'var(--tinta-500)', lineHeight: 1.5, marginBottom: 24 }}>
                Los enlaces de recuperación son de un solo uso y expiran en 1 hora.
              </p>
              <Link href="/auth/reset" style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                padding: '12px 20px', fontFamily: 'Inter Tight, system-ui, sans-serif',
                fontSize: 14, fontWeight: 500, background: 'var(--bosque-500)',
                color: 'var(--cuero-50)', borderRadius: 999, textDecoration: 'none',
              }}>
                Solicitar nuevo enlace
              </Link>
            </div>
          ) : (
            <>
              {error && (
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, background: '#FEF2F2', color: '#991B1B', fontSize: 13, padding: '12px 14px', borderRadius: 8, marginBottom: 20, border: '1px solid rgba(153,27,27,0.15)', fontFamily: 'Inter Tight, system-ui, sans-serif' }}>
                  <AlertCircle size={15} style={{ flexShrink: 0, marginTop: 1 }} />
                  {error}
                </div>
              )}
              <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div>
                  <label htmlFor="new-password" style={{ display: 'block', fontFamily: 'JetBrains Mono, monospace', fontSize: 10, fontWeight: 500, textTransform: 'uppercase' as const, letterSpacing: '0.12em', color: 'var(--tinta-500)', marginBottom: 8 }}>
                    Nueva contraseña
                  </label>
                  <div style={{ position: 'relative' }}>
                    <input id="new-password" type={showPass ? 'text' : 'password'} value={password} required
                      onChange={e => setPassword(e.target.value)}
                      placeholder="Mínimo 8 caracteres"
                      className="atelier-input"
                      style={{ paddingRight: 44 }} />
                    <button type="button" onClick={() => setShowPass(!showPass)}
                      style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--tinta-300)', padding: 0, display: 'flex' }}>
                      {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>
                <div>
                  <label htmlFor="confirm-password" style={{ display: 'block', fontFamily: 'JetBrains Mono, monospace', fontSize: 10, fontWeight: 500, textTransform: 'uppercase' as const, letterSpacing: '0.12em', color: 'var(--tinta-500)', marginBottom: 8 }}>
                    Confirmar contraseña
                  </label>
                  <input id="confirm-password" type={showPass ? 'text' : 'password'} value={password2} required
                    onChange={e => setPassword2(e.target.value)}
                    placeholder="Repite tu contraseña"
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
                    ? <><span className="at-spin" style={{ width: 16, height: 16, border: '2px solid rgba(250,246,239,0.3)', borderTopColor: '#FAF6EF', borderRadius: '50%', display: 'inline-block' }} />&nbsp;Guardando...</>
                    : 'Actualizar contraseña'}
                </button>
              </form>
            </>
          )}
        </div>

        {/* Back link */}
        <div style={{ marginTop: 24, textAlign: 'center' }}>
          <Link href="/auth/login" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontFamily: 'Inter Tight, system-ui, sans-serif', fontSize: 14, color: 'var(--tinta-500)', textDecoration: 'none', fontWeight: 500 }}>
            <ArrowLeft size={14} />
            Volver al inicio de sesión
          </Link>
        </div>

      </div>
    </div>
  )
}
