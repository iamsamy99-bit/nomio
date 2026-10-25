import type { Metadata, Viewport } from 'next'
import './globals.css'
import ServiceWorkerRegister from '@/components/ServiceWorkerRegister'
import NativeInit from '@/components/NativeInit'
import { Toaster } from 'sonner'

export const metadata: Metadata = {
  title: 'Nomiextra — Nómina y asistencias para obra',
  description: 'Registra asistencias, calcula pagos y genera cotizaciones desde la obra. Para constructoras, arquitectos y contratistas mexicanos.',
  manifest: '/manifest.json',
  applicationName: 'Nomiextra',
  appleWebApp: { capable: true, statusBarStyle: 'black-translucent', title: 'Nomiextra' },
  icons: {
    icon: [
      { url: '/icon-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: [{ url: '/icon-192.png', sizes: '192x192' }],
  },
  openGraph: {
    title: 'Nomiextra — Nómina para la construcción',
    description: 'Registra asistencias, calcula pagos y genera cotizaciones desde la obra. Sin Excel, sin errores.',
    url: 'https://app.nomiextra.mx',
    siteName: 'Nomiextra',
    locale: 'es_MX',
    type: 'website',
    images: [{ url: '/og-image.png', width: 1200, height: 630, alt: 'Nomiextra — Nómina para la construcción' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Nomiextra — Nómina para la construcción',
    description: 'Registra asistencias, calcula pagos y genera cotizaciones desde la obra.',
    images: ['/og-image.png'],
  },
}

export const viewport: Viewport = {
  themeColor: '#1A2E37',
  colorScheme: 'light',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  viewportFit: 'cover',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,300;400;500;600;700&family=Inter+Tight:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500&family=DM+Sans:wght@400;500;600;700&family=Space+Grotesk:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;500&display=swap" rel="stylesheet" />
      </head>
      <body className="font-body antialiased">
        {children}
        <ServiceWorkerRegister />
        <NativeInit />
        <Toaster
          position="bottom-right"
          richColors
          toastOptions={{
            style: {
              fontFamily: "'Inter Tight', system-ui, sans-serif",
              fontSize: 14,
            },
          }}
        />
      </body>
    </html>
  )
}
