'use client'
import { useEffect, useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useEmpresa } from '@/components/layout/EmpresaContext'
import { sanitizeText, toISOLocal } from '@/lib/utils'
import type { Proyecto } from '@/types'
import { FolderOpen, User, CalendarDays, FileText, ArrowRight, AlertCircle, X } from 'lucide-react'
import Link from 'next/link'

const toISO = toISOLocal

function getPresets() {
  const today = new Date()
  const dow = today.getDay()
  const mon = new Date(today); mon.setDate(today.getDate() - (dow === 0 ? 6 : dow - 1))
  const sat = new Date(mon); sat.setDate(mon.getDate() + 5)
  const lastMon = new Date(mon); lastMon.setDate(mon.getDate() - 7)
  const lastSat = new Date(sat); lastSat.setDate(sat.getDate() - 7)
  const firstOfMonth = new Date(today.getFullYear(), today.getMonth(), 1)
  const lastOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0)
  const firstOfLastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1)
  const lastOfLastMonth = new Date(today.getFullYear(), today.getMonth(), 0)
  return [
    { label: 'Esta semana',   start: toISO(mon),             end: toISO(sat) },
    { label: 'Semana pasada', start: toISO(lastMon),         end: toISO(lastSat) },
    { label: 'Este mes',      start: toISO(firstOfMonth),    end: toISO(lastOfMonth) },
    { label: 'Mes pasado',    start: toISO(firstOfLastMonth), end: toISO(lastOfLastMonth) },
  ]
}

function SectionCard({ icon: Icon, title, children }: { icon: React.ComponentType<{ className?: string }>; title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border p-5 space-y-4 transition-all hover:shadow-sm"
      style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
      <div className="flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
          style={{ background: 'rgba(27,108,168,0.10)' }}>
          <Icon className="w-4 h-4 text-primary" />
        </div>
        <h3 className="font-semibold text-sm" style={{ color: 'var(--ink)' }}>{title}</h3>
      </div>
      {children}
    </div>
  )
}

export default function NuevaWizardPage() {
  const supabase = useMemo(() => createClient(), [])
  const router = useRouter()
  const [proyectos, setProyectos] = useState<Proyecto[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const { empresaId } = useEmpresa()
  const [proyectoStats, setProyectoStats] = useState<{ trabajadores: number; solapamientos: number } | null>(null)
  const [solapadasModal, setSolapadasModal] = useState<{
    list: Array<{ id: string; numero_nomina: number; fecha_inicio: string; fecha_fin: string }>
    onConfirm: () => void
  } | null>(null)
  const [form, setForm] = useState({
    proyecto_id: '', encargado: '', fecha_inicio: '', fecha_fin: '', observaciones: '',
  })

  useEffect(() => {
    async function load() {
      try {
        const { data: p } = await supabase.from('proyectos').select('*').eq('empresa_id', empresaId).eq('activo', true).order('nombre')
        setProyectos(p || [])
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [supabase, empresaId])

  useEffect(() => {
    if (!form.proyecto_id) { setProyectoStats(null); return }
    const proyecto = proyectos.find(p => p.id === form.proyecto_id)
    if (proyecto && !form.encargado) setForm(f => ({ ...f, encargado: proyecto.encargado }))
    if (!form.proyecto_id || !empresaId) return
    async function fetchStats() {
      const [{ count: trab }, { count: solap }] = await Promise.all([
        supabase.from('proyecto_trabajadores').select('*', { count: 'exact', head: true }).eq('proyecto_id', form.proyecto_id).eq('activo', true),
        supabase.from('periodos_nomina').select('*', { count: 'exact', head: true }).eq('proyecto_id', form.proyecto_id).in('estado', ['en_progreso', 'generada']),
      ])
      setProyectoStats({ trabajadores: trab ?? 0, solapamientos: solap ?? 0 })
    }
    fetchStats()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.proyecto_id, empresaId])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.proyecto_id) { setError('Selecciona un proyecto'); return }
    if (!form.fecha_inicio || !form.fecha_fin) { setError('Completa las fechas'); return }
    if (!form.encargado.trim()) { setError('El encargado es requerido'); return }
    if (saving) return
    setSaving(true); setError('')

    const doInsert = async () => {
      try {
        const { data: maxRow } = await supabase
          .from('periodos_nomina').select('numero_nomina').eq('empresa_id', empresaId)
          .order('numero_nomina', { ascending: false }).limit(1).maybeSingle()
        const nextNum = ((maxRow?.numero_nomina as number | null) ?? 0) + 1

        const { data: nomina, error: nErr } = await supabase.from('periodos_nomina').insert({
          empresa_id: empresaId,
          proyecto_id: form.proyecto_id,
          numero_nomina: nextNum,
          encargado: sanitizeText(form.encargado),
          fecha_inicio: form.fecha_inicio,
          fecha_fin: form.fecha_fin,
          observaciones_actividades: form.observaciones ? sanitizeText(form.observaciones) : null,
          estado: 'en_progreso',
        }).select().single()

        if (nErr || !nomina) { setError(nErr?.message || 'No se pudo crear la nómina'); return }
        router.replace(`/dashboard/nomina/${nomina.id}/wizard?step=2`)
      } catch (err) {
        console.error('[nueva/wizard]', err)
        setError('Error inesperado al crear la nómina.')
      } finally {
        setSaving(false)
      }
    }

    try {
      const { data: solapadas } = await supabase
        .from('periodos_nomina')
        .select('id, numero_nomina, fecha_inicio, fecha_fin')
        .eq('empresa_id', empresaId)
        .eq('proyecto_id', form.proyecto_id)
        .lte('fecha_inicio', form.fecha_fin)
        .gte('fecha_fin', form.fecha_inicio)
        .neq('estado', 'pagada')

      if (solapadas && solapadas.length > 0) {
        setSaving(false)
        setSolapadasModal({ list: solapadas, onConfirm: () => { setSolapadasModal(null); setSaving(true); doInsert() } })
        return
      }
    } catch (err) {
      console.error('[nueva/wizard] overlap check', err)
    }

    doInsert()
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-24">
        <div className="flex gap-2">
          <span className="loading-dot" />
          <span className="loading-dot" />
          <span className="loading-dot" />
        </div>
        <p className="text-sm" style={{ color: 'var(--stone)' }}>Cargando proyectos...</p>
      </div>
    )
  }

  const presets = getPresets()
  const selectedPreset = presets.find(p => p.start === form.fecha_inicio && p.end === form.fecha_fin)?.label

  return (
    <div className="max-w-2xl mx-auto py-6 px-4 sm:px-6">
      {/* Header */}
      <div className="flex items-start justify-between mb-6 animate-fade-in">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest mb-1" style={{ color: 'var(--stone)' }}>Nueva nómina</p>
          <h1 className="font-display text-2xl font-bold" style={{ color: 'var(--ink)' }}>Configura el período</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--muted)' }}>Paso 1 de 4 — Selecciona el proyecto y fechas</p>
        </div>
        <Link href="/dashboard/nomina"
          className="p-2 rounded-xl hover:bg-gray-100 transition-colors"
          title="Cancelar">
          <X className="w-5 h-5 text-gray-400" />
        </Link>
      </div>

      {error && (
        <div className="mb-4 flex items-start gap-2.5 bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700 animate-fade-in">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          {error}
        </div>
      )}

      {solapadasModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="rounded-2xl shadow-2xl w-full max-w-md" style={{ background: 'var(--surface)' }}>
            <div className="flex items-center justify-between p-4 border-b" style={{ borderColor: 'var(--border)' }}>
              <div className="flex items-center gap-2.5">
                <AlertCircle className="w-5 h-5 text-amber-600" />
                <h3 className="font-display font-semibold" style={{ color: 'var(--ink)' }}>Período solapado</h3>
              </div>
              <button onClick={() => setSolapadasModal(null)}><X className="w-5 h-5 text-gray-400" /></button>
            </div>
            <div className="p-4 space-y-3">
              <p className="text-sm" style={{ color: 'var(--muted)' }}>
                Ya existe{solapadasModal.list.length > 1 ? 'n' : ''} {solapadasModal.list.length} nómina{solapadasModal.list.length > 1 ? 's' : ''} que cubren ese período:
              </p>
              <div className="space-y-1.5">
                {solapadasModal.list.map(n => (
                  <Link
                    key={n.id}
                    href={`/dashboard/nomina/${n.id}`}
                    className="flex items-center justify-between px-3 py-2 rounded-xl text-sm border transition-colors hover:bg-gray-50"
                    style={{ borderColor: 'var(--border)', color: 'var(--ink)' }}
                  >
                    <span className="font-medium">Nómina #{String(n.numero_nomina).padStart(3, '0')}</span>
                    <span className="text-xs" style={{ color: 'var(--muted)' }}>{n.fecha_inicio} – {n.fecha_fin}</span>
                  </Link>
                ))}
              </div>
              <div className="flex gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => { router.push(`/dashboard/nomina/${solapadasModal.list[0].id}`); setSolapadasModal(null) }}
                  className="btn-secondary flex-1 text-sm"
                >
                  Ir a nómina existente
                </button>
                <button
                  type="button"
                  onClick={solapadasModal.onConfirm}
                  className="btn-primary flex-1 text-sm"
                >
                  Crear de todas formas
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">

        {/* Project */}
        <div className="animate-fade-in-up">
          <SectionCard icon={FolderOpen} title="Proyecto">
            <div>
              <label className="label">Proyecto *</label>
              <select
                value={form.proyecto_id}
                onChange={e => setForm(f => ({ ...f, proyecto_id: e.target.value }))}
                className="input" required
              >
                <option value="">Seleccionar proyecto...</option>
                {proyectos.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
              </select>
              {proyectoStats && (
                <div className="flex items-center gap-3 mt-2">
                  <span className="text-xs px-2 py-0.5 rounded-full"
                    style={{ background: 'rgba(27,108,168,0.08)', color: 'var(--primary)' }}>
                    {proyectoStats.trabajadores} trabajadores
                  </span>
                  {proyectoStats.solapamientos > 0 && (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-100">
                      {proyectoStats.solapamientos} nómina(s) activa(s)
                    </span>
                  )}
                </div>
              )}
            </div>
          </SectionCard>
        </div>

        {/* Encargado */}
        <div className="animate-fade-in-up delay-100">
          <SectionCard icon={User} title="Encargado">
            <div>
              <label className="label">Nombre del encargado *</label>
              <input
                value={form.encargado}
                onChange={e => setForm(f => ({ ...f, encargado: e.target.value }))}
                className="input" required maxLength={100}
                placeholder="Ej. Juan García"
              />
            </div>
          </SectionCard>
        </div>

        {/* Date range */}
        <div className="animate-fade-in-up delay-200">
          <SectionCard icon={CalendarDays} title="Período de la nómina">
            <div>
              <label className="label mb-2">Acceso rápido</label>
              <div className="flex gap-2 flex-wrap">
                {presets.map(p => (
                  <button key={p.label} type="button"
                    onClick={() => setForm(f => ({ ...f, fecha_inicio: p.start, fecha_fin: p.end }))}
                    className={`text-xs px-3 py-1.5 rounded-xl border font-medium transition-all
                      ${selectedPreset === p.label
                        ? 'bg-primary text-white border-primary shadow-sm'
                        : 'border-gray-200 text-ink-soft hover:border-primary/40 hover:text-primary hover:bg-primary/5'}`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Desde *</label>
                <input type="date" value={form.fecha_inicio}
                  onChange={e => setForm(f => ({ ...f, fecha_inicio: e.target.value }))}
                  className="input" required />
              </div>
              <div>
                <label className="label">Hasta *</label>
                <input type="date" value={form.fecha_fin}
                  onChange={e => setForm(f => ({ ...f, fecha_fin: e.target.value }))}
                  className="input" required min={form.fecha_inicio} />
              </div>
            </div>
          </SectionCard>
        </div>

        {/* Notes */}
        <div className="animate-fade-in-up delay-300">
          <SectionCard icon={FileText} title="Actividades realizadas">
            <div>
              <label className="label">Descripción (opcional)</label>
              <textarea
                value={form.observaciones}
                onChange={e => setForm(f => ({ ...f, observaciones: e.target.value }))}
                className="input h-24 resize-none" maxLength={500}
                placeholder="Ej: Casa 16: enjarre primer nivel, aplanado..."
              />
              <p className="text-xs mt-1" style={{ color: 'var(--stone)' }}>{form.observaciones.length}/500</p>
            </div>
          </SectionCard>
        </div>

        <div className="flex gap-3 pt-2 animate-fade-in-up delay-400">
          <button type="button" onClick={() => router.back()} className="btn-secondary flex-1">
            Cancelar
          </button>
          <button type="submit" disabled={saving} className="btn-primary flex-1 flex items-center justify-center gap-2">
            {saving ? (
              <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Creando...</>
            ) : (
              <>Continuar al paso 2 <ArrowRight className="w-4 h-4" /></>
            )}
          </button>
        </div>
      </form>
    </div>
  )
}
