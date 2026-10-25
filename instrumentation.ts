export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    await import('./sentry.server.config')
    const { validateEnv } = await import('./lib/env')
    validateEnv()
  }
  if (process.env.NEXT_RUNTIME === 'edge') {
    await import('./sentry.edge.config')
  }
}

export const onRequestError = async (
  err: unknown,
  request: unknown,
  context: unknown
) => {
  const { captureRequestError } = await import('@sentry/nextjs')
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  captureRequestError(err as any, request as any, context as any)
}
