import type { ImportColumnMapping } from '@/types/wizard'

export interface ParsedWorkbook {
  headers: string[]
  sampleRows: Record<string, string>[]
  allRows: Record<string, string>[]
}

export async function parseFile(file: File): Promise<ParsedWorkbook> {
  const XLSX = await import('xlsx')
  const buffer = await file.arrayBuffer()
  const wb = XLSX.read(buffer, { type: 'array', raw: false, dateNF: 'yyyy-mm-dd' })
  const ws = wb.Sheets[wb.SheetNames[0]]
  const allRows = XLSX.utils.sheet_to_json<Record<string, string>>(ws, { defval: '' })
  const headers = allRows.length > 0 ? Object.keys(allRows[0]) : []
  const sampleRows = allRows.slice(0, 5)
  return { headers, sampleRows, allRows }
}

export function applyMapping(
  allRows: Record<string, string>[],
  mapping: ImportColumnMapping,
  trabajadores: { id: string; nombre: string }[]
): Record<string, Record<string, number | null>> {
  const patch: Record<string, Record<string, number | null>> = {}

  const normalizeName = (s: string) => s.toLowerCase().replace(/\s+/g, ' ').trim()
  const workerByName = new Map(trabajadores.map(t => [normalizeName(t.nombre), t.id]))

  const findWorker = (raw: string): string | null =>
    workerByName.get(normalizeName(raw)) ?? null

  if (mapping.format === 'long') {
    for (const row of allRows) {
      const workerName = String(row[mapping.workerCol] ?? '').trim()
      const fecha = String(row[mapping.dateCol!] ?? '').trim()
      const horasRaw = parseFloat(String(row[mapping.hoursCol!] ?? '0').replace(',', '.'))
      const horas = isNaN(horasRaw) ? null : horasRaw

      const trabId = findWorker(workerName)
      if (!trabId || !fecha) continue

      if (!patch[trabId]) patch[trabId] = {}
      patch[trabId][fecha] = horas
    }
  } else {
    for (const row of allRows) {
      const workerName = String(row[mapping.workerCol] ?? '').trim()
      const trabId = findWorker(workerName)
      if (!trabId) continue

      if (!patch[trabId]) patch[trabId] = {}

      for (const col of mapping.dateCols ?? []) {
        const raw = String(row[col] ?? '').trim()
        const horas = raw === '' ? null : parseFloat(raw.replace(',', '.'))
        patch[trabId][col] = isNaN(horas as number) ? null : (horas as number)
      }
    }
  }

  return patch
}
