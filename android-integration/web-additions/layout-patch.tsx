/**
 * PATCH para app/layout.tsx
 *
 * Este archivo NO reemplaza tu layout — muestra exactamente qué líneas
 * agregar al `app/layout.tsx` existente para habilitar:
 *   - PWA manifest
 *   - theme-color y meta iOS/Android
 *   - Registro del Service Worker
 *   - Apple touch icons
 *
 * Diferencias respecto al layout actual marcadas con  // ← AGREGAR
 */

import type { Metadata, Viewport } from 'next'
import './globals.css'
import ServiceWorkerRegister from '@/components/ServiceWorkerRegister' // ← AGREGAR (crear este component)

export const metadata: Metadata = {
  title: 'Nomio — Control de Nóminas y Cotizaciones',
  description: 'Plataforma SaaS para control de nóminas, asistencias, cotizaciones y proyectos',
  // ← AGREGAR bloque completo "manifest" y "appleWebApp"
  manifest: '/manifest.json',
  applicationName: 'Nomio',
  appleWebApp: {
    capable: true,
    title: 'Nomio',
    statusBarStyle: 'black-translucent',
  },
  formatDetection: { telephone: false },
  icons: {
    icon: [
      { url: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: [{ url: '/icons/apple-touch-icon.png', sizes: '180x180' }],
  },
}

// ← AGREGAR export viewport (Next.js 15 lo separa del metadata)
export const viewport: Viewport = {
  themeColor: '#0A0A0A',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=IBM+Plex+Sans:wght@400;500;600&family=IBM+Plex+Mono:wght@400;500&display=swap" rel="stylesheet" />
      </head>
      <body className="font-body bg-bg text-gray-900 antialiased">
        {children}
        <ServiceWorkerRegister /> {/* ← AGREGAR */}
      </body>
    </html>
  )
}
