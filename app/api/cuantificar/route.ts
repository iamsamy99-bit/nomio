import { NextResponse } from 'next/server'
import { createHash } from 'crypto'
import { createClient } from '@/lib/supabase/server'
import { callLLM } from '@/lib/llm-client'
import { createRateLimiter, createDailyLimiter } from '@/lib/rate-limit'
import { captureApiError, reportAnomaly } from '@/lib/server-error'
import { cacheGet, cacheSet } from '@/lib/redis-cache'

const CACHE_TTL = 86_400 // 24h

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 30

// Rate limits per tier (requests per minute)
const TIER_RPM: Record<string, number> = {
  gratuito: 2,
  basico:   4,
  pyme:     4,
  pro:      8,
  premium:  15,
}
const limiters: Record<string, ReturnType<typeof createRateLimiter>> = {}
function getLimiter(tier: string) {
  if (!limiters[tier]) limiters[tier] = createRateLimiter(TIER_RPM[tier] ?? 2, 60_000)
  return limiters[tier]
}

// Hard daily ceiling per empresa so a sustained drip of requests cannot burn the
// paid Claude fallback quota even while staying under the per-minute limit.
const dailyLimiter = createDailyLimiter(300)

const SYSTEM_PROMPT = `Eres un asistente experto en cuantificacion de obra para constructoras en Mexico.
El usuario describe un trabajo de construccion. Aunque la descripcion sea informal, compleja o incluya varios conceptos a la vez, SIEMPRE debes intentar calcular. Nunca regreses error si hay aunque sea una dimension o concepto identificable.

Tu tarea:
1. Identificar el concepto principal y estimar su cantidad en la unidad mas adecuada
2. Listar los materiales necesarios con cantidades y costos aproximados en MXN (precios mercado Mexico 2025, incluye 10% desperdicio en materiales volumetricos)
3. Si menciona mano de obra (albaniles, chalanes, etc.), incluirla como item en materiales con costo por jornal en MXN
4. Dar una recomendacion sobre lo que pudiera estar omitiendose

Responde UNICAMENTE con un objeto JSON valido, sin texto adicional, sin markdown, sin comentarios.

Estructura de respuesta exitosa:
{"cantidad":<numero>,"unidad":"<unidad>","descripcion":"<descripcion breve max 80 chars>","supuestos":"<supuestos usados separados por coma max 150 chars>","materiales":[{"nombre":"<nombre>","cantidad":<numero>,"unidad":"<unidad>","costo_unitario":<numero MXN>,"costo_total":<numero MXN>}],"costo_total_estimado":<numero MXN>,"recomendacion":"<aviso critico para el supervisor max 200 chars>"}

SOLO usa el path de error cuando la descripcion NO tiene absolutamente ninguna dimension, superficie, cantidad ni concepto de obra identificable (ej: texto completamente sin relacion a construccion):
{"error": "descripcion_insuficiente", "requerido": "<que informacion minima necesitas>"}

Reglas de calculo:
- Si el usuario da longitud x altura (ej: 7x3), calcula m2 o m3 segun el tipo de trabajo
- Para muros de block: calcula bloques segun grosor indicado; muro de 35cm ~ 2 bloques de 15cm con relleno, aprox 13 blocks/m2 por cara; ajusta a la medida real
- Para castillos/columnas de acero: calcula varilla, alambre recocido y concreto (fc=200) por ml
- Para mano de obra: incluye costo por jornal MXN (albanil ~$400/dia, chalan ~$250/dia); usa dias estimados segun el volumen de trabajo
- unidad debe ser una de: m2, m3, ml, pza, hr, dia, kg, ton, lt, servicio, lote, jgo, viaje, m
- materiales: maximo 6 items principales
- costo_total_estimado: suma de todos los costo_total incluyendo mano de obra
- Si hay ambiguedad, elige el supuesto mas comun en construccion mexicana y registralo en supuestos`

interface MaterialItem {
  nombre: string
  cantidad: number
  unidad: string
  costo_unitario: number
  costo_total: number
}

interface CuantificarResult {
  cantidad: number
  unidad: string
  descripcion: string
  supuestos: string
  materiales: MaterialItem[]
  costo_total_estimado: number
  recomendacion: string
}

interface CuantificarError {
  error: string
  requerido: string
}

function parseResponse(raw: string): CuantificarResult | CuantificarError | null {
  const text = raw.trim().replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```\s*$/i, '').trim()
  try {
    const parsed = JSON.parse(text)
    // Validate success shape
    if (
      typeof parsed === 'object' && parsed !== null &&
      !parsed.error &&
      typeof parsed.cantidad === 'number' && parsed.cantidad > 0 &&
      typeof parsed.unidad === 'string' && parsed.unidad.length > 0 &&
      typeof parsed.descripcion === 'string' &&
      typeof parsed.supuestos === 'string'
    ) {
      const rawMateriales = Array.isArray(parsed.materiales) ? parsed.materiales : []
      const materiales: MaterialItem[] = rawMateriales
        .filter((m: unknown) =>
          typeof m === 'object' && m !== null &&
          typeof (m as MaterialItem).nombre === 'string' &&
          typeof (m as MaterialItem).cantidad === 'number' &&
          typeof (m as MaterialItem).unidad === 'string' &&
          typeof (m as MaterialItem).costo_unitario === 'number' &&
          typeof (m as MaterialItem).costo_total === 'number'
        )
        .slice(0, 6)
        .map((m: MaterialItem) => ({
          nombre: String(m.nombre).slice(0, 60),
          cantidad: m.cantidad,
          unidad: String(m.unidad).slice(0, 15),
          costo_unitario: m.costo_unitario,
          costo_total: m.costo_total,
        }))
      return {
        cantidad: parsed.cantidad,
        unidad: String(parsed.unidad).slice(0, 20),
        descripcion: String(parsed.descripcion).slice(0, 100),
        supuestos: String(parsed.supuestos).slice(0, 200),
        materiales,
        costo_total_estimado: typeof parsed.costo_total_estimado === 'number' ? parsed.costo_total_estimado : 0,
        recomendacion: typeof parsed.recomendacion === 'string' ? String(parsed.recomendacion).slice(0, 250) : '',
      }
    }
    // Validate error shape
    if (
      typeof parsed === 'object' && parsed !== null &&
      typeof parsed.error === 'string' &&
      typeof parsed.requerido === 'string'
    ) {
      return {
        error: String(parsed.error).slice(0, 50),
        requerido: String(parsed.requerido).slice(0, 200),
      }
    }
    return null
  } catch {
    return null
  }
}

export async function POST(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  const { data: eu } = await supabase.from('empresa_users')
    .select('empresa_id, empresas(suscripcion_tier)')
    .eq('user_id', user.id)
    .eq('activo', true)
    .single()
  if (!eu) return NextResponse.json({ error: 'Empresa no encontrada' }, { status: 404 })

  // Supabase may return the embedded relation as an object or an array depending
  // on the join shape; normalize both so the tier is never silently lost.
  const empresaRel = Array.isArray(eu.empresas) ? eu.empresas[0] : eu.empresas
  const tier = (empresaRel as { suscripcion_tier?: string } | null)?.suscripcion_tier ?? 'gratuito'

  const rl = await getLimiter(tier).check(eu.empresa_id)
  if (!rl.allowed) {
    const rpm = TIER_RPM[tier] ?? 2
    return NextResponse.json(
      { error: `Límite de ${rpm} consultas por minuto alcanzado. Espera un momento e intenta de nuevo.` },
      { status: 429, headers: { 'Retry-After': String(rl.retryAfter) } }
    )
  }

  const daily = await dailyLimiter.check(`cuant-day:${eu.empresa_id}`)
  if (!daily.allowed) {
    reportAnomaly('spend.cuantificar', `Tope diario de cuantificaciones alcanzado (empresa ${eu.empresa_id})`, { tier })
    return NextResponse.json(
      { error: 'Alcanzaste el límite diario de cuantificaciones. Intenta de nuevo mañana.' },
      { status: 429, headers: { 'Retry-After': String(daily.retryAfter) } }
    )
  }

  let body: { descripcion?: string; contexto?: string }
  try { body = await req.json() } catch { return NextResponse.json({ error: 'JSON invalido' }, { status: 400 }) }

  const descripcion = typeof body.descripcion === 'string' ? body.descripcion.trim().slice(0, 800) : ''
  if (!descripcion) return NextResponse.json({ error: 'El campo descripcion es requerido.' }, { status: 400 })

  const userMessage = body.contexto
    ? `Proyecto/contexto: ${String(body.contexto).trim().slice(0, 200)}\n\n${descripcion}`
    : descripcion

  const cacheKey = `cuantificar:v1:${createHash('sha256').update(userMessage).digest('hex')}`

  try {
    const cached = await cacheGet(cacheKey)
    if (cached) {
      try {
        return NextResponse.json(JSON.parse(cached))
      } catch {
        // corrupt cache entry — fall through to LLM
      }
    }
  } catch {
    // cache unavailable — fall through to LLM
  }

  try {
    // Groq (Llama 3.3 70B) is primary for all tiers — free.
    // Claude fallback quality scales with tier.
    const claudeModel = tier === 'premium'
      ? 'claude-sonnet-4-6'
      : 'claude-haiku-4-5-20251001'

    const response = await callLLM({
      groqModel: 'llama-3.3-70b-versatile',
      claudeModel,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: userMessage }],
      maxTokens: 700,
    })

    const rawText = response.content?.[0]?.text ?? ''
    const parsed = parseResponse(rawText)

    if (!parsed) {
      captureApiError('cuantificar', new Error('unexpected response shape'), { rawText: rawText.slice(0, 200) })
      return NextResponse.json({ error: 'No se pudo interpretar la respuesta. Intenta reformular la descripcion.' }, { status: 422 })
    }

    // Only cache successful results (not error shapes)
    if (!('error' in parsed)) {
      cacheSet(cacheKey, JSON.stringify(parsed), CACHE_TTL).catch(() => {})
    }

    return NextResponse.json(parsed)
  } catch (err) {
    captureApiError('cuantificar', err)
    return NextResponse.json({ error: 'Error al procesar la solicitud. Intenta de nuevo.' }, { status: 500 })
  }
}
