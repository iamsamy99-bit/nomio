/**
 * Capa de parseo del importador. Excel/CSV reutiliza parseFile (SheetJS, ya
 * existente). PDF extrae el texto en el cliente con pdfjs (sin costo de API).
 */
export { parseFile as parseTabular } from '@/lib/payroll/import-mapper'
export type { ParsedWorkbook } from '@/lib/payroll/import-mapper'

/**
 * Extrae el texto de un PDF en el navegador. Solo sirve para PDFs con capa de
 * texto; los escaneados/foto devuelven texto vacío (no soportados por ahora).
 */
export async function parsePdfText(file: File): Promise<string> {
  const pdfjs = await import('pdfjs-dist')
  // Worker empaquetado (mismo origen, respeta el CSP). new URL + import.meta.url
  // hace que el bundler emita el worker como asset servido por la propia app.
  pdfjs.GlobalWorkerOptions.workerSrc = new URL(
    'pdfjs-dist/build/pdf.worker.min.mjs',
    import.meta.url,
  ).toString()

  const data = await file.arrayBuffer()
  const pdf = await pdfjs.getDocument({ data }).promise
  let text = ''
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i)
    const content = await page.getTextContent()
    text += content.items
      .map(it => ('str' in it ? (it as { str: string }).str : ''))
      .join(' ') + '\n'
  }
  return text.trim()
}
