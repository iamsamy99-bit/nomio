/**
 * Store offline para asistencias (IndexedDB)
 * Guarda registros localmente y los sube a Supabase cuando vuelve la conexión.
 */

const DB_NAME = 'nomio-offline'
const DB_VERSION = 1
const STORE = 'asistencias-pendientes'

export type AsistenciaPendiente = {
  id?: number
  empresaId: string
  trabajadorId: string
  proyectoId: string
  estado: 'presente' | 'ausente'
  fecha: string
  // Optional: hours worked that day (for por_hora / mixto workers).
  horasCalculadas?: number
  // Optional: payroll period the record belongs to (kept in sync with online path).
  periodoNominaId?: string | null
  intentosSync: number
  creadaEn: number
}

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION)
    req.onupgradeneeded = () => {
      const db = req.result
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: 'id', autoIncrement: true })
      }
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

export async function saveAsistencia(a: Omit<AsistenciaPendiente, 'id' | 'intentosSync' | 'creadaEn'>) {
  const db = await openDB()
  return new Promise<number>((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite')
    const req = tx.objectStore(STORE).add({ ...a, intentosSync: 0, creadaEn: Date.now() })
    req.onsuccess = () => resolve(req.result as number)
    req.onerror = () => reject(req.error)
  })
}

export async function getPendientes(): Promise<AsistenciaPendiente[]> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readonly')
    const req = tx.objectStore(STORE).getAll()
    req.onsuccess = () => resolve(req.result as AsistenciaPendiente[])
    req.onerror = () => reject(req.error)
  })
}

export async function deleteAsistencia(id: number) {
  const db = await openDB()
  return new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite')
    tx.objectStore(STORE).delete(id)
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
}

type SupabaseClient = {
  from: (t: string) => {
    upsert: (rows: unknown[], opts: object) => Promise<{ error?: { message: string } | null }>
  }
}

export async function updateIntentos(id: number, intentos: number) {
  const db = await openDB()
  return new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite')
    const store = tx.objectStore(STORE)
    const getReq = store.get(id)
    getReq.onsuccess = () => {
      const record = getReq.result as AsistenciaPendiente | undefined
      if (!record) { resolve(); return }
      store.put({ ...record, intentosSync: intentos })
      tx.oncomplete = () => resolve()
      tx.onerror = () => reject(tx.error)
    }
    getReq.onerror = () => reject(getReq.error)
  })
}

// Nunca purgamos registros por intentos fallidos: una asistencia es el pago de
// un trabajador y perderla en silencio es inaceptable. Cada flush reintenta
// todos los pendientes; intentosSync queda como diagnostico.
export async function flushAsistencias(supabase: SupabaseClient): Promise<{ ok: number; fail: number }> {
  const pendientes = await getPendientes()
  let ok = 0, fail = 0
  for (const p of pendientes) {
    try {
      const { error } = await supabase.from('registros_asistencia').upsert([{
        empresa_id: p.empresaId,
        trabajador_id: p.trabajadorId,
        proyecto_id: p.proyectoId,
        fecha: p.fecha,
        asistio: p.estado === 'presente',
        horas_calculadas: p.horasCalculadas ?? 0,
        periodo_nomina_id: p.periodoNominaId ?? null,
        creada_offline_en: new Date(p.creadaEn).toISOString(),
      }], { onConflict: 'proyecto_id,trabajador_id,fecha' })
      if (error) {
        if (p.id !== undefined) await updateIntentos(p.id, p.intentosSync + 1)
        fail++
        continue
      }
      if (p.id !== undefined) await deleteAsistencia(p.id)
      ok++
    } catch {
      if (p.id !== undefined) await updateIntentos(p.id, p.intentosSync + 1)
      fail++
    }
  }
  return { ok, fail }
}
