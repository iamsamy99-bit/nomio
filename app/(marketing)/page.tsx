import type { Metadata } from 'next'
import { NOMIO_HTML } from '@/components/landing/nomio/markup'

export const metadata: Metadata = {
  title: 'Nomiextra | Software de Nómina para Obras en México — Sin Excel',
  description:
    'Nomiextra es el software de nómina, asistencias y cotizaciones para constructoras y arquitectos en México. Asistencias offline, nómina semanal y un asistente con IA. Prueba gratis 14 días.',
  alternates: { canonical: 'https://app.nomiextra.mx/' },
  openGraph: {
    title: 'Nomiextra — Nómina de obra, sin papeleo',
    description:
      'Asistencias offline, nómina semanal en 3 minutos, cotizaciones con tu logo y un asistente con IA que entiende tu obra. Sin Excel.',
    url: 'https://app.nomiextra.mx',
    siteName: 'Nomiextra',
    locale: 'es_MX',
    type: 'website',
    images: [{ url: '/og-image.png', width: 1200, height: 630, alt: 'Nomiextra — Nómina para la construcción' }],
  },
}

const SCHEMA = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'Organization',
      name: 'Nomiextra',
      url: 'https://app.nomiextra.mx/',
      logo: 'https://app.nomiextra.mx/icon-512.png',
      description: 'Software de nómina, asistencias y cotizaciones para constructoras y arquitectos en México.',
      areaServed: 'MX',
      sameAs: ['https://instagram.com/nomio.mx', 'https://linkedin.com/company/nomio'],
    },
    {
      '@type': 'SoftwareApplication',
      name: 'Nomiextra',
      applicationCategory: 'BusinessApplication',
      operatingSystem: 'Web, Android, Windows',
      offers: [
        { '@type': 'Offer', name: 'Plan Gratuito', price: '0', priceCurrency: 'MXN' },
        { '@type': 'Offer', name: 'Plan PYME', price: '299', priceCurrency: 'MXN' },
      ],
      description: 'Nómina semanal, asistencias offline, cotizaciones PDF y asistente con IA para obra en México. Sin Excel.',
    },
  ],
}

export default function HomePage() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(SCHEMA) }} />
      <div dangerouslySetInnerHTML={{ __html: NOMIO_HTML }} />
    </>
  )
}
