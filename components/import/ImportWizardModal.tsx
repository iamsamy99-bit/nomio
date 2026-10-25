'use client'
import { useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { X, UploadCloud, FileSpreadsheet, FileText, CheckCircle, AlertCircle, Loader2, ArrowRight, ArrowLeft } from 'lucide-react'
import { IMPORT_SCHEMAS, type ImportEntity } from '@/lib/import/schemas'
import { autoMapColumns } from '@/lib/import/automap'
import { parseTabular, parsePdfText } from '@/lib/import/parse'
import { buildRecords, type BuiltRow } from '@/lib/import/apply'

type Step = 'upload' | 'mapping' | 'preview' | 'importing' | 'done'

const INSERT_DEFAULTS: Record<ImportEntity, Record<string, unknown>> = {
  trabajadores: { activo: true, modalidad_pago: 'por_dia' },
  clientes: { activo: true, tipo: 'cliente' },
  gastos: {},
}

interface Props {
  schemaId: ImportEntity
  empresaId: string
  fixed?: Record<string, unknown>
  onClose: () => void
  onDone?: (count: number) => void
}

const NO_IMPORT = '__none__'

export default function ImportWizardModal({ schemaId, empresaId, fixed = {}, onClose, onDone }: Props) {
  const schema = IMPORT_SCHEMAS[schemaId]
  const [step, setStep] = useState<Step>('upload')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [fileName, setFileName] = useState('')
  const [source, setSource] = useState<'tabular' | 'pdf'>('tabular')
  const [headers, setHeaders] = useState<string[]>([])
  const [allRows, setAllRows] = useState<Record<string, string>[]>([])
  const [mapping, setMapping] = useState<Record<string, string | null>>({})
  const [built, setBuilt] = useState<BuiltRow[]>([])
  const [resultMsg, setResultMsg] = useState('')

  const validCount = built.filter(r => r.valid).length
  const invalidCount = built.length - validCount

  const handleFile = useCallback(async (file: File) => {
    setError(''); setLoading(true); setFileName(file.name)
    try {
      const isPdf = /\.pdf$/i.test(file.name)
      if (isPdf) {
        setSource('pdf')
        const text = await parsePdfText(file)
        if (!text || text.length < 10) {
          setError('Este PDF no tiene texto legible (parece escaneado). Por ahora solo se admiten PDF con texto.')
          return
        }
        const res = await fetch('/api/import/map', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ entity: schemaId, pdfText: text }),
        })
        const json = await res.json()
        if (!res.ok) { setError(json.error || 'No se pudo leer el PDF.'); return }
        const rows: Record<string, string>[] = json.rows ?? []
        if (!rows.length) { setError('No se encontraron registros en el PDF.'); return }
        const identity: Record<string, string | null> = {}
        for (const f of schema.fields) identity[f.key] = f.key
        setMapping(identity)
        setAllRows(rows)
        setBuilt(buildRecords(rows, identity, schema, fixed))
        setStep('preview')
        return
      }

      // Excel / CSV
      setSource('tabular')
      const { headers: hs, sampleRows, allRows: rows } = await parseTabular(file)
      if (!hs.length) { setError('El archivo no tiene columnas legibles.'); return }
      const auto = autoMapColumns(hs, schema)
      let map = auto.mapping
      // Si faltan campos por mapear, pide ayuda al modelo gratis (Groq).
      const sinMapear = schema.fields.filter(f => !map[f.key]).map(f => f.key)
      if (auto.missingRequired.length > 0 && sinMapear.length > 0) {
        try {
          const res = await fetch('/api/import/map', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ entity: schemaId, headers: hs, sampleRows, missingFields: sinMapear }),
          })
          const json = await res.json()
          if (res.ok && json.mapping) map = { ...map, ...json.mapping }
          // si Groq falla, seguimos con el mapeo determinista; el usuario ajusta a mano
        } catch { /* ignora: mapeo manual */ }
      }
      setHeaders(hs)
      setAllRows(rows)
      setMapping(map)
      setStep('mapping')
    } catch (err) {
      console.error('[import] handleFile', err)
      setError('No se pudo leer el archivo. Verifica el formato.')
    } finally {
      setLoading(false)
    }
  }, [schema, schemaId, fixed])

  const continuarAPreview = () => {
    setBuilt(buildRecords(allRows, mapping, schema, fixed))
    setStep('preview')
  }

  const importar = async () => {
    setStep('importing'); setError('')
    try {
      const supabase = createClient()
      const defaults = INSERT_DEFAULTS[schemaId]
      const payload = built.filter(r => r.valid).map(r => ({ ...defaults, ...r.data, ...fixed, empresa_id: empresaId }))
      let inserted = 0
      for (let i = 0; i < payload.length; i += 500) {
        const chunk = payload.slice(i, i + 500)
        const { error: insErr } = await supabase.from(schema.table).insert(chunk)
        if (insErr) throw new Error(insErr.message)
        inserted += chunk.length
      }
      setResultMsg(`${inserted} ${schema.label.toLowerCase()} importado(s).${invalidCount > 0 ? ` ${invalidCount} fila(s) omitida(s).` : ''}`)
      setStep('done')
      onDone?.(inserted)
    } catch (err) {
      console.error('[import] insert', err)
      setError(`Error al guardar: ${err instanceof Error ? err.message : 'desconocido'}`)
      setStep('preview')
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4" style={{ background: 'rgba(0,0,0,0.5)' }}>
      <div className="w-full sm:max-w-2xl rounded-t-2xl sm:rounded-2xl flex flex-col max-h-[92vh]" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b shrink-0" style={{ borderColor: 'var(--border)' }}>
          <div>
            <h2 className="font-display font-semibold text-base" style={{ color: 'var(--tinta)' }}>Importar {schema.label.toLowerCase()}</h2>
            <p className="text-xs mt-0.5" style={{ color: 'var(--tinta-500)' }}>Excel, CSV o PDF con texto · mapeo automático</p>
          </div>
          <button onClick={onClose}><X className="w-5 h-5" style={{ color: 'var(--tinta-500)' }} /></button>
        </div>

        <div className="overflow-y-auto flex-1 p-5">
          {error && (
            <div className="flex items-start gap-2 text-sm p-3 rounded-xl mb-4" style={{ background: 'rgba(160,78,62,0.08)', border: '1px solid rgba(160,78,62,0.25)', color: 'var(--rojo-falta)' }}>
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" /><div className="flex-1">{error}</div>
            </div>
          )}

          {/* UPLOAD */}
          {step === 'upload' && (
            <label className="flex flex-col items-center justify-center gap-3 py-14 rounded-2xl border-2 border-dashed cursor-pointer transition-colors"
              style={{ borderColor: 'var(--border)', background: 'var(--surface-2)' }}>
              {loading ? <Loader2 className="w-10 h-10 animate-spin" style={{ color: 'var(--bosque-500)' }} />
                : <UploadCloud className="w-10 h-10" style={{ color: 'var(--bosque-500)' }} />}
              <div className="text-center">
                <p className="font-semibold text-sm" style={{ color: 'var(--tinta)' }}>{loading ? 'Leyendo archivo...' : 'Haz clic para subir un archivo'}</p>
                <p className="text-xs mt-1" style={{ color: 'var(--tinta-500)' }}>.xlsx, .xls, .csv o .pdf — en cualquier orden de columnas</p>
              </div>
              <input type="file" accept=".xlsx,.xls,.csv,.pdf" className="hidden" disabled={loading}
                onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = '' }} />
            </label>
          )}

          {/* MAPPING (tabular) */}
          {step === 'mapping' && (
            <div className="space-y-3">
              <p className="text-xs" style={{ color: 'var(--tinta-500)' }}>
                <FileSpreadsheet className="w-3.5 h-3.5 inline mr-1" />{fileName} · revisa el mapeo de columnas
              </p>
              <div className="rounded-xl border divide-y" style={{ borderColor: 'var(--border)' }}>
                {schema.fields.map(f => (
                  <div key={f.key} className="flex items-center gap-3 px-3 py-2.5">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium" style={{ color: 'var(--tinta)' }}>
                        {f.label}{f.required && <span style={{ color: 'var(--rojo-falta)' }}> *</span>}
                      </p>
                    </div>
                    <select
                      value={mapping[f.key] ?? NO_IMPORT}
                      onChange={e => setMapping(m => ({ ...m, [f.key]: e.target.value === NO_IMPORT ? null : e.target.value }))}
                      className="input text-sm max-w-[55%]"
                      style={!mapping[f.key] && f.required ? { borderColor: 'var(--rojo-falta)' } : undefined}
                    >
                      <option value={NO_IMPORT}>— no importar —</option>
                      {headers.map(h => <option key={h} value={h}>{h}</option>)}
                    </select>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* PREVIEW */}
          {step === 'preview' && (
            <div className="space-y-3">
              <div className="flex items-center gap-3 flex-wrap">
                <span className="text-sm font-semibold px-3 py-1 rounded-full" style={{ background: 'var(--bosque-50)', color: 'var(--bosque-600)' }}>
                  {validCount} listo(s) para importar
                </span>
                {invalidCount > 0 && (
                  <span className="text-sm font-semibold px-3 py-1 rounded-full" style={{ background: 'rgba(160,78,62,0.10)', color: 'var(--rojo-falta)' }}>
                    {invalidCount} con problemas (se omiten)
                  </span>
                )}
                {source === 'pdf' && <span className="text-xs" style={{ color: 'var(--tinta-500)' }}><FileText className="w-3.5 h-3.5 inline mr-1" />extraído del PDF</span>}
              </div>
              <div className="rounded-xl border overflow-auto max-h-[40vh]" style={{ borderColor: 'var(--border)' }}>
                <table className="w-full text-xs">
                  <thead>
                    <tr style={{ background: 'var(--stone-bg)' }}>
                      <th className="text-left py-2 px-3 font-semibold" style={{ color: 'var(--tinta)' }}>Estado</th>
                      {schema.fields.slice(0, 4).map(f => <th key={f.key} className="text-left py-2 px-3 font-semibold" style={{ color: 'var(--tinta)' }}>{f.label}</th>)}
                    </tr>
                  </thead>
                  <tbody>
                    {built.slice(0, 30).map((r, i) => (
                      <tr key={i} className="border-t" style={{ borderColor: 'var(--border)' }}>
                        <td className="py-1.5 px-3">
                          {r.valid
                            ? <CheckCircle className="w-4 h-4" style={{ color: 'var(--bosque-500)' }} />
                            : <span title={r.errors.join('; ')} className="text-[11px]" style={{ color: 'var(--rojo-falta)' }}>{r.errors[0]}</span>}
                        </td>
                        {schema.fields.slice(0, 4).map(f => (
                          <td key={f.key} className="py-1.5 px-3" style={{ color: 'var(--tinta-700)' }}>{String(r.data[f.key] ?? '—')}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {built.length > 30 && <p className="text-xs" style={{ color: 'var(--tinta-500)' }}>Mostrando 30 de {built.length} filas.</p>}
            </div>
          )}

          {/* IMPORTING */}
          {step === 'importing' && (
            <div className="flex flex-col items-center justify-center gap-3 py-14">
              <Loader2 className="w-10 h-10 animate-spin" style={{ color: 'var(--bosque-500)' }} />
              <p className="text-sm font-medium" style={{ color: 'var(--tinta)' }}>Guardando {validCount} registro(s)...</p>
            </div>
          )}

          {/* DONE */}
          {step === 'done' && (
            <div className="flex flex-col items-center justify-center gap-3 py-14 text-center">
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center" style={{ background: 'var(--bosque-50)' }}>
                <CheckCircle className="w-7 h-7" style={{ color: 'var(--bosque-600)' }} />
              </div>
              <p className="font-semibold" style={{ color: 'var(--tinta)' }}>{resultMsg}</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between gap-3 px-5 py-4 border-t shrink-0" style={{ borderColor: 'var(--border)' }}>
          {step === 'mapping' ? (
            <button onClick={() => setStep('upload')} className="btn-secondary flex items-center gap-1.5"><ArrowLeft className="w-4 h-4" /> Otro archivo</button>
          ) : step === 'preview' ? (
            <button onClick={() => setStep(source === 'pdf' ? 'upload' : 'mapping')} className="btn-secondary flex items-center gap-1.5"><ArrowLeft className="w-4 h-4" /> Atrás</button>
          ) : <span />}

          {step === 'mapping' && (
            <button onClick={continuarAPreview} disabled={schema.fields.some(f => f.required && !mapping[f.key])}
              className="btn-primary flex items-center gap-1.5 disabled:opacity-40">
              Previsualizar <ArrowRight className="w-4 h-4" />
            </button>
          )}
          {step === 'preview' && (
            <button onClick={importar} disabled={validCount === 0} className="btn-primary flex items-center gap-1.5 disabled:opacity-40">
              Importar {validCount} <ArrowRight className="w-4 h-4" />
            </button>
          )}
          {step === 'done' && <button onClick={onClose} className="btn-primary">Listo</button>}
        </div>
      </div>
    </div>
  )
}
