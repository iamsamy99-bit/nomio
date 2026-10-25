// Thin wrapper around the Groq chat completions API (OpenAI-compatible).
// Returns content in the same shape as anthropic-client for drop-in use.

interface GroqOptions {
  model: string
  maxTokens?: number
  system?: string
  messages: { role: 'user' | 'assistant'; content: string }[]
}

export async function callGroq(opts: GroqOptions): Promise<{ content: Array<{ type: string; text: string }> }> {
  const apiKey = process.env.GROQ_API_KEY?.trim()
  if (!apiKey) throw new Error('GROQ_API_KEY not configured')

  const messages: { role: string; content: string }[] = opts.system
    ? [{ role: 'system', content: opts.system }, ...opts.messages]
    : [...opts.messages]

  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: opts.model,
      max_tokens: opts.maxTokens ?? 512,
      messages,
    }),
    // Cap Groq at 8s so a slow/hung primary leaves room for the Claude fallback
    // to complete within the route's 30s maxDuration instead of timing out.
    signal: AbortSignal.timeout(8_000),
  })

  if (!res.ok) {
    // The caller (llm-client) reports this to Sentry on fallback; the status is
    // carried in the thrown error so there is a single reporting point.
    throw new Error(`Groq API error ${res.status}`)
  }

  const data = await res.json() as { choices: { message: { content: string } }[] }
  const text = data.choices?.[0]?.message?.content ?? ''
  return { content: [{ type: 'text', text }] }
}
