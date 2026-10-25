// @ts-check
const { withSentryConfig } = require('@sentry/nextjs')

// Host de Supabase derivado de la variable de entorno (sin hardcodear el proyecto).
const SUPABASE_HOST = (process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://your-project.supabase.co').replace(/^https?:\/\//, '')

/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: { ignoreDuringBuilds: true },
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '*.supabase.co', pathname: '/storage/v1/object/public/**' },
    ],
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(self), microphone=(self), geolocation=(self)' },
          { key: 'X-XSS-Protection', value: '0' },
          { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
          // Added https://*.ingest.sentry.io for error reporting
          { key: 'Content-Security-Policy', value: `default-src 'self'; script-src 'self' 'unsafe-inline' https://js.stripe.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; style-src-elem 'self' 'unsafe-inline' https://fonts.googleapis.com; frame-src https://js.stripe.com; connect-src 'self' https://${SUPABASE_HOST} wss://${SUPABASE_HOST} https://api.stripe.com; img-src 'self' data: blob: https://${SUPABASE_HOST}; font-src 'self' data: https://fonts.gstatic.com; media-src 'self' blob:; worker-src 'self' blob:; form-action 'self'; base-uri 'self'; frame-ancestors 'self';` },
        ],
      },
      {
        source: '/sw.js',
        headers: [
          { key: 'Content-Type', value: 'application/javascript; charset=utf-8' },
          { key: 'Cache-Control', value: 'no-cache, no-store, must-revalidate' },
          { key: 'Service-Worker-Allowed', value: '/' },
        ],
      },
      {
        source: '/manifest.json',
        headers: [
          { key: 'Content-Type', value: 'application/manifest+json' },
          { key: 'Cache-Control', value: 'public, max-age=3600' },
        ],
      },
      {
        // Marketing/construction photos never change at a given path; let the CDN
        // and browser hold them for a year so the landing renders from cache.
        source: '/atelier/:path*',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
        ],
      },
    ]
  },
}

module.exports = withSentryConfig(nextConfig, {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,

  // Silencia los logs del bundler en builds normales
  silent: !process.env.CI,

  // Sube source maps solo cuando SENTRY_AUTH_TOKEN esta disponible (CI/Vercel)
  authToken: process.env.SENTRY_AUTH_TOKEN,

  // Un fallo al subir source maps (ej. token expirado/401) NO debe romper el
  // build/deploy. Se registra como warning; los errores siguen llegando a Sentry,
  // solo sin source-mapping hasta que el token se renueve.
  errorHandler: (err) => {
    console.warn('[sentry] sourcemap upload skipped:', err.message)
  },

  // Borra source maps del output final (no los expone al publico)
  sourcemaps: {
    deleteSourcemapsAfterUpload: true,
  },

  // Tunneling: enruta eventos via tu propio dominio, evita adblockers
  tunnelRoute: '/monitoring-tunnel',

  // Desactiva logging excesivo en desarrollo
  disableLogger: true,

  // Permite builds aunque Sentry no este configurado (sin DSN)
  // Importante: no falla el build si NEXT_PUBLIC_SENTRY_DSN esta vacio
  widenClientFileUpload: true,
})
