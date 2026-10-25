'use client'
import { useState, useMemo } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { sanitizeAuthError } from '@/lib/auth/errors'
import { Eye, EyeOff, AlertCircle } from 'lucide-react'
import NomioLogo from '@/components/brand/NomioLogo'

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
    </svg>
  )
}

function CheckIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="11" stroke="#3A4E2E" strokeWidth="1.5" />
      <path d="M7 12l3.5 3.5 6-7" stroke="#3A4E2E" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export default function RegisterPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPass, setConfirmPass] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const supabase = useMemo(() => createClient(), [])

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (password !== confirmPass) { setError('Las contraseñas no coinciden.'); return }
    if (password.length < 8) { setError('La contraseña debe tener al menos 8 caracteres.'); return }
    setLoading('email')
    const { error } = await supabase.auth.signUp({
      email, password,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
    })
    if (error) { setError(sanitizeAuthError(error.message)); setLoading(null) }
    else setSuccess(true)
  }

  const handleGoogle = async () => {
    setLoading('google'); setError('')
    const redirectTo = (window as unknown as { electron?: { isElectron?: boolean } }).electron?.isElectron
      ? 'nomio://auth/callback'
      : `${window.location.origin}/auth/callback`
    const { error } = await supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo } })
    if (error) { setError(sanitizeAuthError(error.message)); setLoading(null) }
  }

  /* ── Success state ── */
  if (success) {
    return (
      <div className="atelier" style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--cuero-50)', padding: 32 }}>
        <div style={{ width: '100%', maxWidth: 420, textAlign: 'center' }}>
          <div style={{ width: 56, height: 56, margin: '0 auto 28px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <CheckIcon />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, marginBottom: 20 }}>
            <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.16em', color: 'var(--tinta-300)' }}>N° 003</span>
            <div style={{ width: 24, height: 1, background: 'var(--tinta-300)' }} />
            <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.16em', color: 'var(--tinta-500)' }}>Confirma tu correo</span>
          </div>
          <h2 style={{ fontFamily: 'Fraunces, Georgia, serif', fontSize: 36, fontWeight: 400, letterSpacing: '-0.02em', lineHeight: 1.1, color: 'var(--tinta)', marginBottom: 16 }}>
            Revisa tu <em style={{ fontStyle: 'italic', fontWeight: 300, color: 'var(--bosque-500)' }}>correo</em>.
          </h2>
          <p style={{ fontFamily: 'Inter Tight, system-ui, sans-serif', fontSize: 15, color: 'var(--tinta-500)', lineHeight: 1.55, marginBottom: 32 }}>
            Enviamos un enlace de confirmación a{' '}
            <strong style={{ color: 'var(--tinta)', fontWeight: 600 }}>{email}</strong>.
            Haz clic en el enlace para activar tu cuenta.
          </p>
          <div style={{ height: 1, background: 'rgba(26,23,20,0.1)', marginBottom: 28 }} />
          <Link href="/auth/login" style={{
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            padding: '13px 28px', fontFamily: 'Inter Tight, system-ui, sans-serif',
            fontSize: 14, fontWeight: 500, background: 'var(--bosque-500)',
            color: 'var(--cuero-50)', borderRadius: 999, textDecoration: 'none',
          }}>
            Ir al inicio de sesión
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="atelier" style={{ minHeight: '100vh', display: 'flex', background: 'var(--cuero-100)' }}>

      {/* ── Left: photo panel (desktop only) ── */}
      <div className="hidden lg:block" style={{ flex: '0 0 44%', position: 'relative', overflow: 'hidden' }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/atelier/img-blueprints.jpg" alt=""
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', filter: 'brightness(0.58) saturate(0.8)' }} />
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(14,26,32,0.2) 0%, rgba(14,26,32,0.7) 100%)' }} />

        {/* Logo overlay */}
        <div style={{ position: 'absolute', top: 40, left: 40 }}>
          <NomioLogo size={36} dark />
        </div>

        {/* Stats */}
        <div style={{ position: 'absolute', top: '50%', left: 48, right: 48, transform: 'translateY(-50%)' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
            {[
              { val: '$0', label: 'Plan gratuito para siempre' },
              { val: '14 días', label: 'Plan PYME de prueba incluido' },
              { val: '3 min', label: 'Para crear tu primera nómina' },
              { val: '100%', label: 'Sin tarjeta de crédito' },
            ].map(s => (
              <div key={s.val} style={{ padding: '20px', background: 'rgba(250,246,239,0.08)', border: '1px solid rgba(250,246,239,0.12)', borderRadius: 8 }}>
                <div style={{ fontFamily: 'Fraunces, Georgia, serif', fontSize: 32, fontWeight: 400, letterSpacing: '-0.02em', lineHeight: 1, color: '#FAF6EF', marginBottom: 6 }}>{s.val}</div>
                <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'rgba(250,246,239,0.5)' }}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom caption */}
        <div style={{ position: 'absolute', bottom: 48, left: 48, right: 48 }}>
          <div style={{ height: 1, background: 'rgba(250,246,239,0.15)', marginBottom: 16 }} />
          <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.12em', color: 'rgba(250,246,239,0.45)' }}>
            Fig. 08 · Proyecto arquitectónico · CDMX
          </div>
        </div>
      </div>

      {/* ── Right: form panel ── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '48px 32px', background: 'var(--cuero-50)', overflowY: 'auto', minHeight: '100vh' }}>

        {/* Mobile logo */}
        <div className="lg:hidden" style={{ marginBottom: 40 }}>
          <NomioLogo size={36} />
        </div>

        <div style={{ width: '100%', maxWidth: 400 }}>

          {/* Header */}
          <div style={{ marginBottom: 32 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
              <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.16em', color: 'var(--tinta-300)' }}>N° 003</span>
              <div style={{ width: 24, height: 1, background: 'var(--tinta-300)' }} />
              <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.16em', color: 'var(--tinta-500)' }}>Registro</span>
            </div>
            <h1 style={{ fontFamily: 'Fraunces, Georgia, serif', fontSize: 42, fontWeight: 400, letterSpacing: '-0.025em', lineHeight: 1.05, color: 'var(--tinta)', margin: 0 }}>
              Empieza hoy,<br />es{' '}
              <em style={{ fontStyle: 'italic', fontWeight: 300, color: 'var(--bosque-500)' }}>gratis</em>.
            </h1>
            <p style={{ fontFamily: 'Inter Tight, system-ui, sans-serif', fontSize: 15, color: 'var(--tinta-500)', lineHeight: 1.5, marginTop: 10 }}>
              14 días con Plan PYME incluidos. Sin tarjeta de crédito.
            </p>
          </div>

          {/* Error */}
          {error && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: '#FEF2F2', color: '#991B1B', fontSize: 13, padding: '12px 14px', borderRadius: 8, marginBottom: 20, border: '1px solid rgba(153,27,27,0.15)', fontFamily: 'Inter Tight, system-ui, sans-serif' }}>
              <AlertCircle size={15} style={{ flexShrink: 0 }} />
              {error}
            </div>
          )}

          {/* Google */}
          <button onClick={handleGoogle} disabled={!!loading} style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
            width: '100%', padding: '13px 20px', marginBottom: 20,
            fontFamily: 'Inter Tight, system-ui, sans-serif', fontSize: 14, fontWeight: 500,
            background: 'white', color: 'var(--tinta)',
            border: '1px solid rgba(26, 23, 20, 0.14)', borderRadius: 999,
            cursor: loading ? 'not-allowed' : 'pointer',
            transition: 'box-shadow 0.15s ease', opacity: loading ? 0.6 : 1,
          }}>
            {loading === 'google'
              ? <span className="at-spin" style={{ width: 18, height: 18, border: '2px solid rgba(26,23,20,0.15)', borderTopColor: 'var(--bosque-500)', borderRadius: '50%', display: 'inline-block' }} />
              : <GoogleIcon />}
            Registrarse con Google
          </button>

          {/* Divider */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 20 }}>
            <div style={{ flex: 1, height: 1, background: 'rgba(26,23,20,0.1)' }} />
            <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--tinta-300)' }}>o con correo</span>
            <div style={{ flex: 1, height: 1, background: 'rgba(26,23,20,0.1)' }} />
          </div>

          {/* Form */}
          <form onSubmit={handleRegister} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <label htmlFor="reg-email" style={{ display: 'block', fontFamily: 'JetBrains Mono, monospace', fontSize: 10, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.12em', color: 'var(--tinta-500)', marginBottom: 8 }}>
                Correo electrónico
              </label>
              <input
                id="reg-email" type="email" value={email} required
                onChange={e => setEmail(e.target.value)}
                placeholder="tu@empresa.com"
                className="atelier-input"
              />
            </div>

            <div>
              <label htmlFor="reg-password" style={{ display: 'block', fontFamily: 'JetBrains Mono, monospace', fontSize: 10, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.12em', color: 'var(--tinta-500)', marginBottom: 8 }}>
                Contraseña
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  id="reg-password" type={showPass ? 'text' : 'password'} value={password} required
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Mínimo 8 caracteres"
                  className="atelier-input"
                  style={{ paddingRight: 44 }}
                />
                <button type="button" onClick={() => setShowPass(!showPass)}
                  style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--tinta-300)', padding: 0, display: 'flex' }}>
                  {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <div>
              <label htmlFor="reg-confirm" style={{ display: 'block', fontFamily: 'JetBrains Mono, monospace', fontSize: 10, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.12em', color: 'var(--tinta-500)', marginBottom: 8 }}>
                Confirmar contraseña
              </label>
              <input
                id="reg-confirm" type="password" value={confirmPass} required
                onChange={e => setConfirmPass(e.target.value)}
                placeholder="Repite tu contraseña"
                className="atelier-input"
              />
            </div>

            <button type="submit" disabled={!!loading} style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              width: '100%', padding: '14px 24px', marginTop: 4,
              fontFamily: 'Inter Tight, system-ui, sans-serif', fontSize: 15, fontWeight: 500,
              background: 'var(--bosque-500)', color: 'var(--cuero-50)',
              border: 'none', borderRadius: 999,
              cursor: loading ? 'not-allowed' : 'pointer',
              transition: 'background 0.2s ease, box-shadow 0.2s ease',
              opacity: loading === 'email' ? 0.75 : 1,
            }}>
              {loading === 'email'
                ? <><span className="at-spin" style={{ width: 16, height: 16, border: '2px solid rgba(250,246,239,0.3)', borderTopColor: '#FAF6EF', borderRadius: '50%', display: 'inline-block' }} />&nbsp;Creando cuenta...</>
                : 'Crear cuenta gratis'}
            </button>
          </form>

          {/* Footer */}
          <div style={{ marginTop: 32, textAlign: 'center' }}>
            <p style={{ fontFamily: 'Inter Tight, system-ui, sans-serif', fontSize: 14, color: 'var(--tinta-500)', marginBottom: 20 }}>
              ¿Ya tienes cuenta?{' '}
              <Link href="/auth/login" style={{ color: 'var(--bosque-500)', fontWeight: 600, textDecoration: 'none' }}>
                Iniciar sesión
              </Link>
            </p>
            <div style={{ display: 'flex', justifyContent: 'center', gap: 16 }}>
              <Link href="/terminos" style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--tinta-300)', textDecoration: 'none' }}>Términos</Link>
              <span style={{ color: 'var(--tinta-300)', fontSize: 10 }}>·</span>
              <Link href="/politica-privacidad" style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--tinta-300)', textDecoration: 'none' }}>Privacidad</Link>
            </div>
          </div>

        </div>
      </div>
    </div>
  )
}
