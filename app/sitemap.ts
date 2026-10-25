import type { MetadataRoute } from 'next'

export default function sitemap(): MetadataRoute.Sitemap {
  const base = (process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000') + ''
  return [
    { url: base,                      lastModified: new Date(), changeFrequency: 'weekly',  priority: 1.0 },
    { url: `${base}/auth/login`,      lastModified: new Date(), changeFrequency: 'monthly', priority: 0.5 },
    { url: `${base}/auth/register`,   lastModified: new Date(), changeFrequency: 'monthly', priority: 0.7 },
    { url: `${base}/privacidad`,      lastModified: new Date(), changeFrequency: 'yearly',  priority: 0.2 },
    { url: `${base}/terminos`,        lastModified: new Date(), changeFrequency: 'yearly',  priority: 0.2 },
  ]
}
