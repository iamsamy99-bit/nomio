// Centralized auth error sanitizer.
// Maps Supabase error strings (English, technical) to user-facing Spanish.
// Never exposes supabase.co URLs, project refs, or raw HTTP status codes.

const ERROR_MAP: [string, string][] = [
  ['invalid login credentials',      'Correo o contraseña incorrectos.'],
  ['invalid_credentials',            'Correo o contraseña incorrectos.'],
  ['email not confirmed',            'Confirma tu correo electrónico antes de continuar.'],
  ['user already registered',        'Ya existe una cuenta con este correo.'],
  ['password should be at least',    'La contraseña debe tener al menos 8 caracteres.'],
  ['password is too short',          'La contraseña debe tener al menos 8 caracteres.'],
  ['unable to validate email',       'El correo electrónico no es válido.'],
  ['email rate limit exceeded',      'Demasiados intentos. Espera un momento e intenta de nuevo.'],
  ['too many requests',              'Demasiados intentos. Intenta más tarde.'],
  ['rate limit',                     'Demasiados intentos. Intenta más tarde.'],
  ['auth session missing',           'No se encontró la sesión. Por favor intenta de nuevo.'],
  ['user not found',                 'No encontramos una cuenta con ese correo.'],
  ['email link is invalid',          'El enlace no es válido o ya expiró. Solicita uno nuevo.'],
  ['token has expired',              'El enlace expiró. Solicita un nuevo correo de recuperación.'],
  ['otp has expired',                'El enlace expiró. Solicita un nuevo correo de recuperación.'],
  ['signup is disabled',             'El registro está temporalmente deshabilitado.'],
  ['network',                        'Error de conexión. Verifica tu internet e intenta de nuevo.'],
  ['fetch failed',                   'Error de conexión. Verifica tu internet e intenta de nuevo.'],
  ['failed to fetch',                'Error de conexión. Verifica tu internet e intenta de nuevo.'],
]

export function sanitizeAuthError(raw: string): string {
  if (!raw) return 'Ocurrió un error. Por favor intenta de nuevo.'
  const lower = raw.toLowerCase()
  for (const [key, msg] of ERROR_MAP) {
    if (lower.includes(key)) return msg
  }
  // Strip any supabase URLs or project references from the message
  const cleaned = raw
    .replace(/https?:\/\/[^\s]+/g, '')
    .replace(/supabase[^\s]*/gi, '')
    .trim()
  if (cleaned.length > 0 && cleaned.length < 120) return cleaned
  return 'Ocurrió un error inesperado. Por favor intenta de nuevo.'
}
