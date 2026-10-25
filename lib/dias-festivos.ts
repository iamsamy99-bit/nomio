// Mexico federal holidays. Only the 7 mandatory ones under Ley Federal del Trabajo.

function getNthMonday(year: number, month: number, n: number): string {
  const firstOfMonth = new Date(year, month - 1, 1)
  const dow = firstOfMonth.getDay() // 0=Sun, 1=Mon, ..., 6=Sat
  const daysToFirstMonday = (8 - dow) % 7
  const day = 1 + daysToFirstMonday + (n - 1) * 7
  const d = new Date(year, month - 1, day)
  return d.toISOString().slice(0, 10)
}

export function esDiaFestivo(fecha: string): boolean {
  // Use T12:00:00 to avoid UTC shift flipping the date
  const d = new Date(fecha + 'T12:00:00')
  const year = d.getFullYear()
  const month = d.getMonth() + 1
  const day = d.getDate()

  // Fixed annual dates
  if (month === 1 && day === 1) return true   // Ano Nuevo
  if (month === 5 && day === 1) return true   // Dia del Trabajo
  if (month === 9 && day === 16) return true  // Independencia
  if (month === 12 && day === 25) return true // Navidad

  // Floating Monday-based holidays
  if (getNthMonday(year, 2, 1) === fecha) return true  // Constitucion (1st Mon Feb)
  if (getNthMonday(year, 3, 3) === fecha) return true  // Juarez (3rd Mon Mar)
  if (getNthMonday(year, 11, 3) === fecha) return true // Revolucion (3rd Mon Nov)

  return false
}

export interface DiaFestivo {
  nombre: string
  fecha: string
}

export function getFestivosDelAño(year: number): DiaFestivo[] {
  return [
    { nombre: 'Año Nuevo',              fecha: `${year}-01-01` },
    { nombre: 'Constitución',           fecha: getNthMonday(year, 2, 1) },
    { nombre: 'Natalicio de Juárez',    fecha: getNthMonday(year, 3, 3) },
    { nombre: 'Día del Trabajo',        fecha: `${year}-05-01` },
    { nombre: 'Independencia',          fecha: `${year}-09-16` },
    { nombre: 'Revolución',             fecha: getNthMonday(year, 11, 3) },
    { nombre: 'Navidad',                fecha: `${year}-12-25` },
  ]
}

export function getDiasFestivosEnRango(fechaInicio: string, fechaFin: string): string[] {
  const resultado: string[] = []
  const cursor = new Date(fechaInicio + 'T12:00:00')
  const fin = new Date(fechaFin + 'T12:00:00')
  while (cursor <= fin) {
    const fecha = cursor.toISOString().slice(0, 10)
    if (esDiaFestivo(fecha)) resultado.push(fecha)
    cursor.setDate(cursor.getDate() + 1)
  }
  return resultado
}
