'use client'
import { useEffect, useState, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { formatMXN, formatDate, padNomina } from '@/lib/utils'
import { Download, FileText, FileSpreadsheet, History, Receipt, MessageCircle, Mail } from 'lucide-react'
import { generarReciboPDF, nombreArchivoRecibo } from '@/lib/export/recibo-pdf'
import type { ReciboTrabajadorInput } from '@/lib/export/recibo-trabajador'
import { ATELIER, atelierPdfHeader, atelierTable, atelierPdfFooter, aplicarEstiloFila, xlsxHeaderStyle, xlsxTotalStyle } from '@/lib/export/atelier-theme'

type PagoHistorial = {
  id: string
  nomina_id: string
  dias_trabajados: number
  horas_trabajadas: number
  horas_extra: number
  total_horas_extra: number
  subtotal: number
  descuentos: number
  total: number
  numero_nomina: number
  estado: string
  fecha_inicio: string
  fecha_fin: string
  created_at: string
}

// Campos del recibo (de nomina_lineas_calculadas), por periodo
type CalcRecibo = {
  modalidad_aplicada: string
  dias_trabajados: number
  dias_festivos: number
  horas_trabajadas: number
  horas_extra: number
  subtotal_base: number
  total_horas_extra: number
  anticipos_descontados: number
  conceptos_suma: number
  conceptos_descuento: number
  imss_obrero: number
  isr_retenido: number
  total_neto: number
  proyectoNombre: string
}

type Props = {
  trabajadorId: string
  trabajadorNombre: string
  nss?: string
}

const MESES = [
  { value: '', label: 'Todos los meses' },
  { value: '1',  label: 'Enero' },
  { value: '2',  label: 'Febrero' },
  { value: '3',  label: 'Marzo' },
  { value: '4',  label: 'Abril' },
  { value: '5',  label: 'Mayo' },
  { value: '6',  label: 'Junio' },
  { value: '7',  label: 'Julio' },
  { value: '8',  label: 'Agosto' },
  { value: '9',  label: 'Septiembre' },
  { value: '10', label: 'Octubre' },
  { value: '11', label: 'Noviembre' },
  { value: '12', label: 'Diciembre' },
]

export default function HistorialPagos({ trabajadorId, trabajadorNombre, nss }: Props) {
  const supabase = useMemo(() => createClient(), [])
  const [pagos, setPagos] = useState<PagoHistorial[]>([])
  const [loading, setLoading] = useState(true)
  // Datos para regenerar el recibo individual + estado de envio
  const [calcMap, setCalcMap] = useState<Map<string, CalcRecibo>>(new Map())
  const [enviadosMap, setEnviadosMap] = useState<Map<string, Set<string>>>(new Map())
  const [empresaNombre, setEmpresaNombre] = useState('')
  const [reciboBusyId, setReciboBusyId] = useState<string | null>(null)
  const [anio, setAnio] = useState<string>(String(new Date().getFullYear()))
  const [mes, setMes] = useState<string>('')
  const [exportingPdf, setExportingPdf] = useState(false)
  const [exportingXlsx, setExportingXlsx] = useState(false)

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      const { data, error } = await supabase
        .from('lineas_nomina')
        .select(`
          id,
          nomina_id,
          dias_trabajados,
          horas_trabajadas,
          horas_extra,
          total_horas_extra,
          subtotal,
          descuentos,
          total,
          periodos_nomina (
            numero_nomina,
            estado,
            fecha_inicio,
            fecha_fin,
            created_at
          )
        `)
        .eq('trabajador_id', trabajadorId)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('[HistorialPagos] Error cargando pagos:', error)
        setLoading(false)
        return
      }

      const rows: PagoHistorial[] = (data || [])
        .filter((r: unknown) => {
          const row = r as { periodos_nomina?: { estado?: string } }
          const estado = row.periodos_nomina?.estado
          return estado === 'generada' || estado === 'pagada'
        })
        .map((r: unknown) => {
          const row = r as {
            id: string
            nomina_id: string
            dias_trabajados: number
            horas_trabajadas: number
            horas_extra: number
            total_horas_extra: number
            subtotal: number
            descuentos: number
            total: number
            periodos_nomina: {
              numero_nomina: number
              estado: string
              fecha_inicio: string
              fecha_fin: string
              created_at: string
            }
          }
          const pn = row.periodos_nomina
          return {
            id: row.id,
            nomina_id: row.nomina_id,
            dias_trabajados: row.dias_trabajados,
            horas_trabajadas: row.horas_trabajadas,
            horas_extra: row.horas_extra,
            total_horas_extra: row.total_horas_extra,
            subtotal: row.subtotal,
            descuentos: row.descuentos,
            total: row.total,
            numero_nomina: pn.numero_nomina,
            estado: pn.estado,
            fecha_inicio: pn.fecha_inicio,
            fecha_fin: pn.fecha_fin,
            created_at: pn.created_at,
          }
        })

      setPagos(rows)
      setLoading(false)

      // Datos extra (no bloquean el render del historial): recibo + estado de envio
      const [calcRes, enviadosRes, userRes] = await Promise.all([
        supabase
          .from('nomina_lineas_calculadas')
          .select(`
            periodo_nomina_id, modalidad_aplicada, dias_trabajados, dias_festivos,
            horas_trabajadas, horas_extra, subtotal_base, total_horas_extra,
            anticipos_descontados, conceptos_suma, conceptos_descuento,
            imss_obrero, isr_retenido, total_neto,
            periodos_nomina ( proyectos ( nombre ) )
          `)
          .eq('trabajador_id', trabajadorId),
        supabase
          .from('recibos_enviados')
          .select('nomina_id, canal')
          .eq('trabajador_id', trabajadorId),
        supabase.auth.getUser(),
      ])

      const cMap = new Map<string, CalcRecibo>()
      for (const c of (calcRes.data ?? []) as unknown as Array<Record<string, unknown>>) {
        const pn = c.periodos_nomina as { proyectos?: { nombre?: string } | null } | null
        cMap.set(String(c.periodo_nomina_id), {
          modalidad_aplicada: String(c.modalidad_aplicada ?? ''),
          dias_trabajados: Number(c.dias_trabajados ?? 0),
          dias_festivos: Number(c.dias_festivos ?? 0),
          horas_trabajadas: Number(c.horas_trabajadas ?? 0),
          horas_extra: Number(c.horas_extra ?? 0),
          subtotal_base: Number(c.subtotal_base ?? 0),
          total_horas_extra: Number(c.total_horas_extra ?? 0),
          anticipos_descontados: Number(c.anticipos_descontados ?? 0),
          conceptos_suma: Number(c.conceptos_suma ?? 0),
          conceptos_descuento: Number(c.conceptos_descuento ?? 0),
          imss_obrero: Number(c.imss_obrero ?? 0),
          isr_retenido: Number(c.isr_retenido ?? 0),
          total_neto: Number(c.total_neto ?? 0),
          proyectoNombre: pn?.proyectos?.nombre ?? '',
        })
      }
      setCalcMap(cMap)

      const eMap = new Map<string, Set<string>>()
      for (const e of (enviadosRes.data ?? []) as Array<{ nomina_id: string; canal: string }>) {
        if (!eMap.has(e.nomina_id)) eMap.set(e.nomina_id, new Set())
        eMap.get(e.nomina_id)!.add(e.canal)
      }
      setEnviadosMap(eMap)

      const uid = userRes.data.user?.id
      if (uid) {
        const { data: eu } = await supabase
          .from('empresa_users')
          .select('empresas ( nombre )')
          .eq('user_id', uid)
          .single()
        const emp = eu as { empresas?: { nombre?: string } | null } | null
        setEmpresaNombre(emp?.empresas?.nombre ?? '')
      }
    }
    load()
  }, [trabajadorId, supabase])

  // Derive available years from the data
  const anos = useMemo(() => {
    const set = new Set<string>()
    pagos.forEach(p => set.add(p.fecha_inicio.slice(0, 4)))
    const current = String(new Date().getFullYear())
    set.add(current)
    return Array.from(set).sort((a, b) => Number(b) - Number(a))
  }, [pagos])

  // Apply filters
  const filtrados = useMemo(() => {
    return pagos.filter(p => {
      if (anio && !p.fecha_inicio.startsWith(anio)) return false
      if (mes) {
        const m = new Date(p.fecha_inicio + 'T12:00:00').getMonth() + 1
        if (String(m) !== mes) return false
      }
      return true
    })
  }, [pagos, anio, mes])

  // Accumulated totals
  const totales = useMemo(() => ({
    dias: filtrados.reduce((s, p) => s + p.dias_trabajados, 0),
    horas: filtrados.reduce((s, p) => s + p.horas_trabajadas, 0),
    extra: filtrados.reduce((s, p) => s + p.horas_extra, 0),
    subtotal: filtrados.reduce((s, p) => s + p.subtotal, 0),
    descuentos: filtrados.reduce((s, p) => s + p.descuentos, 0),
    total: filtrados.reduce((s, p) => s + p.total, 0),
  }), [filtrados])

  const filterLabel = () => {
    const m = mes ? MESES.find(x => x.value === mes)?.label : null
    return [m, anio].filter(Boolean).join(' ')
  }

  // Regenera el recibo individual del periodo desde los datos calculados (o fallback al resumen)
  const buildReciboInput = (p: PagoHistorial): ReciboTrabajadorInput => {
    const c = calcMap.get(p.nomina_id)
    return {
      numeroNomina: p.numero_nomina,
      fechaInicio: p.fecha_inicio,
      fechaFin: p.fecha_fin,
      proyectoNombre: c?.proyectoNombre || '—',
      empresaNombre: empresaNombre || '—',
      trabajadorNombre,
      nss,
      modalidad: c?.modalidad_aplicada || 'por_dia',
      diasTrabajados: c?.dias_trabajados ?? p.dias_trabajados,
      diasFestivos: c?.dias_festivos ?? 0,
      horasTrabajadas: c?.horas_trabajadas ?? p.horas_trabajadas,
      horasExtra: c?.horas_extra ?? p.horas_extra,
      subtotalBase: c?.subtotal_base ?? p.subtotal,
      totalHorasExtra: c?.total_horas_extra ?? p.total_horas_extra,
      anticiposDescontados: c?.anticipos_descontados ?? 0,
      conceptosSuma: c?.conceptos_suma ?? 0,
      conceptosDescuento: c?.conceptos_descuento ?? p.descuentos,
      imssObrero: c?.imss_obrero ?? 0,
      isrRetenido: c?.isr_retenido ?? 0,
      totalNeto: c?.total_neto ?? p.total,
    }
  }

  const handleDescargarRecibo = (p: PagoHistorial) => {
    setReciboBusyId(p.id)
    try {
      const blob = generarReciboPDF(buildReciboInput(p))
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = nombreArchivoRecibo(trabajadorNombre, p.numero_nomina)
      a.click()
      URL.revokeObjectURL(url)
    } catch (err) {
      console.error('[HistorialPagos] Error generando recibo:', err)
    } finally {
      setReciboBusyId(null)
    }
  }

  const handleExportPdf = async () => {
    if (!filtrados.length) return
    setExportingPdf(true)
    try {
      const jsPDF = (await import('jspdf')).default
      const autoTable = (await import('jspdf-autotable')).default
      const doc = new jsPDF()

      const y = atelierPdfHeader(doc, {
        titulo: 'Historial de pagos',
        subtitulo: trabajadorNombre,
        meta: filterLabel() ? [`Filtro: ${filterLabel()}`] : [],
      })

      autoTable(doc, atelierTable({
        startY: y,
        head: [['Nomina', 'Periodo', 'Dias', 'Horas', 'H.Extra', 'Subtotal', 'Descuentos', 'Total']],
        body: filtrados.map(p => [
          padNomina(p.numero_nomina),
          `${formatDate(p.fecha_inicio)} - ${formatDate(p.fecha_fin)}`,
          p.dias_trabajados,
          p.horas_trabajadas,
          p.horas_extra,
          formatMXN(p.subtotal),
          formatMXN(p.descuentos),
          formatMXN(p.total),
        ]),
        foot: [[
          'TOTALES', '',
          totales.dias,
          totales.horas,
          totales.extra,
          formatMXN(totales.subtotal),
          formatMXN(totales.descuentos),
          formatMXN(totales.total),
        ]],
        footStyles: { fillColor: ATELIER.cuero100, textColor: ATELIER.tinta, fontStyle: 'bold', fontSize: 7 },
        styles: { font: 'helvetica', fontSize: 7, cellPadding: 2, lineColor: ATELIER.cuero200, lineWidth: 0.1 },
        columnStyles: {
          5: { halign: 'right' },
          6: { halign: 'right' },
          7: { halign: 'right', fontStyle: 'bold' },
        },
      }))

      atelierPdfFooter(doc)
      const safeName = trabajadorNombre.replace(/\s+/g, '-').toLowerCase()
      doc.save(`historial-${safeName}-${anio || 'todos'}${mes ? `-mes${mes}` : ''}.pdf`)
    } catch (err) {
      console.error('Error exportando PDF:', err)
    } finally {
      setExportingPdf(false)
    }
  }

  const handleExportXlsx = async () => {
    if (!filtrados.length) return
    setExportingXlsx(true)
    try {
      const XLSX = await import('xlsx-js-style')
      const rows = filtrados.map(p => ({
        'Nomina': padNomina(p.numero_nomina),
        'Fecha inicio': p.fecha_inicio,
        'Fecha fin': p.fecha_fin,
        'Estado': p.estado,
        'Dias trabajados': p.dias_trabajados,
        'Horas trabajadas': p.horas_trabajadas,
        'Horas extra': p.horas_extra,
        'Subtotal': p.subtotal,
        'Descuentos': p.descuentos,
        'Total': p.total,
      }))
      // Totals row
      rows.push({
        'Nomina': 'TOTALES',
        'Fecha inicio': '',
        'Fecha fin': '',
        'Estado': '',
        'Dias trabajados': totales.dias,
        'Horas trabajadas': totales.horas,
        'Horas extra': totales.extra,
        'Subtotal': totales.subtotal,
        'Descuentos': totales.descuentos,
        'Total': totales.total,
      })

      const ws = XLSX.utils.json_to_sheet(rows)
      const NCOLS = 10
      ws['!cols'] = [{ wch: 10 }, { wch: 12 }, { wch: 12 }, { wch: 10 }, { wch: 14 }, { wch: 14 }, { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 12 }]
      aplicarEstiloFila(ws, 0, NCOLS, xlsxHeaderStyle)          // encabezados
      aplicarEstiloFila(ws, rows.length, NCOLS, xlsxTotalStyle) // fila TOTALES
      const wb = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(wb, ws, 'Historial')
      const safeName = trabajadorNombre.replace(/\s+/g, '-').toLowerCase()
      XLSX.writeFile(wb, `historial-${safeName}-${anio || 'todos'}${mes ? `-mes${mes}` : ''}.xlsx`)
    } catch (err) {
      console.error('Error exportando Excel:', err)
    } finally {
      setExportingXlsx(false)
    }
  }

  // --- Skeleton ---
  if (loading) {
    return (
      <div className="space-y-3">
        <div className="h-7 w-48 bg-slate-200 dark:bg-slate-700 rounded animate-pulse" />
        <div className="h-48 w-full bg-slate-100 dark:bg-slate-800 rounded-xl animate-pulse" />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Section header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <History className="w-5 h-5" style={{ color: 'var(--primary)' }} />
          <h2 className="font-display text-lg font-bold" style={{ color: 'var(--tinta)' }}>Historial de pagos</h2>
          {filtrados.length > 0 && (
            <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ background: 'var(--bosque-50)', color: 'var(--bosque-600)' }}>
              {filtrados.length} periodo{filtrados.length !== 1 ? 's' : ''}
            </span>
          )}
        </div>

        {/* Export buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleExportPdf}
            disabled={exportingPdf || !filtrados.length}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border border-border rounded-lg hover:bg-gray-50 disabled:opacity-40 transition-colors" style={{ color: 'var(--tinta-500)' }}
          >
            <FileText className="w-3.5 h-3.5" />
            {exportingPdf ? 'Exportando...' : 'PDF'}
          </button>
          <button
            onClick={handleExportXlsx}
            disabled={exportingXlsx || !filtrados.length}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border border-border rounded-lg hover:bg-gray-50 disabled:opacity-40 transition-colors" style={{ color: 'var(--tinta-500)' }}
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            {exportingXlsx ? 'Exportando...' : 'Excel'}
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div>
          <label className="label sr-only">Ano</label>
          <select
            value={anio}
            onChange={e => setAnio(e.target.value)}
            className="input text-sm py-1.5 pr-8"
          >
            <option value="">Todos los anos</option>
            {anos.map(a => (
              <option key={a} value={a}>{a}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="label sr-only">Mes</label>
          <select
            value={mes}
            onChange={e => setMes(e.target.value)}
            className="input text-sm py-1.5 pr-8"
          >
            {MESES.map(m => (
              <option key={m.value} value={m.value}>{m.label}</option>
            ))}
          </select>
        </div>
        {(anio || mes) && (
          <button
            type="button"
            onClick={() => { setAnio(''); setMes('') }}
            className="text-xs text-ink-soft hover:text-ink underline"
          >
            Limpiar filtros
          </button>
        )}
      </div>

      {/* Empty state */}
      {!filtrados.length ? (
        <div className="border border-dashed border-border rounded-xl py-12 text-center">
          <Download className="w-10 h-10 mx-auto mb-3" style={{ color: 'var(--tinta-500)', opacity: 0.4 }} />
          <p className="text-sm" style={{ color: 'var(--tinta-500)' }}>
            {pagos.length === 0
              ? 'Este trabajador no tiene pagos registrados en nominas generadas o pagadas.'
              : 'No hay pagos en el periodo seleccionado.'}
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border dark:border-slate-700/40">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ background: 'var(--surface-2)', borderBottom: '1px solid var(--border)' }}>
                <th className="px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wide whitespace-nowrap" style={{ color: 'var(--tinta-500)' }}>Nómina</th>
                <th className="px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wide whitespace-nowrap" style={{ color: 'var(--tinta-500)' }}>Periodo</th>
                <th className="px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wide whitespace-nowrap" style={{ color: 'var(--tinta-500)' }}>Estado</th>
                <th className="px-3 py-2.5 text-right text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--tinta-500)' }}>Días</th>
                <th className="px-3 py-2.5 text-right text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--tinta-500)' }}>Horas</th>
                <th className="px-3 py-2.5 text-right text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--tinta-500)' }}>H.Extra</th>
                <th className="px-3 py-2.5 text-right text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--tinta-500)' }}>Subtotal</th>
                <th className="px-3 py-2.5 text-right text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--tinta-500)' }}>Descuentos</th>
                <th className="px-3 py-2.5 text-right text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--tinta-500)' }}>Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtrados.map(p => (
                <tr
                  key={p.id}
                  className="hover:bg-[var(--table-hover)] transition-colors"
                  style={{ background: 'var(--surface)' }}
                >
                  <td className="px-3 py-2.5 font-mono text-xs font-medium tabular-nums" style={{ color: 'var(--tinta)' }}>
                    <span>{padNomina(p.numero_nomina)}</span>
                    <button
                      onClick={() => handleDescargarRecibo(p)}
                      disabled={reciboBusyId === p.id}
                      title="Descargar recibo del trabajador"
                      className="mt-1 flex items-center gap-1 text-[11px] font-sans font-medium rounded-md px-1.5 py-0.5 border disabled:opacity-40 transition-colors hover:bg-[var(--table-hover)]"
                      style={{ color: 'var(--bosque-600)', borderColor: 'var(--border)' }}
                    >
                      <Receipt className="w-3 h-3" />
                      {reciboBusyId === p.id ? '...' : 'Recibo'}
                    </button>
                  </td>
                  <td className="px-3 py-2.5 text-xs whitespace-nowrap" style={{ color: 'var(--tinta-500)' }}>
                    {formatDate(p.fecha_inicio)}<span className="mx-1" style={{ color: 'var(--border-bright)' }}>-</span>{formatDate(p.fecha_fin)}
                  </td>
                  <td className="px-3 py-2.5">
                    <div className="flex items-center gap-1.5">
                      <span
                        className="inline-block text-xs px-2 py-0.5 rounded-full font-medium"
                        style={p.estado === 'pagada'
                          ? { background: 'var(--bosque-50)', color: 'var(--bosque-600)' }
                          : { background: 'var(--petroleo-50)', color: 'var(--petroleo-500)' }
                        }
                      >
                        {p.estado === 'pagada' ? 'Pagada' : 'Generada'}
                      </span>
                      {enviadosMap.get(p.nomina_id)?.has('whatsapp') && (
                        <MessageCircle className="w-3.5 h-3.5" style={{ color: '#25D366' }} aria-label="Enviado por WhatsApp" />
                      )}
                      {enviadosMap.get(p.nomina_id)?.has('email') && (
                        <Mail className="w-3.5 h-3.5" style={{ color: 'var(--bosque-500)' }} aria-label="Enviado por email" />
                      )}
                    </div>
                  </td>
                  <td className="px-3 py-2.5 text-right text-xs tabular-nums" style={{ color: 'var(--tinta)' }}>{p.dias_trabajados}</td>
                  <td className="px-3 py-2.5 text-right text-xs tabular-nums" style={{ color: 'var(--tinta)' }}>{p.horas_trabajadas}</td>
                  <td className="px-3 py-2.5 text-right text-xs tabular-nums" style={{ color: 'var(--tinta)' }}>{p.horas_extra}</td>
                  <td className="px-3 py-2.5 text-right text-xs tabular-nums" style={{ color: 'var(--tinta)' }}>{formatMXN(p.subtotal)}</td>
                  <td className="px-3 py-2.5 text-right text-xs tabular-nums" style={{ color: 'var(--rojo-falta)' }}>{formatMXN(p.descuentos)}</td>
                  <td className="px-3 py-2.5 text-right text-xs font-semibold tabular-nums" style={{ color: 'var(--tinta)' }}>{formatMXN(p.total)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr style={{ background: 'var(--surface-2)', borderTop: '2px solid var(--border)' }}>
                <td colSpan={3} className="px-3 py-2.5 text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--tinta)' }}>
                  Totales ({filtrados.length} periodo{filtrados.length !== 1 ? 's' : ''})
                </td>
                <td className="px-3 py-2.5 text-right text-xs font-semibold tabular-nums" style={{ color: 'var(--tinta)' }}>{totales.dias}</td>
                <td className="px-3 py-2.5 text-right text-xs font-semibold tabular-nums" style={{ color: 'var(--tinta)' }}>{totales.horas}</td>
                <td className="px-3 py-2.5 text-right text-xs font-semibold tabular-nums" style={{ color: 'var(--tinta)' }}>{totales.extra}</td>
                <td className="px-3 py-2.5 text-right text-xs font-semibold tabular-nums" style={{ color: 'var(--tinta)' }}>{formatMXN(totales.subtotal)}</td>
                <td className="px-3 py-2.5 text-right text-xs font-semibold tabular-nums" style={{ color: 'var(--rojo-falta)' }}>{formatMXN(totales.descuentos)}</td>
                <td className="px-3 py-2.5 text-right text-sm font-bold tabular-nums" style={{ color: 'var(--primary)' }}>{formatMXN(totales.total)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  )
}
