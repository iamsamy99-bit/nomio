import type { SupabaseClient } from '@supabase/supabase-js'

export type AuditOperacion =
  | 'nomina_generada'
  | 'nomina_pagada'
  | 'trabajador_creado'
  | 'trabajador_eliminado'
  | 'cotizacion_enviada'
  | 'cotizacion_aceptada'
  | 'cotizacion_rechazada'
  | 'anticipo_aprobado'
  | 'anticipo_rechazado'

interface AuditParams {
  supabase: SupabaseClient
  empresaId: string
  tabla: string
  operacion: AuditOperacion
  registroId?: string
  payload?: Record<string, unknown>
}

export function logAudit({ supabase, empresaId, tabla, operacion, registroId, payload }: AuditParams): void {
  // Fire-and-forget — callers must NOT await this
  supabase.auth.getUser().then(({ data }) => {
    const userId = data.user?.id
    if (!userId) return
    supabase.from('audit_log').insert({
      empresa_id: empresaId,
      user_id: userId,
      tabla,
      operacion,
      registro_id: registroId ?? null,
      payload: payload ?? null,
    }).then(({ error }) => {
      if (error) console.warn('[audit]', operacion, error.message)
    })
  })
}
