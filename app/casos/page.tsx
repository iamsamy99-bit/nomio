import Link from 'next/link'
import NomioLogo from '@/components/brand/NomioLogo'

export default function CasosPage() {
  return (
    <div className="atelier" style={{ minHeight: '100vh', background: 'var(--cuero-100)', color: 'var(--tinta)' }}>
      <nav style={{ padding: '20px 48px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid rgba(26,23,20,0.06)', background: 'var(--cuero-50)' }}>
        <Link href="/"><NomioLogo size={28} /></Link>
        <Link href="/auth/login" style={{ fontFamily: 'Inter Tight, sans-serif', fontSize: 14, color: 'var(--tinta-500)', textDecoration: 'none' }}>Iniciar sesión →</Link>
      </nav>
      <div style={{ maxWidth: 900, margin: '0 auto', padding: '80px 48px 60px', textAlign: 'center' }}>
        <p style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, letterSpacing: '0.2em', textTransform: 'uppercase' as const, color: 'var(--tinta-300)', marginBottom: 20 }}>CASOS DE USO</p>
        <h1 style={{ fontFamily: 'Fraunces, Georgia, serif', fontSize: 52, fontWeight: 400, lineHeight: 1.08, letterSpacing: '-0.025em', color: 'var(--tinta)', marginBottom: 24 }}>
          Hecho para <em style={{ color: 'var(--bosque-500)', fontStyle: 'italic' }}>el sector construcción.</em>
        </h1>
        <p style={{ fontFamily: 'Inter Tight, sans-serif', fontSize: 18, color: 'var(--tinta-500)', lineHeight: 1.6, maxWidth: 600, margin: '0 auto 40px' }}>Nomiextra se adapta a constructoras, arquitectos y contratistas de toda la República Mexicana.</p>
        <Link href="/auth/register" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '14px 28px', background: 'var(--bosque-500)', color: 'var(--cuero-50)', borderRadius: 999, fontFamily: 'Inter Tight, sans-serif', fontSize: 15, fontWeight: 500, textDecoration: 'none' }}>Empezar gratis →</Link>
      </div>
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '0 48px 80px', display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 24 }}>
        {[
          { t: 'Constructoras y desarrolladoras', d: 'Administra múltiples obras, controla nómina por proyecto y genera reportes de costos.' },
          { t: 'Despachos de arquitectura', d: 'Cotiza con tu logo, lleva asistencias y genera recibos de nómina en minutos.' },
          { t: 'Contratistas y subcontratistas', d: 'Calcula pagos semanales, registra anticipos y mantén historial de cada trabajador.' },
        ].map(f => (
          <div key={f.t} style={{ background: 'var(--cuero-50)', borderRadius: 16, padding: '28px 24px', border: '1px solid rgba(26,23,20,0.06)' }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(58,78,46,0.10)', marginBottom: 16 }} />
            <h3 style={{ fontFamily: 'Fraunces, Georgia, serif', fontSize: 20, fontWeight: 500, color: 'var(--tinta)', marginBottom: 8 }}>{f.t}</h3>
            <p style={{ fontFamily: 'Inter Tight, sans-serif', fontSize: 14, color: 'var(--tinta-500)', lineHeight: 1.5 }}>{f.d}</p>
          </div>
        ))}
      </div>
      <div style={{ textAlign: 'center', padding: '0 0 60px' }}>
        <Link href="/" style={{ fontFamily: 'Inter Tight, sans-serif', fontSize: 14, color: 'var(--bosque-500)', textDecoration: 'none' }}>← Volver al inicio</Link>
      </div>
    </div>
  )
}
