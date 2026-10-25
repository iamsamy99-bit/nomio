import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { callLLM } from '@/lib/llm-client'
import { createRateLimiter } from '@/lib/rate-limit'
import { captureApiError } from '@/lib/server-error'
import { createHash } from 'crypto'
import { cacheGet, cacheSet } from '@/lib/redis-cache'
import type { ImportColumnMapping } from '@/types/wizard'

const CACHE_TTL = 86_400 // 24h — same file structure maps to the same columns

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// 10 requests per 5 minutes per empresa (one per file upload)
const limiter = createRateLimiter(10, 5 * 60_000)

interface RequestBody {
  headers: string[]
  sampleRows: Record<string, string>[]
  trabajadores: { id: string; nombre: string }[]
}

// POST /api/payroll/import-map
// Sends file headers + sample rows to Claude and returns a column mapping.
export async function POST(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  const { data: eu } = await supabase.from('empresa_users')
    .select('empresa_id').eq('user_id', user.id).eq('activo', true).single()
  if (!eu) return NextResponse.json({ error: 'Empresa no encontrada' }, { status: 404 })

  const rl = await limiter.check(eu.empresa_id)
  if (!rl.allowed) {
    return NextResponse.json(
      { error: 'Límite de importaciones alcanzado. Espera un momento e intenta de nuevo.' },
      { status: 429, headers: { 'Retry-After': String(rl.retryAfter) } }
    )
  }

  let body: RequestBody
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'JSON inválido' }, { status: 400 })
  }

  const { headers, sampleRows, trabajadores } = body
  if (!headers?.length) {
    return NextResponse.json({ error: 'No se recibieron encabezados' }, { status: 400 })
  }

  const systemPrompt = `You map columns from an uploaded payroll file to a schema.
Return ONLY valid JSON matching exactly this schema, no explanation, no markdown fences:
{
  "format": "wide" or "long",
  "workerCol": "<header that contains the worker name>",
  "dateCol": "<header for date, only if format is long>",
  "hoursCol": "<header for hours, only if format is long>",
  "dateCols": ["<date-like column headers>"] // only if format is wide
}

Wide format: one row per worker, date headers as columns.
Long format: one row per day (worker, date, hours in separate columns).

Rules:
- dateCols should only include columns that look like dates (e.g. "2025-01-01", "01/01", "lun 01", "1")
- Do not include the worker name column or totals columns in dateCols
- If dates in dateCols do not have a year, they will be inferred from context
- For wide format always return dateCols with at least one header
- For long format always return dateCol and hoursCol`

  const prompt = `File headers: ${JSON.stringify(headers)}
Sample rows (up to 5): ${JSON.stringify(sampleRows)}
Known worker names: ${JSON.stringify(trabajadores.map(t => t.nombre))}`

  // Same file structure (headers + sample values) maps to the same columns, so
  // cache the result and skip the LLM call on repeated uploads of the same layout.
  const cacheKey = `import-map:v1:${createHash('sha256').update(JSON.stringify({ headers, sampleRows })).digest('hex')}`
  try {
    const cached = await cacheGet(cacheKey)
    if (cached) return NextResponse.json(JSON.parse(cached))
  } catch {
    // cache unavailable — fall through to the LLM
  }

  try {
    const response = await callLLM({
      groqModel: 'llama-3.3-70b-versatile',
      claudeModel: 'claude-haiku-4-5-20251001',
      maxTokens: 512,
      system: systemPrompt,
      messages: [{ role: 'user', content: prompt }],
    })

    const text = response.content[0]?.text?.trim() ?? ''
    const parsed = JSON.parse(text) as Partial<ImportColumnMapping>

    // The model output is untrusted: a wrong workerCol or a missing dateCols
    // silently corrupts the entire import, so validate the shape before trusting it.
    const formatOk = parsed.format === 'wide' || parsed.format === 'long'
    const workerOk = typeof parsed.workerCol === 'string' && headers.includes(parsed.workerCol)
    const wideOk = parsed.format === 'wide' &&
      Array.isArray(parsed.dateCols) &&
      parsed.dateCols.length > 0 &&
      parsed.dateCols.every(c => typeof c === 'string' && headers.includes(c))
    const longOk = parsed.format === 'long' &&
      typeof parsed.dateCol === 'string' && headers.includes(parsed.dateCol) &&
      typeof parsed.hoursCol === 'string' && headers.includes(parsed.hoursCol)

    if (!formatOk || !workerOk || (parsed.format === 'wide' ? !wideOk : !longOk)) {
      captureApiError('import-map', new Error('invalid mapping shape'), { rawText: text.slice(0, 200) })
      return NextResponse.json(
        { error: 'No se pudo determinar el mapeo de columnas. Revisa que el archivo tenga nombres y fechas.' },
        { status: 422 },
      )
    }

    const mapping: ImportColumnMapping = parsed.format === 'wide'
      ? { format: 'wide', workerCol: parsed.workerCol!, dateCols: parsed.dateCols! }
      : { format: 'long', workerCol: parsed.workerCol!, dateCol: parsed.dateCol!, hoursCol: parsed.hoursCol! }
    cacheSet(cacheKey, JSON.stringify(mapping), CACHE_TTL).catch(() => {})
    return NextResponse.json(mapping)
  } catch (err) {
    captureApiError('import-map', err)
    return NextResponse.json({ error: 'No se pudo determinar el mapeo de columnas' }, { status: 500 })
  }
}
