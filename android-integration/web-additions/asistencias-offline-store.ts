/**
 * Store offline para asistencias (IndexedDB)
 *
 * Este módulo es el "cerebro" del feature de asistencias offline.
 * Uso:
 *   await saveAsistencia({ trabajadorId, proyectoId, estado, foto, lat, lng });
 *   await flushAsistencias(); // cuando haya internet, sube todo a Supabase
 *
 * Se ejecuta tanto en navegador como dentro del APK (Capacitor),
 * porque IndexedDB está disponible en ambos entornos.
 */

const DB_NAME = 'nomio-offline';
const DB_VERSION = 1;
const STORE_ASISTENCIAS = 'asistencias-pendientes';

export type AsistenciaPendiente = {
  id?: number;
  trabajadorId: string;
  proyectoId: string;
  estado: 'presente' | 'ausente' | 'medio_dia' | 'retardo';
  fecha: string;        // ISO
  foto?: string;        // dataURL (opcional — foto de validación)
  lat?: number;
  lng?: number;
  notas?: string;
  intentosSync: number;
  creadaEn: number;
};

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_ASISTENCIAS)) {
        const s = db.createObjectStore(STORE_ASISTENCIAS, { keyPath: 'id', autoIncrement: true });
        s.createIndex('trabajadorId', 'trabajadorId', { unique: false });
        s.createIndex('fecha', 'fecha', { unique: false });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function saveAsistencia(a: Omit<AsistenciaPendiente, 'id' | 'intentosSync' | 'creadaEn'>) {
  const db = await openDB();
  return new Promise<number>((resolve, reject) => {
    const tx = db.transaction(STORE_ASISTENCIAS, 'readwrite');
    const store = tx.objectStore(STORE_ASISTENCIAS);
    const record: AsistenciaPendiente = { ...a, intentosSync: 0, creadaEn: Date.now() };
    const req = store.add(record);
    req.onsuccess = () => resolve(req.result as number);
    req.onerror = () => reject(req.error);
  });
}

export async function getPendientes(): Promise<AsistenciaPendiente[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_ASISTENCIAS, 'readonly');
    const req = tx.objectStore(STORE_ASISTENCIAS).getAll();
    req.onsuccess = () => resolve(req.result as AsistenciaPendiente[]);
    req.onerror = () => reject(req.error);
  });
}

export async function deleteAsistencia(id: number) {
  const db = await openDB();
  return new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_ASISTENCIAS, 'readwrite');
    tx.objectStore(STORE_ASISTENCIAS).delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

/**
 * Sube todas las asistencias pendientes a Supabase.
 * Se debe invocar:
 *   - Al recuperar conexión (`window.addEventListener('online', flushAsistencias)`)
 *   - Cuando el SW dispara el evento `nomio:flush-asistencias`
 *   - Al abrir la app si navigator.onLine === true
 */
export async function flushAsistencias(
  supabase: { from: (t: string) => { insert: (rows: unknown[]) => Promise<{ error?: unknown }> } }
): Promise<{ ok: number; fail: number }> {
  const pendientes = await getPendientes();
  let ok = 0, fail = 0;
  for (const p of pendientes) {
    try {
      const row = {
        trabajador_id: p.trabajadorId,
        proyecto_id: p.proyectoId,
        estado: p.estado,
        fecha: p.fecha,
        foto_url: p.foto ?? null,
        lat: p.lat ?? null,
        lng: p.lng ?? null,
        notas: p.notas ?? null,
        creada_offline_en: new Date(p.creadaEn).toISOString(),
      };
      const { error } = await supabase.from('asistencias').insert([row]);
      if (error) { fail++; continue; }
      if (p.id !== undefined) await deleteAsistencia(p.id);
      ok++;
    } catch {
      fail++;
    }
  }
  return { ok, fail };
}
