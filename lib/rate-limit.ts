import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'
import * as Sentry from '@sentry/nextjs'

const hasUpstash = !!(
  process.env.UPSTASH_REDIS_REST_URL &&
  process.env.UPSTASH_REDIS_REST_TOKEN
)

// In production the in-memory fallback is effectively no rate limiting: each
// serverless instance keeps its own Map and it resets on every cold start, so
// the real ceiling is limit x instances. Surface that loudly instead of letting
// paid endpoints (AI, email, checkout) run uncapped in silence.
if (!hasUpstash && process.env.NODE_ENV === 'production') {
  Sentry.captureMessage(
    'rate-limit: UPSTASH_REDIS_REST_URL/TOKEN missing — falling back to in-memory limiter, which does NOT enforce limits across serverless instances',
    'warning',
  )
}

interface RateResult { allowed: boolean; retryAfter?: number }
interface Bucket { count: number; resetAt: number }

export function createRateLimiter(limit: number, windowMs: number) {
  if (hasUpstash) {
    const redis = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL!,
      token: process.env.UPSTASH_REDIS_REST_TOKEN!,
    })
    const rl = new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(limit, `${windowMs} ms`),
      analytics: false,
    })
    return {
      async check(key: string): Promise<RateResult> {
        const { success, reset } = await rl.limit(key)
        return { allowed: success, retryAfter: Math.ceil((reset - Date.now()) / 1000) }
      },
    }
  }

  // In-memory fallback — resets on cold start, used when Upstash env vars are absent
  const map = new Map<string, Bucket>()
  return {
    async check(key: string): Promise<RateResult> {
      const now = Date.now()
      const bucket = map.get(key)
      if (!bucket || now > bucket.resetAt) {
        map.set(key, { count: 1, resetAt: now + windowMs })
        return { allowed: true }
      }
      if (bucket.count >= limit) {
        return { allowed: false, retryAfter: Math.ceil((bucket.resetAt - now) / 1000) }
      }
      bucket.count++
      return { allowed: true }
    },
  }
}

// Hard daily ceiling per empresa, on top of the per-minute limiter. The per-minute
// limit stops bursts; this stops sustained abuse that would burn paid quota (Claude
// fallback, Resend emails) over a full day. Callers MUST pass a key string that is
// distinct from their per-minute key (e.g. `cuant-day:${empresaId}`) so the two
// limiters do not share the same Redis bucket.
const DAY_MS = 24 * 60 * 60 * 1000
export function createDailyLimiter(limit: number) {
  return createRateLimiter(limit, DAY_MS)
}
