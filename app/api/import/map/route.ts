import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { callGroq } from '@/lib/groq-client'
import { createRateLimiter } from '@/lib/rate-limit'
import { captureApiError } from '@/lib/server-error'
import { createHash } from 'crypto'
import { cacheGet, cacheSet } from '@/lib/redis-cache'
import { getSchema } from '@/lib/import/schemas'

const CACHE_TTL = 86_400 // 24h — misma estructura mapea igual
const GROQ_MODEL = 'llama-3.3-70b-versatile'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// 15 importaciones por 5 min por empresa
const limiter = createRateLimiter(15, 5 * 60_000)

interface RequestBody {
  entity: string
  // modo tabular
  headers?: string[]
  sampleRows?: Record<string, string>[]
  missingFields?: string[]
  // modo pdf-texto
  pdfText?: string
}

// POST /api/import/map — mapeo/extracción con el modelo GRATIS (Groq).
// Nunca llama a Claude: si Groq falla, devuelve 503 para reintentar o mapear a mano.
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
      { error: 'Límite de importaciones alcanzado. Espera un momento.' },
      { status: 429, headers: { 'Retry-After': String(rl.retryAfter) } },
    )
  }

  let body: RequestBody
  try { body = await req.json() } catch { return NextResponse.json({ error: 'JSON inválido' }, { status: 400 }) }

  const schema = getSchema(body.entity)
  if (!schema) return NextResponse.json({ error: 'Entidad no válida' }, { status: 400 })

  if (!process.env.GROQ_API_KEY) {
    return NextResponse.json(
      { error: 'El asistente gratuito no está configurado. Mapea las columnas a mano.' },
      { status: 503 },
    )
  }

  const fieldKeys = schema.fields.map(f => f.key)
  const isPdf = typeof body.pdfText === 'string' && body.pdfText.trim().length > 0

  const cacheKey = `import-map:v1:${body.entity}:${createHash('sha256')
    .update(JSON.stringify(isPdf ? { pdf: body.pdfText } : { h: body.headers, s: body.sampleRows, m: body.missingFields }))
    .digest('hex')}`
  try {
    const cached = await cacheGet(cacheKey)
    if (cached) return NextResponse.json(JSON.parse(cached))
  } catch { /* sin caché: seguir */ }

  try {
    if (isPdf) {
      const system = `Extraes registros estructurados de un texto. Devuelve SOLO JSON válido, sin explicación ni markdown:
{"rows":[{"<campo>":"<valor>"}]}
Usa únicamente estas claves de campo: ${JSON.stringify(fieldKeys)}.
Un objeto por registro encontrado. Omite los campos que no encuentres. No inventes datos.`
      const prompt = `Campos: ${JSON.stringify(schema.fields.map(f => ({ key: f.key, label: f.label })))}
Texto del documento:
${body.pdfText!.slice(0, 12_000)}`

      const res = await callGroq({ model: GROQ_MODEL, maxTokens: 2048, system, messages: [{ role: 'user', content: prompt }] })
      const parsed = JSON.parse((res.content[0]?.text ?? '').trim()) as { rows?: Record<string, unknown>[] }
      const rows = Array.isArray(parsed.rows)
        ? parsed.rows.map(r => {
            const clean: Record<string, string> = {}
            for (const k of fieldKeys) if (r[k] != null) clean[k] = String(r[k])
            return clean
          }).filter(r => Object.keys(r).length > 0)
        : []
      const out = { rows }
      cacheSet(cacheKey, JSON.stringify(out), CACHE_TTL).catch(() => {})
      return NextResponse.json(out)
    }

    // modo tabular
    const headers = body.headers ?? []
    const targets = (body.missingFields?.length ? body.missingFields : fieldKeys)
      .map(k => schema.fields.find(f => f.key === k))
      .filter((f): f is NonNullable<typeof f> => !!f)
    if (!headers.length) return NextResponse.json({ error: 'No se recibieron encabezados' }, { status: 400 })

    const system = `Mapeas campos destino a los encabezados de un archivo. Devuelve SOLO JSON válido, sin explicación ni markdown:
{"mapping":{"<campoKey>":"<encabezado o null>"}}
Usa exactamente los encabezados provistos (o null si ninguno corresponde). Mapea solo los campos solicitados.`
    const prompt = `Campos a mapear: ${JSON.stringify(targets.map(f => ({ key: f.key, label: f.label, ejemplos: f.synonyms.slice(0, 4) })))}
Encabezados del archivo: ${JSON.stringify(headers)}
Filas de muestra: ${JSON.stringify((body.sampleRows ?? []).slice(0, 5))}`

    const res = await callGroq({ model: GROQ_MODEL, maxTokens: 512, system, messages: [{ role: 'user', content: prompt }] })
    const parsed = JSON.parse((res.content[0]?.text ?? '').trim()) as { mapping?: Record<string, unknown> }
    const mapping: Record<string, string> = {}
    for (const f of targets) {
      const v = parsed.mapping?.[f.key]
      if (typeof v === 'string' && headers.includes(v)) mapping[f.key] = v
    }
    const out = { mapping }
    cacheSet(cacheKey, JSON.stringify(out), CACHE_TTL).catch(() => {})
    return NextResponse.json(out)
  } catch (err) {
    captureApiError('import-map-universal', err, { entity: body.entity })
    return NextResponse.json(
      { error: 'El asistente gratuito no está disponible ahora. Intenta de nuevo o mapea las columnas a mano.' },
      { status: 503 },
    )
  }
}
