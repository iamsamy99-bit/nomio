import { cache } from 'react'
import type { User } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'
import { cacheGet, cacheSet, cacheDel } from '@/lib/redis-cache'
import type { Empresa, RolUsuario } from '@/types'

// Short TTL: this is low-stakes UI/limit data (the payroll engine reads the DB
// directly, never this cache), so a few minutes of staleness is acceptable and
// self-heals. Explicit busts cover the common self-service mutations.
const CTX_TTL = 180 // 3 min

export interface EmpresaContext {
  userId: string
  empresaUserId: string
  empresaId: string
  rol: RolUsuario
  tourCompletado: boolean
  empresa: Empresa
}

// Memoized per request: middleware already validated the session, but layout,
// page, and any server helper would each call getUser() again. React.cache folds
// those into a single auth roundtrip for the duration of one request.
export const getCurrentUser = cache(async (): Promise<User | null> => {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  return user
})

// Memoized per request AND backed by Redis across requests (TTL 180s). Returns
// null when the user has no active empresa membership. The cached row is the
// caller's own membership (fetched under their RLS session), keyed by their
// user id, so it is never shared across users.
export const getEmpresaContext = cache(async (): Promise<EmpresaContext | null> => {
  const user = await getCurrentUser()
  if (!user) return null

  const key = `uemp:${user.id}`
  try {
    const cached = await cacheGet(key)
    if (cached) {
      const parsed = JSON.parse(cached) as Omit<EmpresaContext, 'userId'>
      return { userId: user.id, ...parsed }
    }
  } catch {
    // cache miss/unavailable — fall through to the DB
  }

  const supabase = await createClient()
  const { data: eu } = await supabase
    .from('empresa_users')
    .select('id, empresa_id, rol, tour_completado, empresas(*)')
    .eq('user_id', user.id)
    .eq('activo', true)
    .single()
  if (!eu) return null

  const value = {
    empresaUserId: eu.id as string,
    empresaId: eu.empresa_id as string,
    rol: eu.rol as RolUsuario,
    tourCompletado: (eu as { tour_completado?: boolean }).tour_completado ?? false,
    empresa: eu.empresas as unknown as Empresa,
  }
  cacheSet(key, JSON.stringify(value), CTX_TTL).catch(() => {})
  return { userId: user.id, ...value }
})

// Call after any change to a user's rol, empresa membership, or empresa config
// (role change, perfil toggles, tier change) so their next request reloads fresh.
// Tier changes from the Stripe webhook affect every member of the empresa; those
// rely on the TTL to self-heal since the webhook does not enumerate user ids.
export async function bustEmpresaContext(userId: string): Promise<void> {
  await cacheDel(`uemp:${userId}`).catch(() => {})
}
