import * as Sentry from '@sentry/nextjs'

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.NODE_ENV,

  // Capture 10% of traces in prod, 100% in dev
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,

  // Capture 5% of session replays in prod
  replaysSessionSampleRate: 0.05,
  replaysOnErrorSampleRate: 1.0,

  integrations: [
    Sentry.replayIntegration({
      maskAllText: true,
      blockAllMedia: true,
    }),
  ],

  // Don't capture errors from browser extensions or cross-origin scripts
  ignoreErrors: [
    'ResizeObserver loop limit exceeded',
    'ResizeObserver loop completed with undelivered notifications',
    /^Network request failed/,
    /^Failed to fetch/,
  ],

  beforeSend(event) {
    // Strip PII from request URLs
    if (event.request?.url) {
      try {
        const url = new URL(event.request.url)
        url.searchParams.delete('email')
        url.searchParams.delete('token')
        event.request.url = url.toString()
      } catch { /* ignore invalid URLs */ }
    }
    return event
  },
})
