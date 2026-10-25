import Link from 'next/link'
import { ArrowLeft, FileText, AlertTriangle } from 'lucide-react'
import NomioLogo from '@/components/brand/NomioLogo'

export const metadata = {
  title: 'Términos y Condiciones — Nomiextra',
  description: 'Términos y condiciones de uso del servicio Nomiextra.',
}

const sections = [
  { n: '01', title: 'Aceptación del servicio', id: 's1' },
  { n: '02', title: 'Suscripción y planes de pago', id: 's2' },
  { n: '03', title: 'Responsabilidad de los cálculos', id: 's3' },
  { n: '04', title: 'Disponibilidad y SLA', id: 's4' },
  { n: '05', title: 'Propiedad intelectual', id: 's5' },
  { n: '06', title: 'Terminación', id: 's6' },
  { n: '07', title: 'Legislación aplicable', id: 's7' },
]

export default function TerminosPage() {
  return (
    <div className="atelier" style={{ minHeight: '100vh', background: 'var(--cuero-100)', color: 'var(--tinta)' }}>
      <style>{`.legal-toc-link{display:flex;align-items:center;gap:10px;padding:7px 10px;border-radius:8px;text-decoration:none;font-size:12.5px;color:var(--tinta-500);margin-bottom:2px;transition:background .15s,color .15s}.legal-toc-link:hover{background:var(--cuero-200);color:var(--tinta)}
@media (max-width: 767px) {
  .legal-nav { padding: 14px 20px !important; }
  .legal-layout { grid-template-columns: 1fr !important; padding: 32px 20px 60px !important; }
  .legal-toc { display: none !important; }
  .legal-header { padding: 40px 20px 32px !important; }
}
@media (min-width: 768px) and (max-width: 1023px) {
  .legal-nav { padding: 16px 28px !important; }
  .legal-layout { grid-template-columns: 1fr !important; padding: 40px 28px 80px !important; }
  .legal-toc { display: none !important; }
  .legal-header { padding: 48px 28px 40px !important; }
}`}</style>

      {/* NAV */}
      <nav className="legal-nav" style={{
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

      {/* HEADER */}
      <div className="legal-header" style={{ padding: '64px 48px 48px', borderBottom: '1px solid rgba(26,23,20,0.07)', background: 'var(--cuero-50)' }}>
        <div style={{ maxWidth: 820, margin: '0 auto' }}>
          <div style={{ width: 44, height: 44, borderRadius: 10, background: 'var(--bosque-50)', border: '1px solid var(--bosque-100)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 20 }}>
            <FileText size={22} color="var(--bosque-500)" />
          </div>
          <h1 style={{ fontFamily: 'Fraunces, Georgia, serif', fontWeight: 400, fontSize: 'clamp(28px, 4vw, 48px)', letterSpacing: '-0.025em', color: 'var(--tinta)', marginBottom: 14 }}>
            Términos y Condiciones
          </h1>
          <p style={{ fontSize: 15, color: 'var(--tinta-500)', lineHeight: 1.6, maxWidth: 560, marginBottom: 16 }}>
            Al registrar tu empresa en Nomiextra aceptas regirte por los siguientes términos de servicio. Léelos con detenimiento para asegurar el uso correcto de la plataforma.
          </p>
          <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, letterSpacing: '0.08em', textTransform: 'uppercase' as const, color: 'var(--tinta-400)' }}>
            Última revisión: 20 de mayo de 2026
          </span>
        </div>
      </div>

      {/* LAYOUT */}
      <div className="legal-layout" style={{ maxWidth: 1100, margin: '0 auto', padding: '52px 48px 100px', display: 'grid', gridTemplateColumns: '220px 1fr', gap: 56, alignItems: 'start' }}>

        {/* TOC */}
        <aside className="legal-toc" style={{ position: 'sticky', top: 88 }}>
          <p style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase' as const, color: 'var(--tinta-400)', marginBottom: 12 }}>
            Contenido
          </p>
          {sections.map(s => (
            <a key={s.id} href={`#${s.id}`} className="legal-toc-link">
              <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, color: 'var(--bosque-500)', flexShrink: 0 }}>{s.n}</span>
              {s.title}
            </a>
          ))}
        </aside>

        {/* MAIN */}
        <main style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

          {[
            {
              id: 's1', n: '01', title: 'Aceptación del servicio',
              body: <p>Nomiextra proporciona un software SaaS diseñado para la cuantificación y cálculo de nóminas en el sector de la construcción y obra civil. Al utilizar nuestra plataforma, te comprometes a proporcionar información fidedigna y a no violar la legislación laboral aplicable en México.</p>,
            },
            {
              id: 's2', n: '02', title: 'Suscripción y planes de pago',
              body: <>
                <p>El acceso a características avanzadas como Cuantificación con IA y límites ampliados de proyectos se otorga mediante una suscripción de pago periódico procesada con Stripe:</p>
                <ul>
                  <li>El usuario es responsable de mantener un método de pago válido.</li>
                  <li>Las cancelaciones surten efecto al final del periodo de facturación en curso. Los servicios se limitarán al plan gratuito a partir de ese momento.</li>
                  <li>No se ofrecen reembolsos por periodos parciales salvo que la ley aplicable lo exija.</li>
                </ul>
              </>,
            },
            {
              id: 's3', n: '03', title: 'Responsabilidad de los cálculos',
              body: <>
                <p>Nomiextra provee herramientas matemáticas automatizadas basadas en las tarifas y horas ingresadas por el administrador de la empresa.</p>
                <div style={{ display: 'flex', gap: 12, padding: '14px 16px', background: 'rgba(180,130,50,0.06)', border: '1px solid rgba(180,130,50,0.2)', borderRadius: 10, marginTop: 10 }}>
                  <AlertTriangle size={16} color="var(--ambar)" style={{ flexShrink: 0, marginTop: 2 }} />
                  <p style={{ margin: 0, fontSize: 13, color: 'var(--tinta-500)', lineHeight: 1.55 }}>
                    <strong style={{ color: 'var(--tinta)' }}>Descargo de responsabilidad técnica:</strong> Los cálculos del motor de nóminas e inteligencia artificial son estimaciones basadas exclusivamente en las asistencias y parámetros ingresados. El administrador es responsable final de auditar los números antes de realizar transferencias o dispersión oficial a sus trabajadores.
                  </p>
                </div>
              </>,
            },
            {
              id: 's4', n: '04', title: 'Disponibilidad y SLA',
              body: <p>Nomiextra se esfuerza por mantener una disponibilidad del servicio del 99.9%. Las ventanas de mantenimiento programado se realizarán preferentemente fuera de horarios laborales y serán notificadas en la plataforma con anticipación razonable.</p>,
            },
            {
              id: 's5', n: '05', title: 'Propiedad intelectual',
              body: <p>Todo el software, diseño, marca y contenido de Nomiextra son propiedad de Solventa y están protegidos por las leyes de propiedad intelectual aplicables. El uso de la plataforma no transfiere derechos de propiedad intelectual al usuario.</p>,
            },
            {
              id: 's6', n: '06', title: 'Terminación',
              body: <p>Nomiextra puede suspender o cancelar el acceso a la plataforma si se detecta uso fraudulento, violación de estos términos o actividad que ponga en riesgo la integridad del servicio. El usuario puede cancelar su cuenta en cualquier momento desde el panel de administración.</p>,
            },
            {
              id: 's7', n: '07', title: 'Legislación aplicable',
              body: <p>Estos términos se rigen por las leyes de los Estados Unidos Mexicanos. Cualquier controversia derivada de su interpretación o cumplimiento se someterá a la jurisdicción de los tribunales competentes de la Ciudad de México, renunciando expresamente a cualquier otro fuero.</p>,
            },
          ].map(s => (
            <section key={s.id} id={s.id} style={{ background: 'var(--cuero-50)', border: '1px solid var(--cuero-300)', borderRadius: 14, padding: '28px 28px 24px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
                <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, fontWeight: 600, color: 'var(--bosque-500)', flexShrink: 0 }}>{s.n} /</span>
                <h2 style={{ fontFamily: 'Fraunces, Georgia, serif', fontWeight: 400, fontSize: 18, letterSpacing: '-0.01em', color: 'var(--tinta)', margin: 0 }}>{s.title}</h2>
              </div>
              <div style={{ fontSize: 14, color: 'var(--tinta-500)', lineHeight: 1.7 }}>
                {s.body}
              </div>
            </section>
          ))}

          {/* Footer link to privacy */}
          <div style={{ marginTop: 8, padding: '20px 24px', background: 'var(--cuero-200)', border: '1px solid var(--cuero-300)', borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' as const }}>
            <div>
              <p style={{ fontWeight: 500, fontSize: 14, color: 'var(--tinta)', marginBottom: 2 }}>Política de Privacidad</p>
              <p style={{ fontSize: 12.5, color: 'var(--tinta-500)' }}>Cómo gestionamos y protegemos tus datos</p>
            </div>
            <Link href="/politica-privacidad" style={{ display: 'inline-flex', alignItems: 'center', gap: 7, padding: '9px 18px', borderRadius: 9, background: 'var(--bosque-500)', color: 'var(--cuero-50)', textDecoration: 'none', fontSize: 13, fontWeight: 500 }}>
              Ver política →
            </Link>
          </div>
        </main>
      </div>
    </div>
  )
}
