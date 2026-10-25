import { sanitizeText } from '@/lib/utils'
import { normalizeTipoContacto } from '@/lib/crm/contacto-meta'
import type { TipoContacto } from '@/types'

export type ClienteImportRow = {
  nombre: string
  tipo: TipoContacto
  email: string | null
  telefono: string | null
  direccion: string | null
  empresa_cliente: string | null
  puesto: string | null
  notas: string | null
}

function cell(row: Record<string, unknown>, ...keys: string[]): string {
  for (const k of keys) {
    const v = row[k]
    if (v != null && String(v).trim()) return String(v).trim()
  }
  return ''
}

/** Mapea filas de Excel/CSV a contactos. Columnas flexibles en espanol. */
export function mapContactoRows(rows: Record<string, unknown>[]): ClienteImportRow[] {
  return rows
    .map((r) => {
      const nombre = sanitizeText(
        cell(r, 'Nombre', 'nombre', 'Cliente', 'cliente', 'Name', 'Empresa', 'empresa')
      )
      if (!nombre) return null
      const email = cell(r, 'Email', 'email', 'Correo', 'correo') || null
      const telefono = cell(r, 'Telefono', 'Teléfono', 'telefono', 'Phone', 'phone') || null
      const direccion = cell(r, 'Direccion', 'Dirección', 'direccion', 'Address') || null
      const empresa_cliente = cell(r, 'Empresa', 'empresa', 'Compania', 'Compañía') || null
      const puesto = cell(r, 'Puesto', 'puesto', 'Cargo', 'cargo') || null
      const notas = cell(r, 'Notas', 'notas', 'Notes') || null
      const tipoRaw = cell(r, 'Tipo', 'tipo', 'Categoria', 'Categoría', 'Rol')
      const tipo = tipoRaw ? normalizeTipoContacto(tipoRaw) : 'cliente'
      return { nombre, tipo, email, telefono, direccion, empresa_cliente, puesto, notas }
    })
    .filter((x): x is ClienteImportRow => x !== null)
}

/** Parse basico de vCard (.vcf): FN, EMAIL, TEL, ADR. */
export function parseVCardText(text: string): ClienteImportRow[] {
  const cards = text.split(/BEGIN:VCARD/i).slice(1)
  const out: ClienteImportRow[] = []

  for (const block of cards) {
    let nombre = ''
    let email: string | null = null
    let telefono: string | null = null
    let direccion: string | null = null

    for (const line of block.split(/\r?\n/)) {
      const upper = line.toUpperCase()
      if (upper.startsWith('FN') || upper.startsWith('N:')) {
        const val = line.split(':').slice(1).join(':').trim()
        if (upper.startsWith('FN')) nombre = sanitizeText(val)
        else if (!nombre) {
          const parts = val.split(';').filter(Boolean)
          nombre = sanitizeText(parts.reverse().join(' '))
        }
      } else if (upper.startsWith('EMAIL')) {
        email = line.split(':').slice(1).join(':').trim() || null
      } else if (upper.startsWith('TEL')) {
        telefono = line.split(':').slice(1).join(':').replace(/[^\d+]/g, '').trim() || null
      } else if (upper.startsWith('ADR')) {
        direccion = line.split(':').slice(1).join(':').replace(/;/g, ', ').trim() || null
      }
    }

    if (nombre) out.push({ nombre, tipo: 'cliente', email, telefono, direccion, empresa_cliente: null, puesto: null, notas: null })
  }

  return out
}
