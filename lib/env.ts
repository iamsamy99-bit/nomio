// Server-only. Validates required env vars at startup so missing keys fail fast
// with a clear message instead of a cryptic runtime error deep in a route.

const REQUIRED = [
  'ANTHROPIC_API_KEY',
  'STRIPE_SECRET_KEY',
  'STRIPE_WEBHOOK_SECRET',
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
] as const

const OPTIONAL = [
  'GROQ_API_KEY',           // Llama fallback — degrades to Claude if absent
  'SENTRY_AUTH_TOKEN',      // Source map uploads — stack traces are minified without it
  'NOTION_TOKEN',           // Changelog sync — only needed in CI/admin flows
  'NOTION_DATABASE_ID',
  'STRIPE_BASICO_PRICE_ID',
  'STRIPE_PRO_PRICE_ID',
  'STRIPE_PREMIUM_PRICE_ID',
] as const

export function validateEnv(): void {
  const missing = REQUIRED.filter(k => !process.env[k]?.trim())
  const absent  = OPTIONAL.filter(k => !process.env[k]?.trim())

  if (missing.length) {
    const msg = `[env] Missing required env vars: ${missing.join(', ')}\nCopy .env.example to .env.local and fill them in.`
    if (process.env.NODE_ENV === 'production') {
      throw new Error(msg)
    } else {
      console.error('\x1b[31m' + msg + '\x1b[0m')
    }
  }

  if (absent.length) {
    console.warn(`[env] Optional env vars not set (features will degrade gracefully): ${absent.join(', ')}`)
  }
}
