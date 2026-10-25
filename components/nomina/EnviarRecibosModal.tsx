'use client'
import { useState, useCallback } from 'react'
import { X, MessageCircle, Mail, Download, CheckCircle, AlertCircle, ChevronRight, SkipForward } from 'lucide-react'
import { buildReciboText, enviarReciboWhatsApp } from '@/lib/export/recibo-trabajador'
import { generarReciboPDF, nombreArchivoRecibo } from '@/lib/export/recibo-pdf'
import { formatMXN } from '@/lib/utils'
import { normalizeWhatsAppPhone } from '@/lib/crm/share-cotizacion'
import type { LineaCalculada } from '@/components/nomina/NominaLineasTable'
import type { Trabajador } from '@/types'

interface NominaRef {
  id: string
  numero_nomina: number
  fecha_inicio: string
  fecha_fin: string
}

interface Props {
  nomina: NominaRef
  proyecto: string
  empresaNombre: string
  lineasCalculadas: LineaCalculada[]
  trabajadoresMap: Map<string, Trabajador>
  onClose: () => void
}

type EstadoEnvio = 'pendiente' | 'whatsapp' | 'email' | 'omitido'

interface FilaRecibo {
  lc: LineaCalculada
  trab: Trabajador | undefined
  estado: EstadoEnvio
}

function buildInput(lc: LineaCalculada, trab: Trabajador | undefined, nomina: NominaRef, proyecto: string, empresaNombre: string) {
  return {
    numeroNomina: nomina.numero_nomina,
    fechaInicio: nomina.fecha_inicio,
    fechaFin: nomina.fecha_fin,
    proyectoNombre: proyecto,
    empresaNombre,
    trabajadorNombre: lc.trabajador_nombre,
    nss: trab?.nss ?? undefined,
    modalidad: lc.modalidad_aplicada,
    diasTrabajados: lc.dias_trabajados,
    diasFestivos: lc.dias_festivos,
    horasTrabajadas: lc.horas_trabajadas,
    horasExtra: lc.horas_extra,
    subtotalBase: lc.subtotal_base,
    totalHorasExtra: lc.total_horas_extra,
    anticiposDescontados: lc.anticipos_descontados,
    conceptosSuma: lc.conceptos_suma,
    conceptosDescuento: lc.conceptos_descuento,
    imssObrero: lc.imss_obrero,
    isrRetenido: lc.isr_retenido,
    totalNeto: lc.total_neto,
  }
}

export default function EnviarRecibosModal({ nomina, proyecto, empresaNombre, lineasCalculadas, trabajadoresMap, onClose }: Props) {
  const [filas, setFilas] = useState<FilaRecibo[]>(() =>
    lineasCalculadas.map(lc => ({ lc, trab: trabajadoresMap.get(lc.trabajador_id), estado: 'pendiente' as EstadoEnvio }))
  )
  const [colaIdx, setColaIdx] = useState<number | null>(null)
  const [emailLoading, setEmailLoading] = useState(false)
  const [emailMsg, setEmailMsg] = useState('')

  const marcar = (idx: number, estado: EstadoEnvio) =>
    setFilas(prev => prev.map((f, i) => i === idx ? { ...f, estado } : f))

  const iniciarCola = () => {
    const primero = filas.findIndex(f => f.estado === 'pendiente')
    setColaIdx(primero >= 0 ? primero : null)
  }

  const abrirWA = (idx: number) => {
    const f = filas[idx]
    const input = buildInput(f.lc, f.trab, nomina, proyecto, empresaNombre)
    const text = buildReciboText(input)
    const telefono = f.trab?.telefono ?? ''
    const phone = normalizeWhatsAppPhone(telefono)
    if (phone) {
      window.open(`https://wa.me/${phone}?text=${encodeURIComponent(text)}`, '_blank')
    } else {
      navigator.clipboard.writeText(text).catch(() => {})
    }
    marcar(idx, 'whatsapp')
    const siguiente = filas.findIndex((f2, i) => i > idx && f2.estado === 'pendiente')
    setColaIdx(siguiente >= 0 ? siguiente : null)
  }

  const omitir = (idx: number) => {
    marcar(idx, 'omitido')
    const siguiente = filas.findIndex((f2, i) => i > idx && f2.estado === 'pendiente')
    setColaIdx(siguiente >= 0 ? siguiente : null)
  }

  const descargarPDF = useCallback((idx: number) => {
    const f = filas[idx]
    const input = buildInput(f.lc, f.trab, nomina, proyecto, empresaNombre)
    const blob = generarReciboPDF(input)
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = nombreArchivoRecibo(f.lc.trabajador_nombre, nomina.numero_nomina)
    a.click()
    URL.revokeObjectURL(url)
  }, [filas, nomina, proyecto, empresaNombre])

  const enviarEmails = async () => {
    const admins = filas.filter(f => f.trab?.es_administrativo && f.trab?.email?.includes('@'))
    if (!admins.length) { setEmailMsg('Ningun administrativo tiene email registrado.'); return }
    setEmailLoading(true)
    setEmailMsg('')
    try {
      const res = await fetch('/api/nomina/enviar-recibos-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nominaId: nomina.id,
          numeroNomina: nomina.numero_nomina,
          fechaInicio: nomina.fecha_inicio,
          fechaFin: nomina.fecha_fin,
          proyectoNombre: proyecto,
          empresaNombre,
          trabajadores: admins.map(f => ({
            trabajadorId: f.lc.trabajador_id,
            nombre: f.lc.trabajador_nombre,
            email: f.trab!.email ?? '',
            modalidad: f.lc.modalidad_aplicada,
            diasTrabajados: f.lc.dias_trabajados,
            diasFestivos: f.lc.dias_festivos,
            horasExtra: f.lc.horas_extra,
            subtotalBase: f.lc.subtotal_base,
            totalHorasExtra: f.lc.total_horas_extra,
            conceptosSuma: f.lc.conceptos_suma,
            conceptosDescuento: f.lc.conceptos_descuento,
            anticiposDescontados: f.lc.anticipos_descontados,
            imssObrero: f.lc.imss_obrero,
            isrRetenido: f.lc.isr_retenido,
            totalNeto: f.lc.total_neto,
          })),
        }),
      })
      const data = await res.json()
      if (!res.ok) { setEmailMsg(data.error ?? 'Error al enviar'); return }
      const idEnviados: string[] = admins.slice(0, data.enviados ?? 0).map(f => f.lc.trabajador_id)
      setFilas(prev => prev.map(f => idEnviados.includes(f.lc.trabajador_id) ? { ...f, estado: 'email' } : f))
      setEmailMsg(`${data.enviados} email(s) enviados${data.fallidos?.length ? `, ${data.fallidos.length} sin email` : ''}.`)
    } catch {
      setEmailMsg('Error de conexion.')
    } finally {
      setEmailLoading(false)
    }
  }

  const colaPendientes = filas.filter(f => f.estado === 'pendiente').length
  const filaActual = colaIdx !== null ? filas[colaIdx] : null

  const estadoIcon = (estado: EstadoEnvio) => {
    if (estado === 'whatsapp') return <MessageCircle className="w-4 h-4" style={{ color: '#25D366' }} />
    if (estado === 'email') return <Mail className="w-4 h-4" style={{ color: 'var(--bosque-500)' }} />
    if (estado === 'omitido') return <SkipForward className="w-4 h-4" style={{ color: 'var(--tinta-500)' }} />
    return <div className="w-4 h-4 rounded-full border-2 shrink-0" style={{ borderColor: 'var(--border)' }} />
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4" style={{ background: 'rgba(0,0,0,0.5)' }}>
      <div className="w-full sm:max-w-lg rounded-t-2xl sm:rounded-2xl flex flex-col max-h-[90vh]" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>

        <div className="flex items-center justify-between px-5 py-4 border-b shrink-0" style={{ borderColor: 'var(--border)' }}>
          <div>
            <h2 className="font-display font-semibold text-base" style={{ color: 'var(--tinta)' }}>Enviar recibos</h2>
            <p className="text-xs mt-0.5" style={{ color: 'var(--tinta-500)' }}>{filas.length} trabajadores</p>
          </div>
          <button onClick={onClose}><X className="w-5 h-5" style={{ color: 'var(--tinta-500)' }} /></button>
        </div>

        {filaActual && (
          <div className="mx-4 mt-4 p-4 rounded-xl shrink-0" style={{ background: 'var(--bosque-50)', border: '1px solid rgba(58,78,46,0.2)' }}>
            <p className="text-xs font-semibold uppercase tracking-wide mb-1" style={{ color: 'var(--bosque-500)' }}>
              Trabajador {filas.indexOf(filaActual) + 1} de {filas.length}
            </p>
            <p className="font-semibold mb-0.5" style={{ color: 'var(--tinta)' }}>{filaActual.lc.trabajador_nombre}</p>
            <p className="text-xs mb-3" style={{ color: 'var(--tinta-500)' }}>
              {filaActual.trab?.telefono ?? 'Sin telefono -- se copiara el texto'}
              &nbsp;&bull;&nbsp;{formatMXN(filaActual.lc.total_neto)}
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => abrirWA(filas.indexOf(filaActual))}
                className="flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-semibold text-white"
                style={{ background: '#25D366' }}
              >
                <MessageCircle className="w-4 h-4" />
                {filaActual.trab?.telefono ? 'Abrir WhatsApp' : 'Copiar texto'}
              </button>
              <button
                onClick={() => omitir(filas.indexOf(filaActual))}
                className="px-3 py-2 rounded-lg text-sm border"
                style={{ color: 'var(--tinta-500)', borderColor: 'var(--border)' }}
              >
                Omitir
              </button>
            </div>
          </div>
        )}

        <div className="overflow-y-auto flex-1 px-4 py-3 space-y-1">
          {filas.map((f, i) => (
            <div key={f.lc.trabajador_id} className="flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors"
              style={{ background: colaIdx === i ? 'rgba(58,78,46,0.06)' : undefined }}>
              {estadoIcon(f.estado)}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate" style={{ color: 'var(--tinta)' }}>{f.lc.trabajador_nombre}</p>
                <p className="text-xs truncate" style={{ color: 'var(--tinta-500)' }}>
                  {f.trab?.es_administrativo ? 'Admin' : 'Campo'}
                  {f.trab?.telefono ? ` · ${f.trab.telefono}` : ' · sin tel'}
                  {f.trab?.email ? ` · ${f.trab.email}` : ''}
                </p>
              </div>
              <span className="text-sm font-mono shrink-0" style={{ color: 'var(--tinta)' }}>{formatMXN(f.lc.total_neto)}</span>
              <button onClick={() => descargarPDF(i)} title="Descargar PDF" className="p-1 rounded opacity-50 hover:opacity-100">
                <Download className="w-3.5 h-3.5" style={{ color: 'var(--tinta-500)' }} />
              </button>
            </div>
          ))}
        </div>

        <div className="px-4 py-4 border-t space-y-2 shrink-0" style={{ borderColor: 'var(--border)' }}>
          {emailMsg && (
            <div className="flex items-center gap-2 text-xs px-3 py-2 rounded-lg" style={{ background: 'var(--bosque-50)', color: 'var(--bosque-500)' }}>
              <CheckCircle className="w-3.5 h-3.5 shrink-0" />{emailMsg}
            </div>
          )}
          <div className="flex gap-2">
            {colaIdx === null ? (
              <button
                onClick={iniciarCola}
                disabled={colaPendientes === 0}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-40"
                style={{ background: '#25D366' }}
              >
                <MessageCircle className="w-4 h-4" />
                WhatsApp ({colaPendientes} pendientes)
                <ChevronRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                onClick={() => setColaIdx(null)}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold border"
                style={{ color: 'var(--tinta-500)', borderColor: 'var(--border)' }}
              >
                <AlertCircle className="w-4 h-4" /> Pausar cola
              </button>
            )}
            <button
              onClick={enviarEmails}
              disabled={emailLoading}
              className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold border disabled:opacity-40"
              style={{ color: 'var(--tinta)', borderColor: 'var(--border)' }}
              title="Envia por email a administrativos con correo registrado"
            >
              <Mail className="w-4 h-4" />
              {emailLoading ? 'Enviando...' : 'Email admins'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
