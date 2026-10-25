/**
 * Convierte filas crudas + mapeo en registros tipados listos para insertar,
 * separando válidos de inválidos (con motivo) y deduplicando dentro del archivo.
 */
import { sanitizeText, hoyISO } from '@/lib/utils'
import type { ImportSchema, FieldDef } from './schemas'

export interface BuiltRow {
  data: Record<string, unknown>
  valid: boolean
  errors: string[]
}

function parseNumber(raw: string): number | null {
  if (raw == null || String(raw).trim() === '') return null
  const n = parseFloat(String(raw).replace(/[^0-9.,-]/g, '').replace(/\.(?=.*\.)/g, '').replace(',', '.'))
  return isNaN(n) ? null : n
}

function parseBoolean(raw: string): boolean {
  const v = String(raw).toLowerCase().trim()
  return ['si', 'sí', 'true', '1', 'x', 'verdadero', 'admin', 'administrativo', 'yes'].includes(v)
}

/** Normaliza fechas comunes (ISO, dd/mm/yyyy, dd-mm-yyyy) a YYYY-MM-DD. */
function parseDate(raw: string): string | null {
  const s = String(raw).trim()
  if (!s) return null
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10)
  const m = s.match(/^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{2,4})$/)
  if (m) {
    let [, d, mo, y] = m
    if (y.length === 2) y = `20${y}`
    const dd = d.padStart(2, '0')
    const mm = mo.padStart(2, '0')
    if (+mm >= 1 && +mm <= 12 && +dd >= 1 && +dd <= 31) return `${y}-${mm}-${dd}`
  }
  const t = Date.parse(s)
  return isNaN(t) ? null : new Date(t).toISOString().slice(0, 10)
}

function parseField(field: FieldDef, raw: string): { value: unknown; error?: string } {
  const has = raw != null && String(raw).trim() !== ''
  switch (field.type) {
    case 'number': {
      const n = parseNumber(raw)
      if (has && n === null) return { value: null, error: `${field.label}: número inválido ("${raw}")` }
      return { value: n }
    }
    case 'boolean':
      return { value: has ? parseBoolean(raw) : false }
    case 'date': {
      if (!has) return { value: null }
      const d = parseDate(raw)
      if (!d) return { value: null, error: `${field.label}: fecha inválida ("${raw}")` }
      return { value: d }
    }
    case 'enum': {
      if (!has) return { value: null }
      const norm = field.normalizeEnum ? field.normalizeEnum(raw) : raw
      if (norm && (!field.enumVals || field.enumVals.includes(norm))) return { value: norm }
      return { value: null, error: `${field.label}: valor no reconocido ("${raw}")` }
    }
    default:
      return { value: has ? sanitizeText(String(raw)) : null }
  }
}

/**
 * @param rows filas crudas (clave = encabezado del archivo, o clave de campo si vienen de PDF)
 * @param mapping field.key -> encabezado (identidad cuando vienen de PDF)
 */
export function buildRecords(
  rows: Record<string, string>[],
  mapping: Record<string, string | null>,
  schema: ImportSchema,
  fixed: Record<string, unknown> = {},
): BuiltRow[] {
  const seen = new Set<string>()

  return rows.map(row => {
    const data: Record<string, unknown> = { ...fixed }
    const errors: string[] = []

    for (const field of schema.fields) {
      const header = mapping[field.key]
      const raw = header ? (row[header] ?? '') : ''
      const { value, error } = parseField(field, String(raw))
      if (error) errors.push(error)
      if (value !== null && value !== undefined) data[field.key] = value
      if (field.required && (value === null || value === undefined || value === '')) {
        errors.push(`Falta ${field.label}`)
      }
    }

    // default de fecha para gastos
    for (const field of schema.fields) {
      if (field.type === 'date' && data[field.key] == null && field.key === 'fecha') {
        data[field.key] = hoyISO()
      }
    }

    // dedup dentro del archivo
    if (errors.length === 0 && schema.dedupeKey.length) {
      const sig = schema.dedupeKey.map(k => String(data[k] ?? '').toLowerCase().trim()).join('|')
      if (seen.has(sig)) errors.push('Duplicado en el archivo')
      else seen.add(sig)
    }

    return { data, valid: errors.length === 0, errors }
  })
}
