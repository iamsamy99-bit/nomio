import type { RolUsuario } from '@/types'

/** Rutas permitidas para capataz (solo registro de asistencias y proyectos). */
export const CAPATAZ_ALLOWED_PREFIXES = [
  '/dashboard',
  '/dashboard/asistencias',
  '/dashboard/perfil',
  '/dashboard/proyectos',
] as const

export function isCapataz(rol: RolUsuario | string | undefined): boolean {
  return rol === 'capataz'
}

export function canManageTeam(rol: RolUsuario | string | undefined): boolean {
  return rol === 'owner' || rol === 'admin'
}

export function canAccessAsAdmin(pathname: string): boolean {
  const ADMIN_BLOCKED = ['/dashboard/perfil', '/dashboard/planes']
  return !ADMIN_BLOCKED.some(p => pathname === p || pathname.startsWith(`${p}/`))
}

export function canAccessDashboardPath(pathname: string, rol: RolUsuario | string | undefined): boolean {
  if (rol === 'admin' && !canAccessAsAdmin(pathname)) return false
  if (!isCapataz(rol)) return true
  if (pathname === '/dashboard') return true
  return CAPATAZ_ALLOWED_PREFIXES.some(
    (p) => p !== '/dashboard' && (pathname === p || pathname.startsWith(`${p}/`))
  )
}

export function filterNavForRole<T extends { href: string }>(items: T[], rol: RolUsuario | string | undefined): T[] {
  if (rol === 'admin') return items.filter(item => canAccessAsAdmin(item.href))
  if (!isCapataz(rol)) return items
  const allowed = new Set(['/dashboard', '/dashboard/asistencias', '/dashboard/proyectos'])
  return items.filter((item) => allowed.has(item.href))
}

export function rolLabel(rol: RolUsuario | string): string {
  switch (rol) {
    case 'owner': return 'Propietario'
    case 'admin': return 'Administrador'
    case 'operador': return 'Operador'
    case 'capataz': return 'Capataz / Supervisor'
    default: return rol
  }
}
