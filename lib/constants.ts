export const MODALIDADES = [
  { value: 'por_dia', label: 'Por dia' },
  { value: 'por_hora', label: 'Por hora' },
  { value: 'sueldo_fijo', label: 'Sueldo fijo' },
  { value: 'mixto', label: 'Mixto (dia + hora)' },
] as const

export const MODALIDAD_LABEL: Record<string, string> = Object.fromEntries(
  MODALIDADES.map(m => [m.value, m.label])
)

export const UNIDADES = [
  'pza', 'm2', 'm3', 'ml', 'hr', 'dia', 'kg', 'ton', 'lt',
  'servicio', 'lote', 'jgo', 'viaje', 'm',
] as const

export const MONEDAS = ['MXN', 'USD', 'EUR'] as const

// Jornada laboral estándar en horas. Base para prorratear el pago de los
// trabajadores por día: un día con menos horas cuenta como fracción de jornada
// (ej. 4h sobre 8h = medio día). Centralizado para que el motor de nómina, el
// estimado del wizard y la captura de asistencias usen el mismo valor.
export const HORAS_JORNADA = 8

// Max conversation turns (user messages) allowed per tier for the AI consultor /
// voice assistant. Shared by the client modals and the server enforcement in
// /api/consultor so the limit cannot be bypassed by calling the API directly.
export const MAX_TURNS_CONSULTOR: Record<string, number> = {
  gratuito: 4,
  pyme:     10,
  pro:      20,
  premium:  40,
}
