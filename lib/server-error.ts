import * as Sentry from '@sentry/nextjs'

export function captureApiError(route: string, err: unknown, extra?: Record<string, unknown>) {
  const error = err instanceof Error ? err : new Error(String(err))
  Sentry.captureException(error, {
    tags: { route },
    extra,
  })
  console.error(`[${route}]`, error.message, extra ?? '')
}

// Non-error operational signals worth alerting on (spend spikes, abuse, degraded
// fallbacks). Emitted as warning-level so a Sentry alert rule on tag `anomaly`
// can route them to Telegram without mixing them in with crash reports.
export function reportAnomaly(area: string, message: string, extra?: Record<string, unknown>) {
  Sentry.captureMessage(message, {
    level: 'warning',
    tags: { anomaly: area },
    extra,
  })
  console.warn(`[anomaly:${area}] ${message}`, extra ?? '')
}
