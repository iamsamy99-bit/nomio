/**
 * Borrador local de la cuadricula de asistencias (localStorage).
 * Persiste ediciones sin guardar para que cerrar la app (o que Android mate
 * el WebView) no pierda lo capturado. Se limpia al guardar con exito.
 */

const PREFIX = 'nomio:asistencias-draft:'
const MAX_AGE_MS = 14 * 24 * 60 * 60 * 1000 // 14 dias

export type AsistenciasDraft = {
  horasCelda: Record<string, Record<string, number | null>>
  savedAt: number
}

export function draftKey(proyectoId: string, fechaInicio: string, fechaFin: string): string {
  return `${PREFIX}${proyectoId}:${fechaInicio}:${fechaFin}`
}

export function loadDraft(key: string): AsistenciasDraft | null {
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return null
    const parsed = JSON.parse(raw) as AsistenciasDraft
    if (!parsed || typeof parsed.savedAt !== 'number' || typeof parsed.horasCelda !== 'object') return null
    if (Date.now() - parsed.savedAt > MAX_AGE_MS) {
      localStorage.removeItem(key)
      return null
    }
    return parsed
  } catch {
    return null
  }
}

export function saveDraft(key: string, horasCelda: AsistenciasDraft['horasCelda']): void {
  try {
    localStorage.setItem(key, JSON.stringify({ horasCelda, savedAt: Date.now() }))
  } catch {
    // localStorage lleno o bloqueado: el borrador es best-effort
  }
}

export function clearDraft(key: string): void {
  try {
    localStorage.removeItem(key)
  } catch {
    // ignorar
  }
}

/** Elimina borradores expirados de cualquier proyecto/rango. */
export function pruneDrafts(): void {
  try {
    const ahora = Date.now()
    const aBorrar: string[] = []
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i)
      if (!k || !k.startsWith(PREFIX)) continue
      try {
        const parsed = JSON.parse(localStorage.getItem(k) || '') as AsistenciasDraft
        if (!parsed || typeof parsed.savedAt !== 'number' || ahora - parsed.savedAt > MAX_AGE_MS) {
          aBorrar.push(k)
        }
      } catch {
        aBorrar.push(k)
      }
    }
    for (const k of aBorrar) localStorage.removeItem(k)
  } catch {
    // ignorar
  }
}
