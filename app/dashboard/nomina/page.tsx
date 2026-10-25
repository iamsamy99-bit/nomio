'use client'
import { useEffect, useState, useCallback, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { Plus, ClipboardList, Trash2, Upload, AlertCircle, X, Loader2 } from 'lucide-react'
import { formatMXN, formatDate, padNomina } from '@/lib/utils'
import { useEmpresa } from '@/components/layout/EmpresaContext'

function estadoLabel(e: string): string {
  if (e === 'pagada')   return 'Pagada'
  if (e === 'generada') return 'Generada'
  return 'En progreso'
}

type Nomina = {
  id: string
  numero_nomina: number
  estado: string
  fecha_inicio: string
  fecha_fin: string
  total_nomina: number
  created_at: string
  proyectos: { nombre: string; color_etiqueta: string } | null
}

export default function NominaListPage() {
  const supabase = useMemo(() => createClient(), [])
  const { empresaId } = useEmpresa()
  const [nominas, setNominas] = useState<Nomina[]>([])
  const [loading, setLoading] = useState(true)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [confirmTarget, setConfirmTarget] = useState<Nomina | null>(null)
  const [pageError, setPageError] = useState('')
  const [importMsg, setImportMsg] = useState('')
  const [filtroEstado, setFiltroEstado] = useState<string>('todas')

  const loadData = useCallback(async () => {
    try {
      // empresaId comes from the dashboard layout via context; no per-page
      // getUser() + empresa_users roundtrip needed.
      const { data } = await supabase
        .from('periodos_nomina').select('*, proyectos(nombre, color_etiqueta)')
        .eq('empresa_id', empresaId)
        .order('created_at', { ascending: false })
      setNominas((data as Nomina[]) || [])
    } catch (err) {
      console.error('[nomina list] loadData', err)
    } finally {
      setLoading(false)
    }
  }, [supabase, empresaId])

  useEffect(() => { loadData() }, [loadData])

  const handleDeleteConfirmed = async () => {
    if (!confirmTarget) return
    const n = confirmTarget
    setConfirmTarget(null)
    setDeleting(n.id)
    setPageError('')
    const { error } = await supabase.from('periodos_nomina').delete().eq('id', n.id)
    if (error) {
      console.error('[nomina list] delete', error)
      setPageError(`No se pudo eliminar la nómina: ${error.message}`)
      setDeleting(null)
      return
    }
    setNominas(prev => prev.filter(x => x.id !== n.id))
    setDeleting(null)
  }

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return
    setPageError(''); setImportMsg('')
    try {
      const XLSX = await import('xlsx')
      const buffer = await file.arrayBuffer()
      const wb = XLSX.read(buffer, { type: 'array' })
      const ws = wb.Sheets[wb.SheetNames[0]]
      const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws)

      const { data: proyectos } = await supabase.from('proyectos')
        .select('id, nombre').eq('empresa_id', empresaId).eq('activo', true)
      const proyMap: Record<string, string> = {}
      for (const p of proyectos || []) proyMap[p.nombre.toLowerCase()] = p.id

      const descartadas: string[] = []
      const payload = rows.flatMap((r, i) => {
        const proyNombre = String(r.Proyecto || r.proyecto || '').trim()
        const proyId = proyMap[proyNombre.toLowerCase()] || null
        const fechaInicio = String(r['Fecha Inicio'] || r.fecha_inicio || '').trim()
        const fechaFin    = String(r['Fecha Fin']    || r.fecha_fin    || '').trim()
        if (!proyId || !fechaInicio || !fechaFin) {
          descartadas.push(`Fila ${i + 2}: ${!proyId ? `proyecto "${proyNombre || '(vacío)'}" no encontrado` : 'fechas incompletas'}`)
          return []
        }
        return [{
          empresa_id: empresaId,
          proyecto_id: proyId,
          fecha_inicio: fechaInicio,
          fecha_fin: fechaFin,
          estado: 'en_progreso',
          total_nomina: 0,
        }]
      })

      if (!payload.length) {
        setPageError(descartadas.length
          ? `Ninguna fila válida. ${descartadas.slice(0, 3).join('; ')}${descartadas.length > 3 ? ` y ${descartadas.length - 3} más` : ''}`
          : 'No se encontraron registros válidos. Verifica que las columnas sean: Proyecto, Fecha Inicio, Fecha Fin, y que los proyectos existan.')
        e.target.value = ''; return
      }
      const { error: impErr } = await supabase.from('periodos_nomina').insert(payload)
      if (impErr) {
        console.error('[nomina list] import', impErr)
        setPageError(`Error al importar: ${impErr.message}`)
      } else {
        setImportMsg(`${payload.length} nómina(s) creada(s) como en progreso.${descartadas.length ? ` ${descartadas.length} fila(s) omitida(s): ${descartadas.slice(0, 3).join('; ')}${descartadas.length > 3 ? '...' : ''}` : ''}`)
        await loadData()
      }
    } catch (err) {
      console.error('[nomina list] import unexpected', err)
      setPageError('No se pudo importar el archivo. Verifica el formato.')
    } finally {
      e.target.value = ''
    }
  }

  const badge = (e: string) => e === 'pagada' ? 'badge-pagada' : e === 'generada' ? 'badge-generada' : 'badge-en-progreso'

  const conteos = useMemo(() => {
    const c = { en_progreso: 0, generada: 0, pagada: 0, total: 0 }
    for (const n of nominas) {
      if (n.estado === 'pagada') c.pagada++
      else if (n.estado === 'generada') c.generada++
      else c.en_progreso++
      c.total += n.total_nomina || 0
    }
    return c
  }, [nominas])

  const nominasFiltradas = useMemo(
    () => filtroEstado === 'todas' ? nominas : nominas.filter(n => n.estado === filtroEstado),
    [nominas, filtroEstado]
  )

  const FILTROS: { key: string; label: string; count: number }[] = [
    { key: 'todas',       label: 'Todas',       count: nominas.length },
    { key: 'en_progreso', label: 'En progreso', count: conteos.en_progreso },
    { key: 'generada',    label: 'Generadas',   count: conteos.generada },
    { key: 'pagada',      label: 'Pagadas',     count: conteos.pagada },
  ]

  if (loading) return (
    <div className="max-w-4xl mx-auto space-y-3">
      <div className="flex items-center justify-between mb-6">
        <div className="h-8 w-32 rounded-xl" style={{ background: 'var(--surface-3)' }} />
        <div className="h-9 w-40 rounded-xl" style={{ background: 'var(--surface-3)' }} />
      </div>
      {[1, 2, 3, 4].map(i => (
        <div key={i} className="flex items-center gap-4 px-5 py-4 rounded-xl" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
          <div className="w-1 h-10 rounded-full shrink-0" style={{ background: 'var(--surface-3)' }} />
          <div className="flex-1 space-y-2">
            <div className="h-3 w-24 rounded" style={{ background: 'var(--surface-3)' }} />
            <div className="h-4 w-48 rounded" style={{ background: 'var(--surface-3)' }} />
            <div className="h-3 w-36 rounded" style={{ background: 'var(--surface-3)' }} />
          </div>
          <div className="h-6 w-24 rounded-full shrink-0" style={{ background: 'var(--surface-3)' }} />
          <div className="h-5 w-28 rounded shrink-0 text-right" style={{ background: 'var(--surface-3)' }} />
        </div>
      ))}
    </div>
  )

  return (
    <>
      {/* Modal de confirmación de eliminación */}
      {confirmTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setConfirmTarget(null)} />
          <div
            className="relative rounded-2xl p-6 w-full max-w-sm animate-scale-in"
            style={{ background: 'var(--surface)', border: '1px solid var(--border)', boxShadow: '0 20px 60px rgba(0,0,0,0.20)' }}
          >
            <div
              className="w-11 h-11 rounded-xl flex items-center justify-center mb-4"
              style={{ background: 'rgba(239,68,68,0.10)', border: '1px solid rgba(239,68,68,0.20)' }}
            >
              <Trash2 className="w-5 h-5" style={{ color: 'var(--error)' }} />
            </div>
            <h3 className="font-semibold text-base mb-1" style={{ color: 'var(--text)', fontFamily: "'Space Grotesk', sans-serif" }}>
              Eliminar nómina {padNomina(confirmTarget.numero_nomina)}
            </h3>
            <p className="text-sm mb-5" style={{ color: 'var(--text-muted)' }}>
              Se eliminarán líneas y conceptos. Las asistencias del período <strong style={{ color: 'var(--text)' }}>no se eliminan</strong>, solo se desvinculan.
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setConfirmTarget(null)}
                className="btn-secondary flex-1"
              >
                Cancelar
              </button>
              <button
                onClick={handleDeleteConfirmed}
                disabled={!!deleting}
                className="flex-1 flex items-center justify-center gap-2 font-semibold px-4 py-2 rounded-xl text-sm cursor-pointer transition-all duration-200 disabled:opacity-50"
                style={{ background: 'var(--error)', color: '#fff' }}
              >
                {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-6 gap-3 flex-wrap">
          <h1 className="font-display text-2xl font-bold" style={{ color: 'var(--text)' }}>Nóminas</h1>
          <div className="flex items-center gap-2">
            <label className="btn-secondary flex items-center gap-1 cursor-pointer text-xs py-1.5">
              <Upload className="w-3.5 h-3.5" /> Importar
              <input type="file" accept=".xlsx,.xls,.csv" onChange={handleImport} className="hidden" />
            </label>
            <Link href="/dashboard/nomina/nueva/wizard" className="btn-primary flex items-center gap-2">
              <Plus className="w-4 h-4" /> Nueva nómina
            </Link>
          </div>
        </div>

        {pageError && (
          <div
            className="flex items-start gap-2 text-sm p-3 rounded-xl mb-4"
            style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.20)', color: 'var(--error)' }}
          >
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <div className="flex-1">{pageError}</div>
            <button onClick={() => setPageError('')} className="shrink-0 opacity-60 hover:opacity-100 transition-opacity"><X className="w-4 h-4" /></button>
          </div>
        )}
        {importMsg && (
          <div
            className="flex items-center gap-2 text-sm p-3 rounded-xl mb-4"
            style={{ background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.20)', color: '#16a34a' }}
          >
            <span className="flex-1">{importMsg}</span>
            <button onClick={() => setImportMsg('')} className="opacity-60 hover:opacity-100 transition-opacity"><X className="w-4 h-4" /></button>
          </div>
        )}

        {nominas.length > 0 && (
          <div className="flex items-center justify-between gap-3 flex-wrap mb-4">
            <div className="flex items-center gap-1.5 flex-wrap">
              {FILTROS.map(f => (
                <button
                  key={f.key}
                  onClick={() => setFiltroEstado(f.key)}
                  className="text-xs font-medium px-3 py-1.5 rounded-full transition-colors"
                  style={filtroEstado === f.key
                    ? { background: 'var(--text)', color: 'var(--surface)' }
                    : { background: 'var(--surface-2)', color: 'var(--text-muted)', border: '1px solid var(--border)' }}
                >
                  {f.label} ({f.count})
                </button>
              ))}
            </div>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
              Total acumulado: <span className="font-mono font-bold" style={{ color: 'var(--text)' }}>{formatMXN(conteos.total)}</span>
            </p>
          </div>
        )}

        {!nominas.length ? (
          <div className="tile text-center py-16">
            <div
              className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4"
              style={{ background: 'var(--surface-2)', border: '1px solid var(--border)' }}
            >
              <ClipboardList className="w-7 h-7" style={{ color: 'var(--text-muted)' }} />
            </div>
            <p className="text-sm mb-4" style={{ color: 'var(--text-muted)' }}>No hay nóminas aún.</p>
            <Link href="/dashboard/nomina/nueva/wizard" className="btn-primary">Crear primera nómina</Link>
          </div>
        ) : (
          <div className="tile p-0 overflow-hidden">
            <div className="divide-y" style={{ borderColor: 'var(--divider)' }}>
              {nominasFiltradas.length === 0 && (
                <p className="text-sm text-center py-10" style={{ color: 'var(--text-muted)' }}>
                  No hay nóminas con este estado.
                </p>
              )}
              {nominasFiltradas.map(n => {
                const proyecto = n.proyectos
                const enProgreso = n.estado === 'en_progreso'
                return (
                  <div key={n.id} className="flex items-center gap-4 px-5 py-4 hover:bg-[var(--table-hover)] transition-colors">
                    <Link
                      href={enProgreso ? `/dashboard/nomina/${n.id}/wizard?step=2` : `/dashboard/nomina/${n.id}`}
                      className="flex-1 min-w-0 flex items-center gap-4">
                      <div className="w-1 h-10 rounded-full shrink-0" style={{ backgroundColor: proyecto?.color_etiqueta || '#1B4F72' }} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="font-mono text-xs" style={{ color: 'var(--text-muted)' }}>{padNomina(n.numero_nomina)}</span>
                          <span className={badge(n.estado)}>{estadoLabel(n.estado)}</span>
                        </div>
                        <p className="font-medium text-sm" style={{ color: 'var(--text)' }}>{proyecto?.nombre}</p>
                        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{formatDate(n.fecha_inicio)} — {formatDate(n.fecha_fin)}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="font-mono font-bold text-accent">{formatMXN(n.total_nomina)}</p>
                        <p className="text-xs mt-0.5" style={{ color: enProgreso ? 'var(--accent, #1B6CA8)' : 'var(--text-muted)' }}>
                          {enProgreso ? 'Continuar en wizard →' : 'Total nómina'}
                        </p>
                      </div>
                    </Link>
                    <button
                      onClick={() => setConfirmTarget(n)}
                      disabled={deleting === n.id}
                      className="p-2 rounded-lg transition-colors shrink-0 disabled:opacity-50"
                      style={{ color: 'var(--text-muted)' }}
                      onMouseEnter={e => (e.currentTarget.style.color = 'var(--error)', e.currentTarget.style.background = 'rgba(239,68,68,0.08)')}
                      onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-muted)', e.currentTarget.style.background = 'transparent')}
                      title="Eliminar nómina"
                    >
                      {deleting === n.id
                        ? <Loader2 className="w-4 h-4 animate-spin" />
                        : <Trash2 className="w-4 h-4" />
                      }
                    </button>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </>
  )
}
