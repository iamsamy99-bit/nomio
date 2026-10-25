import { formatMXN, padNomina } from '@/lib/utils'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { NominaExportData } from './nomina-pdf'
import { getNominaPDFBytes } from './nomina-pdf'

// Uploads nomina PDF to Storage and opens WhatsApp with a signed link (7 days).
// Returns an error string if something goes wrong (never throws).
export async function compartirNominaWhatsApp(
  supabase: SupabaseClient,
  empresaId: string,
  data: NominaExportData,
): Promise<string | null> {
  let pdfBytes: Uint8Array
  try {
    pdfBytes = await getNominaPDFBytes(data)
  } catch {
    return 'No se pudo generar el PDF para compartir.'
  }

  const safeNominaId = String(data.nomina.id).replace(/[^a-zA-Z0-9-]/g, '')
  const path = `${empresaId}/${safeNominaId}.pdf`

  // Upsert: remove existing file first to avoid duplicate errors
  await supabase.storage.from('nominas-export').remove([path])

  const { error: uploadError } = await supabase.storage
    .from('nominas-export')
    .upload(path, pdfBytes, {
      contentType: 'application/pdf',
      upsert: true,
    })

  if (uploadError) {
    console.error('[whatsapp] upload error', uploadError)
    return `Error al subir el PDF: ${uploadError.message}`
  }

  const { data: signedData, error: signError } = await supabase.storage
    .from('nominas-export')
    .createSignedUrl(path, 60 * 60 * 24 * 7) // 7 days

  if (signError || !signedData?.signedUrl) {
    console.error('[whatsapp] signed url error', signError)
    return 'No se pudo generar el enlace del PDF.'
  }

  const nominaLabel = padNomina(data.nomina.numero_nomina)
  const total = formatMXN(data.tots.total)
  const proyecto = data.proyecto?.nombre || ''

  const text = [
    `*Nomina ${nominaLabel}* — ${proyecto}`,
    `Total: ${total}`,
    `PDF (valido 7 dias): ${signedData.signedUrl}`,
  ].join('\n')

  window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank')
  return null
}
