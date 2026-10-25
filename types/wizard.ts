import type { Trabajador, Proyecto, ConceptoAdicional } from '@/types'
import type { CalculatedLine, EngineResult } from '@/lib/payroll/engine'

export type { CalculatedLine }

export interface Anticipo {
  id: string
  trabajador_id: string
  monto: number
  estado: 'pendiente' | 'aprobado' | 'rechazado' | 'descontado'
  notas: string | null
  solicitado_at: string
  descontado_en_nomina_id?: string | null
  trabajadores?: { nombre: string } | null
}

export interface AnomalyResult {
  level: 'error' | 'warning' | 'info'
  code: 'ZERO_ATTENDANCE' | 'OVERTIME_EXCEEDED' | 'LARGE_INCREASE' | 'ZERO_TARIFA'
  message: string
  trabajadorId?: string
  trabajadorNombre?: string
}

export interface ImportColumnMapping {
  format: 'wide' | 'long'
  workerCol: string
  dateCol?: string   // long format: the date column
  hoursCol?: string  // long format: the hours column
  dateCols?: string[] // wide format: column headers that are dates
}

export interface WizardState {
  nominaId: string | null
  empresaId: string
  proyectoId: string
  fechaInicio: string
  fechaFin: string
  encargado: string
  observaciones: string
  trabajadores: Trabajador[]
  proyecto: Proyecto | null
  horasCelda: Record<string, Record<string, number | null>>  // [trabId][fecha]
  savingCell: Record<string, boolean>                         // key = `${trabId}:${fecha}`
  saveError: string | null                                    // ultimo error de autoguardado de celdas
  horasExtra: Record<string, { horas: number }>
  conceptos: ConceptoAdicional[]
  anticipos: Anticipo[]
  engineResult: EngineResult | null
  anomalies: AnomalyResult[]
  loadingStep: boolean
  /** True only during the initial data-load in WizardContext — kept separate so step components can manage their own loading state without affecting the shell spinner. */
  initialLoading: boolean
}

export type WizardAction =
  | { type: 'SET_EMPRESA_ID'; empresaId: string }
  | { type: 'SET_NOMINA_ID'; nominaId: string }
  | { type: 'SET_FIELD'; field: keyof Pick<WizardState, 'proyectoId' | 'fechaInicio' | 'fechaFin' | 'encargado' | 'observaciones'>; value: string }
  | { type: 'SET_PROYECTO'; proyecto: Proyecto | null }
  | { type: 'SET_TRABAJADORES'; trabajadores: Trabajador[] }
  | { type: 'SET_HORAS_CELDA'; trabId: string; fecha: string; horas: number | null }
  | { type: 'PATCH_HORAS_CELDA'; patch: Record<string, Record<string, number | null>> }
  | { type: 'SET_SAVING_CELL'; key: string; saving: boolean }
  | { type: 'SET_SAVE_ERROR'; error: string | null }
  | { type: 'SET_HORAS_EXTRA'; trabId: string; horas: number }
  | { type: 'SET_CONCEPTOS'; conceptos: ConceptoAdicional[] }
  | { type: 'SET_ANTICIPOS'; anticipos: Anticipo[] }
  | { type: 'SET_ENGINE_RESULT'; result: EngineResult }
  | { type: 'SET_ANOMALIES'; anomalies: AnomalyResult[] }
  | { type: 'SET_LOADING_STEP'; loading: boolean }
  | { type: 'SET_INITIAL_LOADING'; loading: boolean }

export const WIZARD_INITIAL_STATE: WizardState = {
  nominaId: null,
  empresaId: '',
  proyectoId: '',
  fechaInicio: '',
  fechaFin: '',
  encargado: '',
  observaciones: '',
  trabajadores: [],
  proyecto: null,
  horasCelda: {},
  savingCell: {},
  saveError: null,
  horasExtra: {},
  conceptos: [],
  anticipos: [],
  engineResult: null,
  anomalies: [],
  loadingStep: false,
  initialLoading: true,
}

export function wizardReducer(state: WizardState, action: WizardAction): WizardState {
  switch (action.type) {
    case 'SET_EMPRESA_ID':
      return { ...state, empresaId: action.empresaId }
    case 'SET_NOMINA_ID':
      return { ...state, nominaId: action.nominaId }
    case 'SET_FIELD':
      return { ...state, [action.field]: action.value }
    case 'SET_PROYECTO':
      return { ...state, proyecto: action.proyecto }
    case 'SET_TRABAJADORES':
      return { ...state, trabajadores: action.trabajadores }
    case 'SET_HORAS_CELDA': {
      const trabRow = { ...(state.horasCelda[action.trabId] ?? {}), [action.fecha]: action.horas }
      return { ...state, horasCelda: { ...state.horasCelda, [action.trabId]: trabRow } }
    }
    case 'PATCH_HORAS_CELDA': {
      const merged: typeof state.horasCelda = { ...state.horasCelda }
      for (const [tid, dates] of Object.entries(action.patch)) {
        merged[tid] = { ...(merged[tid] ?? {}), ...dates }
      }
      return { ...state, horasCelda: merged }
    }
    case 'SET_SAVING_CELL':
      return { ...state, savingCell: { ...state.savingCell, [action.key]: action.saving } }
    case 'SET_SAVE_ERROR':
      return { ...state, saveError: action.error }
    case 'SET_HORAS_EXTRA': {
      return {
        ...state,
        horasExtra: {
          ...state.horasExtra,
          [action.trabId]: { horas: action.horas },
        },
      }
    }
    case 'SET_CONCEPTOS':
      return { ...state, conceptos: action.conceptos }
    case 'SET_ANTICIPOS':
      return { ...state, anticipos: action.anticipos }
    case 'SET_ENGINE_RESULT':
      return { ...state, engineResult: action.result }
    case 'SET_ANOMALIES':
      return { ...state, anomalies: action.anomalies }
    case 'SET_LOADING_STEP':
      return { ...state, loadingStep: action.loading }
    case 'SET_INITIAL_LOADING':
      return { ...state, initialLoading: action.loading }
    default:
      return state
  }
}
