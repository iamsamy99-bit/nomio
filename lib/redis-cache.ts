import { Redis } from '@upstash/redis'

const hasUpstash = !!(
  process.env.UPSTASH_REDIS_REST_URL &&
  process.env.UPSTASH_REDIS_REST_TOKEN
)

const redis = hasUpstash
  ? new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL!,
      token: process.env.UPSTASH_REDIS_REST_TOKEN!,
    })
  : null

// In-memory fallback with TTL (resets on cold start)
const memCache = new Map<string, { value: string; expiresAt: number }>()

export async function cacheGet(key: string): Promise<string | null> {
  if (redis) {
    const val = await redis.get<string>(key)
    return val ?? null
  }
  const entry = memCache.get(key)
  if (!entry || Date.now() > entry.expiresAt) {
    if (entry) memCache.delete(key)
    return null
  }
  return entry.value
}

export async function cacheSet(key: string, value: string, ttlSeconds: number): Promise<void> {
  if (redis) {
    await redis.set(key, value, { ex: ttlSeconds })
    return
  }
  memCache.set(key, { value, expiresAt: Date.now() + ttlSeconds * 1000 })
}

export async function cacheDel(key: string): Promise<void> {
  if (redis) {
    await redis.del(key)
    return
  }
  memCache.delete(key)
}
