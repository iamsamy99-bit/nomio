/**
 * PATCH sugerido para next.config.js
 *
 * Cambios clave:
 *  1. `Permissions-Policy` actual BLOQUEA camera/mic/geolocation. Para
 *     asistencias con foto y validación por ubicación hay que permitirlos
 *     al mismo origin.
 *  2. Agregar headers para que el Service Worker tenga scope "/".
 *  3. Rutas sin-cache para /sw.js (de lo contrario Vercel cachea la versión
 *     vieja y las actualizaciones del SW nunca llegan).
 */

/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: { ignoreBuildErrors: true },
  eslint: { ignoreDuringBuilds: true },

  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          // ANTES: 'camera=(), microphone=(), geolocation=()'  ← bloqueaba todo
          // AHORA: habilitar al origin propio y permitir en APK (self)
          { key: 'Permissions-Policy', value: 'camera=(self), microphone=(self), geolocation=(self)' },
          { key: 'X-XSS-Protection', value: '0' },
        ],
      },
      {
        // Service Worker debe tener Service-Worker-Allowed header y NO cachearse
        source: '/sw.js',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=0, must-revalidate' },
          { key: 'Service-Worker-Allowed', value: '/' },
          { key: 'Content-Type', value: 'application/javascript; charset=utf-8' },
        ],
      },
      {
        source: '/manifest.json',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=3600' },
          { key: 'Content-Type', value: 'application/manifest+json; charset=utf-8' },
        ],
      },
    ]
  },
}

module.exports = nextConfig
