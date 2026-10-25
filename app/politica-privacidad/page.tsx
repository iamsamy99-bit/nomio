import Link from 'next/link'
import { ArrowLeft, Shield } from 'lucide-react'
import NomioLogo from '@/components/brand/NomioLogo'

export const metadata = {
  title: 'Política de Privacidad — Nomiextra',
  description: 'Aviso de privacidad y protección de datos personales conforme a la LFPDPPP.',
}

const sections = [
  { id: 's1',  n: '01', title: 'Responsable de tus datos' },
  { id: 's2',  n: '02', title: 'Datos que recabamos' },
  { id: 's3',  n: '03', title: 'Finalidades del tratamiento' },
  { id: 's4',  n: '04', title: 'Confidencialidad y seguridad' },
  { id: 's5',  n: '05', title: 'Transferencia de datos' },
  { id: 's6',  n: '06', title: 'Tus derechos ARCO' },
  { id: 's7',  n: '07', title: 'Retención y eliminación' },
  { id: 's8',  n: '08', title: 'Cookies' },
  { id: 's9',  n: '09', title: 'Menores de edad' },
  { id: 's10', n: '10', title: 'Cambios al aviso' },
  { id: 's11', n: '11', title: 'Contacto' },
]

export default function PoliticaPrivacidadPage() {
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
            <Shield size={22} color="var(--bosque-500)" />
          </div>
          <h1 style={{ fontFamily: 'Fraunces, Georgia, serif', fontWeight: 400, fontSize: 'clamp(28px, 4vw, 48px)', letterSpacing: '-0.025em', color: 'var(--tinta)', marginBottom: 14 }}>
            Política de Privacidad
          </h1>
          <p style={{ fontSize: 15, color: 'var(--tinta-500)', lineHeight: 1.6, maxWidth: 600, marginBottom: 16 }}>
            En Nomiextra nos tomamos en serio la confidencialidad de los datos de tu empresa, trabajadores y colaboradores. Este aviso cumple con la <strong>LFPDPPP</strong> y su reglamento.
          </p>
          <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, letterSpacing: '0.08em', textTransform: 'uppercase' as const, color: 'var(--tinta-400)' }}>
            Última actualización: 14 de mayo de 2026
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

          <SectionCard id="s1" n="01" title="Responsable de tus datos">
            <p><strong>Nomiextra</strong> (en adelante &quot;Nomiextra&quot;, &quot;nosotros&quot; o &quot;la plataforma&quot;) es el responsable del tratamiento de los datos personales que recabamos. Este aviso cumple con la <strong>Ley Federal de Protección de Datos Personales en Posesión de los Particulares (LFPDPPP)</strong> y su reglamento.</p>
          </SectionCard>

          <SectionCard id="s2" n="02" title="Datos que recabamos">
            <p>Para prestarte el servicio recabamos únicamente los datos necesarios:</p>
            <ul>
              <li><strong>Datos de identificación:</strong> nombre, correo electrónico, teléfono, RFC de la empresa.</li>
              <li><strong>Datos laborales:</strong> información de trabajadores que tú capturas (nombre, puesto, sueldo, CURP, NSS, RFC, datos bancarios).</li>
              <li><strong>Datos de uso:</strong> dirección IP, tipo de dispositivo, tiempos de acceso, acciones dentro de la plataforma.</li>
              <li><strong>Datos financieros:</strong> gestionados exclusivamente por Stripe. Nomiextra nunca almacena números de tarjeta.</li>
            </ul>
          </SectionCard>

          <SectionCard id="s3" n="03" title="Finalidades del tratamiento">
            <p><strong>Finalidades primarias (necesarias para el servicio):</strong></p>
            <ul>
              <li>Darte acceso a la plataforma y a tus registros.</li>
              <li>Calcular nóminas, cotizaciones y reportes.</li>
              <li>Procesar pagos de suscripciones.</li>
              <li>Enviarte notificaciones relacionadas con tu cuenta.</li>
              <li>Cumplir obligaciones legales.</li>
            </ul>
            <p><strong>Finalidades secundarias (puedes oponerte):</strong></p>
            <ul>
              <li>Envío de información sobre nuevas funcionalidades.</li>
              <li>Mejoras estadísticas del producto (datos anonimizados).</li>
            </ul>
          </SectionCard>

          <SectionCard id="s4" n="04" title="Confidencialidad y seguridad">
            <p>Implementamos medidas técnicas, físicas y administrativas para proteger tus datos:</p>
            <ul>
              <li>Cifrado TLS 1.3 en tránsito y AES-256 en reposo.</li>
              <li>Row-Level Security (RLS) a nivel de base de datos — ningún usuario puede ver datos de otra empresa.</li>
              <li>Autenticación con proveedores de identidad (Google OAuth) y tokens de sesión seguros.</li>
              <li>Monitoreo continuo de accesos y respaldos cifrados diarios.</li>
              <li>Infraestructura alojada en proveedores con certificación ISO 27001 y SOC 2.</li>
            </ul>
          </SectionCard>

          <SectionCard id="s5" n="05" title="Transferencia de datos">
            <p>Solo transferimos datos a proveedores estrictamente necesarios para operar:</p>
            <ul>
              <li><strong>Supabase</strong> — almacenamiento de base de datos y autenticación.</li>
              <li><strong>Vercel</strong> — hospedaje de la aplicación.</li>
              <li><strong>Stripe</strong> — procesamiento de pagos.</li>
              <li><strong>Resend</strong> — envío de correos transaccionales.</li>
              <li><strong>Anthropic</strong> — procesamiento de IA para cuantificaciones (solo datos de obra, no datos personales).</li>
            </ul>
            <p>Todos tienen acuerdos de procesamiento de datos y cumplen estándares internacionales de privacidad. Nomiextra no vende ni comercializa datos a terceros.</p>
          </SectionCard>

          <SectionCard id="s6" n="06" title="Tus derechos ARCO">
            <p>Como titular de los datos tienes derecho a:</p>
            <ul>
              <li><strong>Acceder</strong> a tus datos personales almacenados en la plataforma.</li>
              <li><strong>Rectificar</strong> información incorrecta o desactualizada.</li>
              <li><strong>Cancelar</strong> el tratamiento de tus datos.</li>
              <li><strong>Oponerte</strong> a usos específicos, especialmente las finalidades secundarias.</li>
              <li><strong>Portabilidad:</strong> exportar toda tu información en formato Excel o PDF desde el dashboard.</li>
            </ul>
            <p>
              Para ejercer cualquier derecho envía un correo a <strong>contacto@nomiextra.mx</strong> con asunto &quot;Derechos ARCO&quot; y tu identificación oficial. Respondemos en un plazo máximo de 20 días hábiles.
            </p>
          </SectionCard>

          <SectionCard id="s7" n="07" title="Retención y eliminación">
            <p>Conservamos tus datos mientras tengas cuenta activa. Si cancelas, puedes exportar todo antes de proceder. Tras la cancelación eliminamos datos personales dentro de 90 días, excepto información que debamos retener por ley fiscal u obligaciones contractuales.</p>
          </SectionCard>

          <SectionCard id="s8" n="08" title="Cookies">
            <p>Usamos cookies estrictamente necesarias para mantener tu sesión iniciada y preferencias de uso. No usamos cookies publicitarias ni de seguimiento de terceros.</p>
          </SectionCard>

          <SectionCard id="s9" n="09" title="Menores de edad">
            <p>Nomiextra está dirigido a uso empresarial. No recabamos intencionalmente datos de menores de 18 años. Los trabajadores menores de edad solo pueden ser registrados por su empleador conforme a la Ley Federal del Trabajo.</p>
          </SectionCard>

          <SectionCard id="s10" n="10" title="Cambios al aviso">
            <p>Podemos actualizar este aviso de privacidad cuando sea necesario. Te notificaremos cambios importantes por correo electrónico y en la plataforma con al menos 15 días de anticipación.</p>
          </SectionCard>

          <SectionCard id="s11" n="11" title="Contacto">
            <p>Para cualquier duda sobre este aviso o para ejercer tus derechos, escríbenos a:</p>
            <p><strong>contacto@nomiextra.mx</strong></p>
          </SectionCard>

          {/* Footer link to terminos */}
          <div style={{ marginTop: 8, padding: '20px 24px', background: 'var(--cuero-200)', border: '1px solid var(--cuero-300)', borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' as const }}>
            <div>
              <p style={{ fontWeight: 500, fontSize: 14, color: 'var(--tinta)', marginBottom: 2 }}>Términos y Condiciones</p>
              <p style={{ fontSize: 12.5, color: 'var(--tinta-500)' }}>Reglas de uso del servicio Nomiextra</p>
            </div>
            <Link href="/terminos" style={{ display: 'inline-flex', alignItems: 'center', gap: 7, padding: '9px 18px', borderRadius: 9, background: 'var(--bosque-500)', color: 'var(--cuero-50)', textDecoration: 'none', fontSize: 13, fontWeight: 500 }}>
              Ver términos →
            </Link>
          </div>
        </main>
      </div>
    </div>
  )
}

function SectionCard({ id, n, title, children }: { id: string; n: string; title: string; children: React.ReactNode }) {
  return (
    <section id={id} style={{ background: 'var(--cuero-50)', border: '1px solid var(--cuero-300)', borderRadius: 14, padding: '28px 28px 24px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
        <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, fontWeight: 600, color: 'var(--bosque-500)', flexShrink: 0 }}>{n} /</span>
        <h2 style={{ fontFamily: 'Fraunces, Georgia, serif', fontWeight: 400, fontSize: 18, letterSpacing: '-0.01em', color: 'var(--tinta)', margin: 0 }}>{title}</h2>
      </div>
      <div style={{ fontSize: 14, color: 'var(--tinta-500)', lineHeight: 1.7 }}>
        {children}
      </div>
    </section>
  )
}
