'use client'
import { createContext, useContext, useReducer, useEffect, useCallback, useMemo } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { SupabaseClient } from '@supabase/supabase-js'
import { wizardReducer, WIZARD_INITIAL_STATE } from '@/types/wizard'
import type { WizardState, WizardAction } from '@/types/wizard'

interface WizardContextValue {
  state: WizardState
  dispatch: (a: WizardAction) => void
  supabase: SupabaseClient
  currentStep: number
  navigateToStep: (n: number) => void
  stepIsValid: (n: number) => boolean
}

const WizardContext = createContext<WizardContextValue | null>(null)

export function useWizard() {
  const ctx = useContext(WizardContext)
  if (!ctx) throw new Error('useWizard must be used inside WizardProvider')
  return ctx
}

interface Props {
  nominaId: string
  children: React.ReactNode
}

export function WizardProvider({ nominaId, children }: Props) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const currentStep = Math.max(1, Math.min(4, parseInt(searchParams.get('step') ?? '2', 10)))
  const supabase = useMemo(() => createClient(), [])

  const [state, dispatch] = useReducer(wizardReducer, {
    ...WIZARD_INITIAL_STATE,
    nominaId,
  })

  const navigateToStep = useCallback(
    (n: number) => router.replace(`/dashboard/nomina/${nominaId}/wizard?step=${n}`),
    [router, nominaId]
  )

  const stepIsValid = useCallback(
    (n: number): boolean => {
      switch (n) {
        case 1: return !!(state.proyectoId && state.fechaInicio && state.fechaFin && state.encargado)
        case 2: return Object.values(state.horasCelda).some(dates => Object.values(dates).some(h => h !== null && h > 0))
        case 3: return true
        case 4: return state.engineResult !== null
        default: return false
      }
    },
    [state]
  )

  // Load wizard data when nominaId is available
  useEffect(() => {
    if (!nominaId) return
    let cancelled = false

    async function load() {
      dispatch({ type: 'SET_INITIAL_LOADING', loading: true })
      try {
        // Get empresa_id for the user
        const { data: { user } } = await supabase.auth.getUser()
        if (!user || cancelled) return
        const { data: eu } = await supabase.from('empresa_users').select('empresa_id').eq('user_id', user.id).single()
        if (!eu || cancelled) return

        dispatch({ type: 'SET_EMPRESA_ID', empresaId: eu.empresa_id })

        // Load the nomina period
        const { data: periodo } = await supabase
          .from('periodos_nomina')
          .select('*, proyectos(*)')
          .eq('id', nominaId)
          .eq('empresa_id', eu.empresa_id)
          .single()
        if (!periodo || cancelled) return

        dispatch({ type: 'SET_FIELD', field: 'proyectoId', value: periodo.proyecto_id })
        dispatch({ type: 'SET_FIELD', field: 'fechaInicio', value: periodo.fecha_inicio })
        dispatch({ type: 'SET_FIELD', field: 'fechaFin', value: periodo.fecha_fin })
        dispatch({ type: 'SET_FIELD', field: 'encargado', value: periodo.encargado ?? '' })
        dispatch({ type: 'SET_FIELD', field: 'observaciones', value: periodo.observaciones_actividades ?? '' })
        if (periodo.proyectos) dispatch({ type: 'SET_PROYECTO', proyecto: periodo.proyectos as never })

        // Load workers for the project. Prefer proyecto_trabajadores assignments;
        // fall back to all active workers in the empresa (same as asistencias page).
        const { data: asignaciones } = await supabase
          .from('proyecto_trabajadores')
          .select('trabajadores(*)')
          .eq('proyecto_id', periodo.proyecto_id)
          .eq('activo', true)
        let workers: unknown[] = []
        if (!cancelled) {
          if (asignaciones && asignaciones.length > 0) {
            workers = asignaciones.map((a: { trabajadores: unknown }) => a.trabajadores).filter(Boolean)
          } else {
            const { data: allWorkers } = await supabase
              .from('trabajadores')
              .select('*')
              .eq('empresa_id', eu.empresa_id)
              .eq('activo', true)
              .order('nombre')
            workers = allWorkers ?? []
          }
          dispatch({ type: 'SET_TRABAJADORES', trabajadores: workers as never })
        }

        // Load existing attendance records for this project+date range.
        // Do NOT filter by periodo_nomina_id: records saved from the asistencias
        // page may have null or a different period id and must still be visible here.
        const { data: asistencias } = await supabase
          .from('registros_asistencia')
          .select('trabajador_id, fecha, horas_calculadas')
          .eq('empresa_id', eu.empresa_id)
          .eq('proyecto_id', periodo.proyecto_id)
          .gte('fecha', periodo.fecha_inicio)
          .lte('fecha', periodo.fecha_fin)
        if (!cancelled && asistencias) {
          const patch: Record<string, Record<string, number | null>> = {}
          for (const r of asistencias) {
            if (!patch[r.trabajador_id]) patch[r.trabajador_id] = {}
            patch[r.trabajador_id][r.fecha] = r.horas_calculadas ?? null
          }
          dispatch({ type: 'PATCH_HORAS_CELDA', patch })
        }

        // Load conceptos
        const { data: conceptos } = await supabase
          .from('conceptos_adicionales')
          .select('*')
          .eq('nomina_id', nominaId)
        if (!cancelled && conceptos) dispatch({ type: 'SET_CONCEPTOS', conceptos: conceptos as never })

        // Load existing lineas_nomina to populate state.horasExtra
        const { data: existingLineas } = await supabase
          .from('lineas_nomina')
          .select('trabajador_id, horas_extra')
          .eq('nomina_id', nominaId)
        if (!cancelled && existingLineas) {
          for (const l of existingLineas) {
            if (l.horas_extra > 0) {
              dispatch({ type: 'SET_HORAS_EXTRA', trabId: l.trabajador_id, horas: l.horas_extra })
            }
          }
        }

        // Anticipos que esta nomina va a descontar: aprobados de los trabajadores
        // del proyecto, mas los que esta misma nomina ya desconto en un recalculo
        // previo (asi el resumen del paso 3 coincide con el motor).
        const workerIds = (workers as Array<{ id: string }>).map(w => w.id)
        if (workerIds.length > 0) {
          const { data: anticipos } = await supabase
            .from('anticipos')
            .select('id, trabajador_id, monto, estado, notas, solicitado_at, descontado_en_nomina_id, trabajadores(nombre)')
            .eq('empresa_id', eu.empresa_id)
            .in('estado', ['aprobado', 'descontado'])
            .in('trabajador_id', workerIds)
          if (!cancelled && anticipos) {
            const visibles = anticipos.filter(
              a => a.estado === 'aprobado' || a.descontado_en_nomina_id === nominaId
            )
            dispatch({ type: 'SET_ANTICIPOS', anticipos: visibles as never })
          }
        }

      } finally {
        if (!cancelled) dispatch({ type: 'SET_INITIAL_LOADING', loading: false })
      }
    }

    load()
    return () => { cancelled = true }
  }, [nominaId, supabase])

  const value: WizardContextValue = {
    state,
    dispatch,
    supabase,
    currentStep,
    navigateToStep,
    stepIsValid,
  }

  return <WizardContext.Provider value={value}>{children}</WizardContext.Provider>
}
