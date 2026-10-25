import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { callLLM } from '@/lib/llm-client'
import { createRateLimiter, createDailyLimiter } from '@/lib/rate-limit'
import { captureApiError, reportAnomaly } from '@/lib/server-error'
import { MAX_TURNS_CONSULTOR } from '@/lib/constants'
import { cacheGet, cacheSet } from '@/lib/redis-cache'

const CTX_TTL = 180 // 3 min — empresa data rarely changes mid-conversation

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 30

const TIER_RPM: Record<string, number> = {
  gratuito: 3,
  basico:   6,
  pyme:     6,
  pro:      12,
  premium:  20,
}
const limiters: Record<string, ReturnType<typeof createRateLimiter>> = {}
function getLimiter(tier: string) {
  if (!limiters[tier]) limiters[tier] = createRateLimiter(TIER_RPM[tier] ?? 3, 60_000)
  return limiters[tier]
}

// Hard daily ceiling per empresa, on top of the per-minute limit, to cap paid
// Claude fallback usage from a sustained low-rate drip of requests.
const dailyLimiter = createDailyLimiter(300)

type ProyectoRow = { nombre: string; encargado: string; fecha_inicio: string | null; fecha_fin_estimada: string | null; activo: boolean }
type NominaRow = { numero_nomina: number; estado: string; fecha_inicio: string; fecha_fin: string; total_nomina: number; proyectos: { nombre: string } | null }

function buildDataContext(proyectos: ProyectoRow[] | null, nominas: NominaRow[] | null, trabajadoresCount: number | null): string {
  const lines: string[] = []
  if (proyectos && proyectos.length > 0) {
    lines.push('PROYECTOS:')
    proyectos.forEach(p => {
      const fechas = [p.fecha_inicio, p.fecha_fin_estimada].filter(Boolean).join(' – ')
      lines.push(`  • ${p.nombre} | ${p.encargado}${fechas ? ' | ' + fechas : ''} | ${p.activo ? 'Activo' : 'Inactivo'}`)
    })
  }
  if (nominas && nominas.length > 0) {
    lines.push('ÚLTIMAS NÓMINAS:')
    nominas.forEach(n => {
      const proj = (n.proyectos as { nombre: string } | null)?.nombre ?? '—'
      lines.push(`  • #${n.numero_nomina} ${proj} | ${n.fecha_inicio} – ${n.fecha_fin} | $${n.total_nomina.toLocaleString('es-MX')} | ${n.estado}`)
    })
  }
  if (trabajadoresCount !== null) {
    lines.push(`EQUIPO: ${trabajadoresCount} trabajador${trabajadoresCount === 1 ? '' : 'es'} activo${trabajadoresCount === 1 ? '' : 's'}`)
  }
  return lines.join('\n')
}

const SYSTEM_PROMPT = `Eres un consultor experto en construccion e ingenieria civil para Mexico.
Tienes conocimiento profundo de materiales, tecnicas constructivas, normativas mexicanas (NMX, NOM, RCF),
tipos de suelo, cimentaciones, alternativas de materiales, costos aproximados en MXN (2025) y ejecucion de obra.

Cuando el usuario pregunta sobre materiales, estructuras o tecnicas:
- Da la respuesta tecnica directa primero
- Lista ventajas y desventajas de cada opcion cuando haya alternativas
- Incluye costo relativo aproximado en MXN cuando sea util
- Advierte sobre riesgos estructurales o de seguridad cuando aplique
- Considera el contexto mexicano: disponibilidad de materiales, clima, tipos de suelo comunes

Si el usuario da dimensiones o contexto especifico, usalos para dar recomendaciones concretas.
Si la pregunta es ambigua, haz una suposicion razonable y mencionalas.

Responde en español, con tono tecnico pero accesible para arquitectos, supervisores y maestros albaniles.
Se conciso pero completo. Usa listas cuando ayude a la claridad. Maximo 400 palabras por respuesta.`

interface Message {
  role: 'user' | 'assistant'
  content: string
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
    return NextResponse.json(
      { error: `Límite de ${TIER_RPM[tier] ?? 3} consultas por minuto alcanzado.` },
      { status: 429, headers: { 'Retry-After': String(rl.retryAfter) } }
    )
  }

  const daily = await dailyLimiter.check(`consultor-day:${eu.empresa_id}`)
  if (!daily.allowed) {
    reportAnomaly('spend.consultor', `Tope diario de consultas alcanzado (empresa ${eu.empresa_id})`, { tier })
    return NextResponse.json(
      { error: 'Alcanzaste el límite diario de consultas. Intenta de nuevo mañana.' },
      { status: 429, headers: { 'Retry-After': String(daily.retryAfter) } }
    )
  }

  let body: { messages?: unknown[]; contexto?: string }
  try { body = await req.json() } catch { return NextResponse.json({ error: 'JSON inválido' }, { status: 400 }) }

  if (!Array.isArray(body.messages) || body.messages.length === 0) {
    return NextResponse.json({ error: 'Se requiere al menos un mensaje.' }, { status: 400 })
  }

  // Max 12 messages (6 turns), sanitize
  const sanitized: Message[] = (body.messages.slice(-12) as Message[])
    .filter(m =>
      typeof m === 'object' && m !== null &&
      (m.role === 'user' || m.role === 'assistant') &&
      typeof m.content === 'string'
    )
    .map(m => ({ role: m.role, content: String(m.content).slice(0, 1000) }))

  // The Anthropic Messages API requires strict user/assistant alternation; two
  // consecutive same-role turns return a 400 that would surface as an opaque 500.
  // Collapse runs of the same role by joining their content so the history is
  // always well-formed before it reaches the model.
  const messages: Message[] = sanitized.reduce<Message[]>((acc, m) => {
    const last = acc[acc.length - 1]
    if (last && last.role === m.role) {
      last.content = `${last.content}\n\n${m.content}`.slice(0, 1000)
    } else {
      acc.push({ ...m })
    }
    return acc
  }, [])

  if (messages.length === 0 || messages[messages.length - 1].role !== 'user') {
    return NextResponse.json({ error: 'El último mensaje debe ser del usuario.' }, { status: 400 })
  }

  // Enforce the per-conversation turn limit server-side. The client modal counts
  // user turns the same way, but that check can be bypassed by calling this API
  // directly, so the plan limit must also be enforced here.
  const maxTurns = MAX_TURNS_CONSULTOR[tier] ?? MAX_TURNS_CONSULTOR.gratuito
  const userTurns = messages.filter(m => m.role === 'user').length
  if (userTurns > maxTurns) {
    return NextResponse.json(
      { error: `Alcanzaste el límite de ${maxTurns} consultas por conversación de tu plan. Inicia una nueva conversación o mejora tu plan.` },
      { status: 403 },
    )
  }

  // The empresa data context (projects, recent payrolls, headcount) is rebuilt on
  // every message even though it barely changes within a conversation. Cache the
  // assembled string per empresa for a few minutes to skip 3 queries per turn.
  const ctxKey = `consultor-ctx:${eu.empresa_id}`
  let dataCtx: string | null = null
  try {
    dataCtx = await cacheGet(ctxKey)
  } catch {
    // cache unavailable — recompute below
  }

  if (dataCtx === null) {
    const [proyectosRes, nominasRes, trabajadoresRes] = await Promise.all([
      supabase.from('proyectos')
        .select('nombre, encargado, fecha_inicio, fecha_fin_estimada, activo')
        .eq('empresa_id', eu.empresa_id)
        .order('created_at', { ascending: false })
        .limit(8),
      supabase.from('periodos_nomina')
        .select('numero_nomina, estado, fecha_inicio, fecha_fin, total_nomina, proyectos(nombre)')
        .eq('empresa_id', eu.empresa_id)
        .order('created_at', { ascending: false })
        .limit(5),
      supabase.from('trabajadores')
        .select('id', { count: 'exact', head: true })
        .eq('empresa_id', eu.empresa_id)
        .eq('activo', true),
    ])

    dataCtx = buildDataContext(
      proyectosRes.data as ProyectoRow[] | null,
      nominasRes.data as NominaRow[] | null,
      trabajadoresRes.count,
    )
    cacheSet(ctxKey, dataCtx, CTX_TTL).catch(() => {})
  }

  let system = dataCtx
    ? `${SYSTEM_PROMPT}\n\nDATOS ACTUALES DE LA EMPRESA EN NOMIEXTRA:\n${dataCtx}\n\nSi el usuario pregunta sobre sus proyectos, nóminas o equipo, responde usando estos datos. No inventes cifras.`
    : SYSTEM_PROMPT

  if (body.contexto) {
    system += `\n\nContexto adicional del usuario:\n${String(body.contexto).trim().slice(0, 400)}`
  }

  try {
    const claudeModel = tier === 'premium' ? 'claude-sonnet-4-6' : 'claude-haiku-4-5-20251001'
    const response = await callLLM({
      groqModel: 'llama-3.3-70b-versatile',
      claudeModel,
      system,
      messages,
      maxTokens: 600,
    })

    const text = response.content?.[0]?.text ?? ''
    if (!text) {
      captureApiError('consultor', new Error('empty response'))
      return NextResponse.json({ error: 'Sin respuesta del modelo. Intenta de nuevo.' }, { status: 422 })
    }

    return NextResponse.json({ respuesta: text })
  } catch (err) {
    captureApiError('consultor', err)
    return NextResponse.json({ error: 'Error al procesar la consulta. Intenta de nuevo.' }, { status: 500 })
  }
}
