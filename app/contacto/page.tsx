import Link from 'next/link'
import NomioLogo from '@/components/brand/NomioLogo'

export default function ContactoPage() {
  return (
    <div className="atelier" style={{ minHeight: '100vh', background: 'var(--cuero-100)', color: 'var(--tinta)' }}>
      <nav style={{ padding: '20px 48px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid rgba(26,23,20,0.06)', background: 'var(--cuero-50)' }}>
        <Link href="/"><NomioLogo size={28} /></Link>
        <Link href="/auth/login" style={{ fontFamily: 'Inter Tight, sans-serif', fontSize: 14, color: 'var(--tinta-500)', textDecoration: 'none' }}>Iniciar sesión →</Link>
      </nav>
      <div style={{ maxWidth: 700, margin: '0 auto', padding: '80px 48px 60px', textAlign: 'center' }}>
        <p style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, letterSpacing: '0.2em', textTransform: 'uppercase' as const, color: 'var(--tinta-300)', marginBottom: 20 }}>CONTACTO</p>
        <h1 style={{ fontFamily: 'Fraunces, Georgia, serif', fontSize: 52, fontWeight: 400, lineHeight: 1.08, letterSpacing: '-0.025em', color: 'var(--tinta)', marginBottom: 24 }}>
          Hablemos de <em style={{ color: 'var(--bosque-500)', fontStyle: 'italic' }}>tu obra.</em>
        </h1>
        <p style={{ fontFamily: 'Inter Tight, sans-serif', fontSize: 18, color: 'var(--tinta-500)', lineHeight: 1.6, marginBottom: 48 }}>¿Tienes dudas o quieres una demo? Escríbenos, respondemos en menos de 24 horas.</p>
        <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 16, maxWidth: 400, margin: '0 auto' }}>
          <a href="mailto:contacto@nomiextra.mx" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, padding: '16px 28px', background: 'var(--cuero-50)', color: 'var(--tinta)', borderRadius: 999, fontFamily: 'Inter Tight, sans-serif', fontSize: 15, fontWeight: 500, textDecoration: 'none', border: '1px solid rgba(26,23,20,0.12)' }}>
            ✉ contacto@nomiextra.mx
          </a>
          <a href="https://wa.me/5215500000000" target="_blank" rel="noopener noreferrer" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, padding: '16px 28px', background: 'var(--bosque-500)', color: 'var(--cuero-50)', borderRadius: 999, fontFamily: 'Inter Tight, sans-serif', fontSize: 15, fontWeight: 500, textDecoration: 'none' }}>
            WhatsApp →
          </a>
        </div>
      </div>
      <div style={{ textAlign: 'center', padding: '0 0 60px' }}>
        <Link href="/" style={{ fontFamily: 'Inter Tight, sans-serif', fontSize: 14, color: 'var(--bosque-500)', textDecoration: 'none' }}>← Volver al inicio</Link>
      </div>
    </div>
  )
}
