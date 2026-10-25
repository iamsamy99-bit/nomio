/**
 * Mapeo determinista de columnas a campos por sinónimos. Resuelve la mayoría
 * de los archivos sin tocar el LLM (clave para no gastar).
 */
import type { ImportSchema, FieldDef } from './schemas'

export const normHeader = (s: string) =>
  s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, ' ').trim()

export interface AutoMapResult {
  /** field.key -> header del archivo (o null si no se resolvió). */
  mapping: Record<string, string | null>
  missingRequired: FieldDef[]
  unmatchedHeaders: string[]
}

export function autoMapColumns(headers: string[], schema: ImportSchema): AutoMapResult {
  const normHeaders = headers.map(h => ({ raw: h, n: normHeader(h) }))
  const used = new Set<string>()
  const mapping: Record<string, string | null> = {}

  for (const field of schema.fields) {
    const syns = [normHeader(field.label), field.key, ...field.synonyms.map(normHeader)]
    let match: string | null = null

    // 1) coincidencia exacta
    for (const h of normHeaders) {
      if (used.has(h.raw)) continue
      if (syns.includes(h.n)) { match = h.raw; break }
    }
    // 2) coincidencia parcial (header contiene sinónimo o viceversa)
    if (!match) {
      for (const h of normHeaders) {
        if (used.has(h.raw)) continue
        if (syns.some(s => s.length >= 3 && (h.n.includes(s) || s.includes(h.n)))) { match = h.raw; break }
      }
    }
    if (match) used.add(match)
    mapping[field.key] = match
  }

  const missingRequired = schema.fields.filter(f => f.required && !mapping[f.key])
  const unmatchedHeaders = headers.filter(h => !used.has(h))
  return { mapping, missingRequired, unmatchedHeaders }
}
