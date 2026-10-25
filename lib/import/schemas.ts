/**
 * Esquemas destino del importador universal. Cada entidad declara sus campos,
 * tipos, enums y SINÓNIMOS de encabezado (base del mapeo determinista, que
 * evita llamar al LLM cuando los nombres de columna son reconocibles).
 *
 * Debe ser importable tanto en cliente como en servidor: solo lógica pura.
 */
import type { TipoContacto } from '@/types'

export type FieldType = 'string' | 'number' | 'boolean' | 'date' | 'enum'

export interface FieldDef {
  key: string
  label: string
  required?: boolean
  type: FieldType
  enumVals?: string[]
  /** Normaliza un valor crudo de enum a uno válido (o null si no aplica). */
  normalizeEnum?: (raw: string) => string | null
  /** Sinónimos de encabezado (se comparan normalizados). */
  synonyms: string[]
}

export interface ImportSchema {
  id: ImportEntity
  label: string
  table: string
  fields: FieldDef[]
  /** Campos que definen un duplicado dentro del archivo. */
  dedupeKey: string[]
}

export type ImportEntity = 'trabajadores' | 'clientes' | 'gastos'

const norm = (s: string) =>
  s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, ' ').trim()

// ---- normalizadores de enum ----
export function normalizeModalidad(raw: string): string {
  const v = norm(raw)
  if (v.includes('mix')) return 'mixto'
  if (v.includes('dia')) return 'por_dia'
  if (v.includes('hora')) return 'por_hora'
  if (v.includes('fij') || v.includes('mes') || v.includes('sueldo') || v.includes('quincen')) return 'sueldo_fijo'
  return 'por_dia'
}

export function normalizeCategoriaGasto(raw: string): string {
  const v = norm(raw)
  if (v.includes('material')) return 'materiales'
  if (v.includes('transp') || v.includes('flet') || v.includes('gasolin') || v.includes('combust') || v.includes('viaje')) return 'transporte'
  if (v.includes('herramient') || v.includes('equipo')) return 'herramientas'
  return 'otro'
}

function normalizeTipoContactoLocal(raw: string): TipoContacto {
  const v = norm(raw)
  if (v.includes('prov')) return 'proveedor'
  if (v.includes('sub') || v.includes('contrat')) return 'subcontratista'
  if (v.includes('arquitect') || v.includes('disen')) return 'arquitecto'
  if (v.includes('client')) return 'cliente'
  if (['cliente', 'proveedor', 'subcontratista', 'arquitecto', 'otro'].includes(v)) return v as TipoContacto
  return 'otro'
}

const trabajadores: ImportSchema = {
  id: 'trabajadores',
  label: 'Trabajadores',
  table: 'trabajadores',
  dedupeKey: ['nombre'],
  fields: [
    { key: 'nombre', label: 'Nombre', required: true, type: 'string', synonyms: ['nombre', 'nombre completo', 'trabajador', 'empleado', 'name', 'colaborador'] },
    { key: 'modalidad_pago', label: 'Modalidad de pago', type: 'enum', enumVals: ['por_dia', 'por_hora', 'sueldo_fijo', 'mixto'], normalizeEnum: normalizeModalidad, synonyms: ['modalidad', 'modalidad de pago', 'tipo de pago', 'pago', 'esquema'] },
    { key: 'tarifa_dia', label: 'Tarifa por día', type: 'number', synonyms: ['tarifa dia', 'tarifa por dia', 'pago dia', 'sueldo dia', 'jornal', 'raya'] },
    { key: 'tarifa_hora', label: 'Tarifa por hora', type: 'number', synonyms: ['tarifa hora', 'tarifa por hora', 'pago hora', 'sueldo hora'] },
    { key: 'sueldo_fijo', label: 'Sueldo fijo', type: 'number', synonyms: ['sueldo fijo', 'sueldo mensual', 'salario', 'sueldo'] },
    { key: 'tarifa_hora_extra', label: 'Tarifa hora extra', type: 'number', synonyms: ['tarifa hora extra', 'hora extra', 'tarifa he', 'he'] },
    { key: 'es_administrativo', label: 'Es administrativo', type: 'boolean', synonyms: ['administrativo', 'es administrativo', 'admin', 'oficina'] },
    { key: 'puesto', label: 'Puesto', type: 'string', synonyms: ['puesto', 'cargo', 'oficio', 'rol'] },
    { key: 'telefono', label: 'Teléfono', type: 'string', synonyms: ['telefono', 'tel', 'celular', 'cel', 'movil', 'phone'] },
    { key: 'email', label: 'Email', type: 'string', synonyms: ['email', 'correo', 'e mail', 'mail'] },
    { key: 'sbc_diario', label: 'SBC diario', type: 'number', synonyms: ['sbc', 'sbc diario', 'salario base de cotizacion'] },
    { key: 'nss', label: 'NSS', type: 'string', synonyms: ['nss', 'numero seguro social', 'imss', 'seguro social'] },
    { key: 'rfc', label: 'RFC', type: 'string', synonyms: ['rfc'] },
    { key: 'curp', label: 'CURP', type: 'string', synonyms: ['curp'] },
    { key: 'banco', label: 'Banco', type: 'string', synonyms: ['banco', 'bank'] },
    { key: 'cuenta_clabe', label: 'CLABE', type: 'string', synonyms: ['clabe', 'cuenta clabe', 'cuenta', 'cuenta bancaria'] },
    { key: 'contacto_emergencia_nombre', label: 'Contacto emergencia', type: 'string', synonyms: ['contacto emergencia', 'contacto de emergencia', 'emergencia nombre'] },
    { key: 'telefono_emergencia', label: 'Tel. emergencia', type: 'string', synonyms: ['telefono emergencia', 'tel emergencia', 'telefono de emergencia'] },
  ],
}

const clientes: ImportSchema = {
  id: 'clientes',
  label: 'Contactos',
  table: 'clientes',
  dedupeKey: ['nombre', 'telefono'],
  fields: [
    { key: 'nombre', label: 'Nombre', required: true, type: 'string', synonyms: ['nombre', 'cliente', 'contacto', 'name', 'razon social', 'empresa'] },
    { key: 'tipo', label: 'Tipo', type: 'enum', enumVals: ['cliente', 'proveedor', 'subcontratista', 'arquitecto', 'otro'], normalizeEnum: (r) => normalizeTipoContactoLocal(r), synonyms: ['tipo', 'categoria', 'rol', 'clasificacion'] },
    { key: 'email', label: 'Email', type: 'string', synonyms: ['email', 'correo', 'mail', 'e mail'] },
    { key: 'telefono', label: 'Teléfono', type: 'string', synonyms: ['telefono', 'tel', 'celular', 'cel', 'movil', 'phone', 'whatsapp'] },
    { key: 'direccion', label: 'Dirección', type: 'string', synonyms: ['direccion', 'domicilio', 'address', 'ubicacion'] },
    { key: 'empresa_cliente', label: 'Empresa', type: 'string', synonyms: ['empresa', 'compania', 'negocio', 'company'] },
    { key: 'puesto', label: 'Puesto', type: 'string', synonyms: ['puesto', 'cargo'] },
    { key: 'notas', label: 'Notas', type: 'string', synonyms: ['notas', 'notes', 'observaciones', 'comentarios'] },
  ],
}

const gastos: ImportSchema = {
  id: 'gastos',
  label: 'Gastos de proyecto',
  table: 'gastos_proyecto',
  dedupeKey: ['descripcion', 'fecha', 'monto'],
  fields: [
    { key: 'descripcion', label: 'Descripción', required: true, type: 'string', synonyms: ['descripcion', 'concepto', 'detalle', 'gasto', 'articulo', 'producto', 'item'] },
    { key: 'monto', label: 'Monto', required: true, type: 'number', synonyms: ['monto', 'importe', 'total', 'costo', 'precio', 'cantidad', 'amount'] },
    { key: 'categoria', label: 'Categoría', type: 'enum', enumVals: ['materiales', 'transporte', 'herramientas', 'otro'], normalizeEnum: normalizeCategoriaGasto, synonyms: ['categoria', 'tipo', 'clasificacion'] },
    { key: 'fecha', label: 'Fecha', type: 'date', synonyms: ['fecha', 'date', 'dia', 'fecha gasto', 'fecha compra'] },
  ],
}

export const IMPORT_SCHEMAS: Record<ImportEntity, ImportSchema> = { trabajadores, clientes, gastos }

export function getSchema(id: string): ImportSchema | null {
  return (IMPORT_SCHEMAS as Record<string, ImportSchema>)[id] ?? null
}
