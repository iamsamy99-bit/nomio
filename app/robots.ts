import type { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: ['/', '/auth/login', '/auth/register', '/privacidad', '/terminos'],
        disallow: ['/dashboard/', '/api/', '/auth/callback', '/onboarding/'],
      },
    ],
    sitemap: (process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000') + '/sitemap.xml',
  }
}
