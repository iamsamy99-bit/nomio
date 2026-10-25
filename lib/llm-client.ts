// Unified LLM client: tries Groq (Llama) first, falls back to Claude.
// Drop-in replacement for callAnthropic — returns the same response shape.

import * as Sentry from '@sentry/nextjs'
import { callGroq } from './groq-client'
import { callAnthropic, type AnthropicMessage, type AnthropicResponse } from './anthropic-client'

interface LLMOptions {
  /** Groq model to try first. If omitted or GROQ_API_KEY is absent, goes straight to Claude. */
  groqModel?: string
  /** Claude model for fallback. Defaults to claude-haiku-4-5-20251001. */
  claudeModel?: string
  maxTokens?: number
  system?: string
  messages: AnthropicMessage[]
}

export async function callLLM(opts: LLMOptions): Promise<AnthropicResponse> {
  if (opts.groqModel && process.env.GROQ_API_KEY) {
    try {
      const result = await callGroq({
        model: opts.groqModel,
        maxTokens: opts.maxTokens,
        system: opts.system,
        messages: opts.messages,
      })
      return {
        id: 'groq',
        content: result.content,
        stop_reason: 'end_turn',
        usage: { input_tokens: 0, output_tokens: 0 },
      }
    } catch (err) {
      // Groq is the primary LLM for all tiers; surface outages in Sentry (as a
      // warning, since Claude fallback keeps the request working) instead of a
      // silent console.warn.
      Sentry.captureException(err, {
        level: 'warning',
        tags: { area: 'llm.groq_fallback', groqModel: opts.groqModel ?? 'none' },
      })
    }
  }

  return callAnthropic({
    model: opts.claudeModel ?? 'claude-haiku-4-5-20251001',
    maxTokens: opts.maxTokens,
    system: opts.system,
    messages: opts.messages,
  })
}
