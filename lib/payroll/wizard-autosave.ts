import type { SupabaseClient } from '@supabase/supabase-js'
import type { WizardAction } from '@/types/wizard'

const pending = new Map<string, ReturnType<typeof setTimeout>>()

interface SaveCeldaParams {
  nominaId: string
  empresaId: string
  proyectoId: string
  trabajadorId: string
  fecha: string
  horas: number | null
}

export function saveCelda(
  params: SaveCeldaParams,
  supabase: SupabaseClient,
  dispatch: (a: WizardAction) => void
) {
  const key = `${params.trabajadorId}:${params.fecha}`

  if (pending.has(key)) clearTimeout(pending.get(key)!)

  dispatch({ type: 'SET_SAVING_CELL', key, saving: true })

  const timer = setTimeout(async () => {
    pending.delete(key)
    let failed = false
    try {
      if (params.horas === null) {
        const { error } = await supabase
          .from('registros_asistencia')
          .delete()
          .eq('proyecto_id', params.proyectoId)
          .eq('trabajador_id', params.trabajadorId)
          .eq('fecha', params.fecha)
        if (error) { failed = true; console.error('[autosave] delete error:', error.message) }
      } else {
        const { error } = await supabase
          .from('registros_asistencia')
          .upsert(
            {
              empresa_id: params.empresaId,
              proyecto_id: params.proyectoId,
              trabajador_id: params.trabajadorId,
              fecha: params.fecha,
              periodo_nomina_id: params.nominaId,
              asistio: params.horas > 0,
              horas_calculadas: params.horas,
            },
            { onConflict: 'proyecto_id,trabajador_id,fecha' }
          )
        if (error) { failed = true; console.error('[autosave] upsert error:', error.message) }
      }
    } catch (err) {
      failed = true
      console.error('[autosave] unexpected:', err)
    } finally {
      dispatch({ type: 'SET_SAVING_CELL', key, saving: false })
      dispatch({
        type: 'SET_SAVE_ERROR',
        error: failed ? 'No se pudo guardar el último cambio. Revisa tu conexión e intenta de nuevo.' : null,
      })
    }
  }, 300)

  pending.set(key, timer)
}
