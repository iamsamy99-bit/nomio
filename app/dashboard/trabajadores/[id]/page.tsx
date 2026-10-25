'use client'
import { useEffect, useState, useMemo } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { useEmpresa } from '@/components/layout/EmpresaContext'
import { ArrowLeft, User, Briefcase, Phone, Mail, CreditCard, AlertCircle, Edit2, FileText } from 'lucide-react'
import { formatMXN, formatDate } from '@/lib/utils'
import type { Trabajador } from '@/types'
import HistorialPagos from '@/components/trabajadores/HistorialPagos'
import FiniquitoModal from '@/components/trabajadores/FiniquitoModal'
import { MODALIDAD_LABEL } from '@/lib/constants'

type TrabajadorExtended = Trabajador & {
  puesto?: string
  telefono?: string
  email?: string
  direccion?: string
  fecha_ingreso?: string
  fecha_nacimiento?: string
  rfc?: string
  curp?: string
  nss?: string
  banco?: string
  cuenta_clabe?: string
  contacto_emergencia_nombre?: string
  contacto_emergencia_parentesco?: string
  telefono_emergencia?: string
}

export default function TrabajadorDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const supabase = useMemo(() => createClient(), [])
  const { empresaId, empresa } = useEmpresa()
  const [trabajador, setTrabajador] = useState<TrabajadorExtended | null>(null)
  const [loading, setLoading] = useState(true)
  const [showFiniquito, setShowFiniquito] = useState(false)

  useEffect(() => {
    const load = async () => {
      const { data, error } = await supabase
        .from('trabajadores')
        .select('*')
        .eq('id', id)
        .eq('empresa_id', empresaId)
        .single()

      if (error || !data) {
        router.push('/dashboard/trabajadores')
        return
      }
      setTrabajador(data as TrabajadorExtended)
      setLoading(false)
    }
    load()
  }, [id, supabase, router, empresaId])

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="h-8 w-48 bg-slate-200 dark:bg-slate-700 rounded animate-pulse" />
        <div className="h-40 w-full bg-slate-100 dark:bg-slate-800 rounded-xl animate-pulse" />
        <div className="h-64 w-full bg-slate-100 dark:bg-slate-800 rounded-xl animate-pulse" />
      </div>
    )
  }

  if (!trabajador) return null

  const t = trabajador

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Back + title */}
      <div className="flex items-center gap-3">
        <Link
          href="/dashboard/trabajadores"
          className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700/50 text-ink-soft transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div className="flex-1 min-w-0">
          <h1 className="font-display text-2xl font-bold truncate" style={{ color: 'var(--tinta)' }}>{t.nombre}</h1>
          {t.puesto && <p className="text-sm mt-0.5" style={{ color: 'var(--tinta-500)' }}>{t.puesto}</p>}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowFiniquito(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm border border-border rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700/50 text-ink-soft transition-colors"
          >
            <FileText className="w-3.5 h-3.5" />
            Finiquito
          </button>
          <Link
            href="/dashboard/trabajadores"
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm border border-border rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700/50 text-ink-soft transition-colors"
          >
            <Edit2 className="w-3.5 h-3.5" />
            Editar
          </Link>
        </div>
      </div>

      {/* Worker info card */}
      <div className="card">
        <div className="flex items-start gap-4">
          <div className="w-14 h-14 rounded-full flex items-center justify-center shrink-0" style={{ background: t.activo ? 'var(--bosque-50)' : 'var(--surface-3)' }}>
            <span className="text-xl font-bold" style={{ color: t.activo ? 'var(--primary)' : 'var(--tinta-500)' }}>
              {t.nombre[0]}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-3">
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                t.activo
                  ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                  : 'bg-gray-100 text-gray-500 dark:bg-slate-700 dark:text-slate-400'
              }`}>
                {t.activo ? 'Activo' : 'Inactivo'}
              </span>
              {t.es_administrativo && (
                <span className="text-xs bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 px-2 py-0.5 rounded-full font-medium">
                  Administrativo
                </span>
              )}
            </div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3 text-sm">
              {/* Modalidad / tarifas */}
              <div className="flex items-start gap-2">
                <Briefcase className="w-4 h-4 mt-0.5 shrink-0" style={{ color: 'var(--tinta-500)' }} />
                <div>
                  <p className="text-xs" style={{ color: 'var(--tinta-500)' }}>Modalidad</p>
                  <p className="font-medium" style={{ color: 'var(--tinta)' }}>{MODALIDAD_LABEL[t.modalidad_pago] || t.modalidad_pago}</p>
                  {t.tarifa_dia && <p className="text-xs" style={{ color: 'var(--tinta-500)' }}>{formatMXN(t.tarifa_dia)}/dia</p>}
                  {t.tarifa_hora && <p className="text-xs" style={{ color: 'var(--tinta-500)' }}>{formatMXN(t.tarifa_hora)}/hr</p>}
                  {t.sueldo_fijo && <p className="text-xs" style={{ color: 'var(--tinta-500)' }}>Fijo: {formatMXN(t.sueldo_fijo)}</p>}
                  {t.tarifa_hora_extra && <p className="text-xs" style={{ color: 'var(--tinta-500)' }}>HE: {formatMXN(t.tarifa_hora_extra)}/hr</p>}
                </div>
              </div>

              {/* Contacto */}
              {(t.telefono || t.email) && (
                <div className="flex items-start gap-2">
                  <Phone className="w-4 h-4 mt-0.5 shrink-0" style={{ color: 'var(--tinta-500)' }} />
                  <div>
                    <p className="text-xs" style={{ color: 'var(--tinta-500)' }}>Contacto</p>
                    {t.telefono && <p className="font-medium" style={{ color: 'var(--tinta)' }}>{t.telefono}</p>}
                    {t.email && <p className="text-xs" style={{ color: 'var(--tinta-500)' }}>{t.email}</p>}
                  </div>
                </div>
              )}

              {/* Fechas */}
              {(t.fecha_ingreso || t.fecha_nacimiento) && (
                <div className="flex items-start gap-2">
                  <User className="w-4 h-4 mt-0.5 shrink-0" style={{ color: 'var(--tinta-500)' }} />
                  <div>
                    <p className="text-xs" style={{ color: 'var(--tinta-500)' }}>Fechas</p>
                    {t.fecha_ingreso && <p className="text-xs" style={{ color: 'var(--tinta)' }}>Ingreso: {formatDate(t.fecha_ingreso)}</p>}
                    {t.fecha_nacimiento && <p className="text-xs" style={{ color: 'var(--tinta)' }}>Nac.: {formatDate(t.fecha_nacimiento)}</p>}
                  </div>
                </div>
              )}

              {/* Fiscal */}
              {(t.rfc || t.curp || t.nss) && (
                <div className="flex items-start gap-2">
                  <CreditCard className="w-4 h-4 mt-0.5 shrink-0" style={{ color: 'var(--tinta-500)' }} />
                  <div>
                    <p className="text-xs" style={{ color: 'var(--tinta-500)' }}>Fiscal</p>
                    {t.rfc && <p className="text-xs font-mono" style={{ color: 'var(--tinta)' }}>RFC: {t.rfc}</p>}
                    {t.curp && <p className="text-xs font-mono" style={{ color: 'var(--tinta)' }}>CURP: {t.curp}</p>}
                    {t.nss && <p className="text-xs font-mono" style={{ color: 'var(--tinta)' }}>NSS: {t.nss}</p>}
                  </div>
                </div>
              )}

              {/* Banco */}
              {(t.banco || t.cuenta_clabe) && (
                <div className="flex items-start gap-2">
                  <Mail className="w-4 h-4 mt-0.5 shrink-0" style={{ color: 'var(--tinta-500)' }} />
                  <div>
                    <p className="text-xs" style={{ color: 'var(--tinta-500)' }}>Bancario</p>
                    {t.banco && <p className="text-sm font-medium" style={{ color: 'var(--tinta)' }}>{t.banco}</p>}
                    {t.cuenta_clabe && <p className="text-xs font-mono" style={{ color: 'var(--tinta-500)' }}>{t.cuenta_clabe}</p>}
                  </div>
                </div>
              )}

              {/* Emergencia */}
              {(t.contacto_emergencia_nombre || t.telefono_emergencia) && (
                <div className="flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" style={{ color: 'var(--tinta-500)' }} />
                  <div>
                    <p className="text-xs" style={{ color: 'var(--tinta-500)' }}>Emergencia</p>
                    {t.contacto_emergencia_nombre && (
                      <p className="text-sm font-medium" style={{ color: 'var(--tinta)' }}>
                        {t.contacto_emergencia_nombre}
                        {t.contacto_emergencia_parentesco && (
                          <span className="font-normal" style={{ color: 'var(--tinta-500)' }}> ({t.contacto_emergencia_parentesco})</span>
                        )}
                      </p>
                    )}
                    {t.telefono_emergencia && <p className="text-xs" style={{ color: 'var(--tinta-500)' }}>{t.telefono_emergencia}</p>}
                  </div>
                </div>
              )}
            </div>

            {t.notas && (
              <div className="mt-3 pt-3 border-t border-border">
                <p className="text-xs" style={{ color: 'var(--tinta-500)' }}>Notas</p>
                <p className="text-sm mt-0.5" style={{ color: 'var(--tinta)' }}>{t.notas}</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Payment history section */}
      <div className="card">
        <HistorialPagos trabajadorId={id} trabajadorNombre={t.nombre} nss={t.nss} />
      </div>

      {showFiniquito && (
        <FiniquitoModal
          trabajador={t}
          empresaNombre={empresa?.nombre || ''}
          onClose={() => setShowFiniquito(false)}
        />
      )}
    </div>
  )
}
