'use client'
import Link from 'next/link'
import { ArrowLeft, Shield } from 'lucide-react'
import NomioLogo from '@/components/brand/NomioLogo'

export default function PrivacidadPage() {
  return (
    <div className="atelier" style={{ minHeight: '100vh', background: 'var(--cuero-100)', color: 'var(--tinta)' }}>

      {/* NAV */}
      <nav style={{
        position: 'sticky', top: 0, zIndex: 50,
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        padding: '18px 48px',
        background: 'rgba(242, 235, 221, 0.92)', backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        borderBottom: '1px solid rgba(26, 23, 20, 0.07)',
      }}>
        <Link href="/" style={{ textDecoration: 'none' }}><NomioLogo /></Link>
        <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'var(--tinta-500)', textDecoration: 'none', fontWeight: 450 }}>
          <ArrowLeft size={14} /> Volver al inicio
        </Link>
      </nav>

      <div style={{ maxWidth: 820, margin: '0 auto', padding: '64px 48px 100px' }}>
        <div style={{ width: 44, height: 44, borderRadius: 10, background: 'var(--bosque-50)', border: '1px solid var(--bosque-100)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 20 }}>
          <Shield size={22} color="var(--bosque-500)" />
        </div>
        <h1 style={{ fontFamily: 'Fraunces, Georgia, serif', fontWeight: 400, fontSize: 'clamp(28px, 4vw, 48px)', letterSpacing: '-0.025em', color: 'var(--tinta)', marginBottom: 14 }}>
          Política de Privacidad
        </h1>
        <p style={{ fontSize: 15, color: 'var(--tinta-500)', lineHeight: 1.6, marginBottom: 8 }}>
          Esta página ha sido actualizada. Puedes ver el aviso de privacidad completo en el siguiente enlace.
        </p>
        <Link href="/politica-privacidad" style={{ display: 'inline-flex', alignItems: 'center', gap: 7, padding: '11px 22px', borderRadius: 10, background: 'var(--bosque-500)', color: 'var(--cuero-50)', textDecoration: 'none', fontSize: 14, fontWeight: 500, marginTop: 12 }}>
          Ver política de privacidad completa →
        </Link>
      </div>
    </div>
  )
}
