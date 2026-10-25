// Thin wrapper around the Anthropic Messages API using plain fetch.
// No SDK dependency — keeps the bundle lean and avoids version churn.

export interface AnthropicMessage {
  role: 'user' | 'assistant'
  content: string
}

export interface AnthropicResponse {
  id: string
  content: Array<{ type: string; text: string }>
  stop_reason: string
  usage: { input_tokens: number; output_tokens: number }
}

interface AnthropicOptions {
  model?: string
  maxTokens?: number
  system?: string
  messages: AnthropicMessage[]
}

export async function callAnthropic(opts: AnthropicOptions): Promise<AnthropicResponse> {
  const apiKey = process.env.ANTHROPIC_API_KEY?.trim()
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY not configured')

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: opts.model ?? 'claude-sonnet-4-6',
      max_tokens: opts.maxTokens ?? 512,
      system: opts.system,
      messages: opts.messages,
    }),
  })

  if (!res.ok) {
    // Never log the key — only log status
    console.error('anthropic-client: request failed', { status: res.status })
    throw new Error(`Anthropic API error ${res.status}`)
  }

  return res.json() as Promise<AnthropicResponse>
}
