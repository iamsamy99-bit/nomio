import type { Metadata } from 'next'
import { NOMIO_AI_HTML } from '@/components/landing/nomio/ai-markup'

export const metadata: Metadata = {
  title: 'Nomiextra AI — El asistente de obra inteligente',
  description:
    'Pregúntale a Nomiextra AI como le hablarías a tu maestro de obra. Cierra nóminas, revisa asistencias y crea cotizaciones con un mensaje. Sin Excel, sin reportes.',
  alternates: { canonical: 'https://app.nomiextra.mx/nomiextra-ai' },
  openGraph: {
    title: 'Nomiextra AI — Tu obra, en palabras.',
    description:
      'Escribe lo que necesitas saber y Nomiextra AI lo busca en tus datos reales. Nóminas, asistencias, costos y cotizaciones — sin fórmulas, sin reportes.',
    url: 'https://app.nomiextra.mx/nomiextra-ai',
    siteName: 'Nomiextra',
    locale: 'es_MX',
    type: 'website',
    images: [{ url: '/og-image.png', width: 1200, height: 630, alt: 'Nomiextra AI — Asistente de obra inteligente' }],
  },
}

export default function NomiextraAIPage() {
  return <div dangerouslySetInnerHTML={{ __html: NOMIO_AI_HTML }} />
}
