'use client'
import { useState, useMemo, useEffect } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { Suspense } from 'react'
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

const CALLBACK_ERRORS: Record<string, string> = {
  link_invalido:        'El enlace de acceso no es válido o ya expiró. Intenta de nuevo.',
  auth_callback_failed: 'No pudimos completar el inicio de sesión. Intenta de nuevo.',
}

function LoginForm() {
  const searchParams = useSearchParams()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading] = useState<string | null>(null)
  const [error, setError] = useState('')
  const supabase = useMemo(() => createClient(), [])

  useEffect(() => {
    const err = searchParams.get('error')
    if (err && CALLBACK_ERRORS[err]) setError(CALLBACK_ERRORS[err])
  }, [searchParams])

  const handleEmail = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading('email'); setError('')
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) { setError(sanitizeAuthError(error.message)); setLoading(null) }
    else window.location.href = '/dashboard'
  }

  const handleGoogle = async () => {
    setLoading('google'); setError('')
    const redirectTo = (window as unknown as { electron?: { isElectron?: boolean } }).electron?.isElectron
      ? 'nomio://auth/callback'
      : `${window.location.origin}/auth/callback`
    const { error } = await supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo } })
    if (error) { setError(sanitizeAuthError(error.message)); setLoading(null) }
  }

  return (
    <div style={{ width: '100%', maxWidth: 400 }}>
      <div style={{ marginBottom: 36 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
          <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, fontWeight: 500, textTransform: 'uppercase' as const, letterSpacing: '0.16em', color: 'var(--tinta-300)' }}>N° 002</span>
          <div style={{ width: 24, height: 1, background: 'var(--tinta-300)' }} />
          <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, fontWeight: 500, textTransform: 'uppercase' as const, letterSpacing: '0.16em', color: 'var(--tinta-500)' }}>Acceso</span>
        </div>
        <h1 style={{ fontFamily: 'Fraunces, Georgia, serif', fontSize: 42, fontWeight: 400, letterSpacing: '-0.025em', lineHeight: 1.05, color: 'var(--tinta)', margin: 0 }}>
          Bienvenido<br />de{' '}
          <em style={{ fontStyle: 'italic', fontWeight: 300, color: 'var(--bosque-500)' }}>nuevo</em>.
        </h1>
        <p style={{ fontFamily: 'Inter Tight, system-ui, sans-serif', fontSize: 15, color: 'var(--tinta-500)', lineHeight: 1.5, marginTop: 10 }}>
          Inicia sesión en Nomiextra para continuar.
        </p>
      </div>

      {error && (
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, background: '#FEF2F2', color: '#991B1B', fontSize: 13, padding: '12px 14px', borderRadius: 8, marginBottom: 20, border: '1px solid rgba(153,27,27,0.15)', fontFamily: 'Inter Tight, system-ui, sans-serif' }}>
          <AlertCircle size={15} style={{ flexShrink: 0, marginTop: 1 }} />
          {error}
        </div>
      )}

      <button onClick={handleGoogle} disabled={!!loading} style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
        width: '100%', padding: '13px 20px', marginBottom: 20,
        fontFamily: 'Inter Tight, system-ui, sans-serif', fontSize: 14, fontWeight: 500,
        background: 'white', color: 'var(--tinta)',
        border: '1px solid rgba(26, 23, 20, 0.14)', borderRadius: 999,
        cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.6 : 1,
        transition: 'box-shadow 0.15s ease',
      }}>
        {loading === 'google'
          ? <span className="at-spin" style={{ width: 18, height: 18, border: '2px solid rgba(26,23,20,0.15)', borderTopColor: 'var(--bosque-500)', borderRadius: '50%', display: 'inline-block' }} />
          : <GoogleIcon />}
        Continuar con Google
      </button>

      <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 20 }}>
        <div style={{ flex: 1, height: 1, background: 'rgba(26,23,20,0.1)' }} />
        <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, textTransform: 'uppercase' as const, letterSpacing: '0.1em', color: 'var(--tinta-300)' }}>o con correo</span>
        <div style={{ flex: 1, height: 1, background: 'rgba(26,23,20,0.1)' }} />
      </div>

      <form onSubmit={handleEmail} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div>
          <label htmlFor="login-email" style={{ display: 'block', fontFamily: 'JetBrains Mono, monospace', fontSize: 10, fontWeight: 500, textTransform: 'uppercase' as const, letterSpacing: '0.12em', color: 'var(--tinta-500)', marginBottom: 8 }}>
            Correo electrónico
          </label>
          <input id="login-email" type="email" value={email} required onChange={e => setEmail(e.target.value)} placeholder="tu@empresa.com" className="atelier-input" />
        </div>

        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <label htmlFor="login-password" style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, fontWeight: 500, textTransform: 'uppercase' as const, letterSpacing: '0.12em', color: 'var(--tinta-500)' }}>
              Contraseña
            </label>
            <Link href="/auth/reset" style={{ fontFamily: 'Inter Tight, system-ui, sans-serif', fontSize: 12, color: 'var(--bosque-500)', textDecoration: 'none', fontWeight: 500 }}>
              ¿Olvidaste tu contraseña?
            </Link>
          </div>
          <div style={{ position: 'relative' }}>
            <input id="login-password" type={showPass ? 'text' : 'password'} value={password} required onChange={e => setPassword(e.target.value)} className="atelier-input" style={{ paddingRight: 44 }} />
            <button type="button" onClick={() => setShowPass(!showPass)} style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--tinta-300)', padding: 0, display: 'flex' }}>
              {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </div>

        <button type="submit" disabled={!!loading} style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          width: '100%', padding: '14px 24px', marginTop: 4,
          fontFamily: 'Inter Tight, system-ui, sans-serif', fontSize: 15, fontWeight: 500,
          background: 'var(--bosque-500)', color: 'var(--cuero-50)',
          border: 'none', borderRadius: 999, cursor: loading ? 'not-allowed' : 'pointer',
          transition: 'background 0.2s ease', opacity: loading === 'email' ? 0.75 : 1,
        }}>
          {loading === 'email'
            ? <><span className="at-spin" style={{ width: 16, height: 16, border: '2px solid rgba(250,246,239,0.3)', borderTopColor: '#FAF6EF', borderRadius: '50%', display: 'inline-block' }} />&nbsp;Iniciando sesión...</>
            : 'Iniciar sesión'}
        </button>
      </form>

      <div style={{ marginTop: 36, textAlign: 'center' }}>
        <p style={{ fontFamily: 'Inter Tight, system-ui, sans-serif', fontSize: 14, color: 'var(--tinta-500)', marginBottom: 20 }}>
          ¿No tienes cuenta?{' '}
          <Link href="/auth/register" style={{ color: 'var(--bosque-500)', fontWeight: 600, textDecoration: 'none' }}>
            Crear cuenta gratis
          </Link>
        </p>
        <div style={{ display: 'flex', justifyContent: 'center', gap: 16 }}>
          <Link href="/terminos" style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, textTransform: 'uppercase' as const, letterSpacing: '0.1em', color: 'var(--tinta-300)', textDecoration: 'none' }}>Términos</Link>
          <span style={{ color: 'var(--tinta-300)', fontSize: 10 }}>·</span>
          <Link href="/politica-privacidad" style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, textTransform: 'uppercase' as const, letterSpacing: '0.1em', color: 'var(--tinta-300)', textDecoration: 'none' }}>Privacidad</Link>
        </div>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <div className="atelier" style={{ minHeight: '100vh', display: 'flex', background: 'var(--cuero-100)' }}>
      <div className="hidden lg:block" style={{ flex: '0 0 44%', position: 'relative', overflow: 'hidden' }}>
        <img src="/atelier/img-scaffolding.jpg" alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', filter: 'brightness(0.62) saturate(0.85)' }} />
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(14,26,32,0.25) 0%, rgba(14,26,32,0.65) 100%)' }} />
        <div style={{ position: 'absolute', top: 40, left: 40 }}>
          <Link href="/" aria-label="Ir al inicio" style={{ display: 'inline-flex', textDecoration: 'none' }}>
            <NomioLogo size={36} dark />
          </Link>
        </div>
        <div style={{ position: 'absolute', bottom: 48, left: 48, right: 48 }}>
          <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, fontWeight: 500, textTransform: 'uppercase' as const, letterSpacing: '0.08em', background: 'var(--cuero-50)', color: 'var(--tinta)', padding: '8px 12px', borderRadius: 4, display: 'inline-block', marginBottom: 24 }}>
            Fig. 07 · Andamio · Obra residencial, CDMX
          </div>
          <p style={{ fontFamily: 'Fraunces, Georgia, serif', fontSize: 28, fontWeight: 300, lineHeight: 1.2, letterSpacing: '-0.015em', color: '#FAF6EF', marginBottom: 16 }}>
            "La nómina lista antes de bajar del andamio."
          </p>
          <div style={{ height: 1, background: 'rgba(250,246,239,0.15)', marginBottom: 16 }} />
          <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, textTransform: 'uppercase' as const, letterSpacing: '0.12em', color: 'rgba(250,246,239,0.45)' }}>
            Nomiextra · Software de obra · CDMX
          </div>
        </div>
      </div>

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '48px 32px', background: 'var(--cuero-50)', overflowY: 'auto', minHeight: '100vh' }}>
        <div className="lg:hidden" style={{ marginBottom: 40 }}>
          <Link href="/" aria-label="Ir al inicio" style={{ display: 'inline-flex', textDecoration: 'none' }}>
            <NomioLogo size={36} />
          </Link>
        </div>
        <Suspense fallback={null}>
          <LoginForm />
        </Suspense>
      </div>
    </div>
  )
}
