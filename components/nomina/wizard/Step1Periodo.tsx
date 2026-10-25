'use client'
import { useEffect, useState } from 'react'
import { useWizard } from './WizardContext'
import { sanitizeText, toISOLocal } from '@/lib/utils'
import type { Proyecto } from '@/types'
import { FolderOpen, User, CalendarDays, FileText, ArrowRight, AlertCircle } from 'lucide-react'

const toISO = toISOLocal

function getPresets(): { label: string; start: string; end: string }[] {
  const today = new Date()
  const dow = today.getDay()
  const mon = new Date(today)
  mon.setDate(today.getDate() - (dow === 0 ? 6 : dow - 1))
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
    <div className="rounded-2xl border p-5 space-y-4 transition-all hover:shadow-sm" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
      <div className="flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: 'rgba(27,108,168,0.10)' }}>
          <Icon className="w-4 h-4 text-primary" />
        </div>
        <h3 className="font-semibold text-sm" style={{ color: 'var(--ink)' }}>{title}</h3>
      </div>
      {children}
    </div>
  )
}

export default function Step1Periodo() {
  const { state, dispatch, supabase, navigateToStep } = useWizard()
  const [proyectos, setProyectos] = useState<Proyecto[]>([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [proyectoStats, setProyectoStats] = useState<{ trabajadores: number; solapamientos: number } | null>(null)

  useEffect(() => {
    if (!state.empresaId) return
    setLoading(true)
    Promise.resolve(
      supabase.from('proyectos').select('*').eq('empresa_id', state.empresaId).eq('activo', true).order('nombre')
    ).then(({ data }) => setProyectos(data || []))
      .finally(() => setLoading(false))
  }, [state.empresaId, supabase])

  useEffect(() => {
    if (!state.proyectoId || !state.empresaId) { setProyectoStats(null); return }
    async function fetchStats() {
      const [{ count: trab }, { count: solap }] = await Promise.all([
        supabase.from('proyecto_trabajadores').select('*', { count: 'exact', head: true }).eq('proyecto_id', state.proyectoId).eq('activo', true),
        supabase.from('periodos_nomina').select('*', { count: 'exact', head: true }).eq('proyecto_id', state.proyectoId).in('estado', ['en_progreso', 'generada']).neq('id', state.nominaId ?? ''),
      ])
      setProyectoStats({ trabajadores: trab ?? 0, solapamientos: solap ?? 0 })
    }
    fetchStats()
  }, [state.proyectoId, state.empresaId, state.nominaId, supabase])

  const handleNext = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!state.proyectoId || !state.fechaInicio || !state.fechaFin || !state.encargado.trim()) {
      setError('Completa todos los campos requeridos'); return
    }
    if (!state.nominaId) return
    setSaving(true); setError('')
    try {
      const { error: upErr } = await supabase.from('periodos_nomina').update({
        proyecto_id: state.proyectoId,
        encargado: sanitizeText(state.encargado),
        fecha_inicio: state.fechaInicio,
        fecha_fin: state.fechaFin,
        observaciones_actividades: state.observaciones ? sanitizeText(state.observaciones) : null,
      }).eq('id', state.nominaId)
      if (upErr) { setError(upErr.message); return }
      navigateToStep(2)
    } finally {
      setSaving(false)
    }
  }

  const presets = getPresets()
  const selectedPreset = presets.find(p => p.start === state.fechaInicio && p.end === state.fechaFin)?.label

  return (
    <div className="max-w-2xl mx-auto py-6 px-4 sm:px-6">
      {/* Header */}
      <div className="mb-6 animate-fade-in">
        <p className="text-xs font-semibold uppercase tracking-widest mb-1" style={{ color: 'var(--stone)' }}>Paso 1 de 4</p>
        <h2 className="font-display text-2xl font-bold" style={{ color: 'var(--ink)' }}>Configura el período</h2>
        <p className="text-sm mt-1" style={{ color: 'var(--muted)' }}>Selecciona el proyecto, encargado y rango de fechas de esta nómina.</p>
      </div>

      {error && (
        <div className="mb-4 flex items-start gap-2.5 bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700 animate-fade-in">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          {error}
        </div>
      )}

      <form onSubmit={handleNext} className="space-y-4">

        {/* Project */}
        <div className="animate-fade-in-up">
          <SectionCard icon={FolderOpen} title="Proyecto">
            <div>
              <label className="label">Proyecto *</label>
              <select
                value={state.proyectoId}
                onChange={e => dispatch({ type: 'SET_FIELD', field: 'proyectoId', value: e.target.value })}
                className="input" required disabled={loading}
              >
                <option value="">Seleccionar proyecto...</option>
                {proyectos.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
              </select>
              {proyectoStats && (
                <div className="flex items-center gap-3 mt-2">
                  <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: 'rgba(27,108,168,0.08)', color: 'var(--primary)' }}>
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
                value={state.encargado}
                onChange={e => dispatch({ type: 'SET_FIELD', field: 'encargado', value: e.target.value })}
                className="input" required maxLength={100}
                placeholder="Ej. Juan García"
              />
            </div>
          </SectionCard>
        </div>

        {/* Date range */}
        <div className="animate-fade-in-up delay-200">
          <SectionCard icon={CalendarDays} title="Período de la nómina">
            {/* Quick presets */}
            <div>
              <label className="label mb-2">Acceso rápido</label>
              <div className="flex gap-2 flex-wrap">
                {presets.map(p => (
                  <button
                    key={p.label}
                    type="button"
                    onClick={() => {
                      dispatch({ type: 'SET_FIELD', field: 'fechaInicio', value: p.start })
                      dispatch({ type: 'SET_FIELD', field: 'fechaFin', value: p.end })
                    }}
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
                <input type="date" value={state.fechaInicio}
                  onChange={e => dispatch({ type: 'SET_FIELD', field: 'fechaInicio', value: e.target.value })}
                  className="input" required />
              </div>
              <div>
                <label className="label">Hasta *</label>
                <input type="date" value={state.fechaFin}
                  onChange={e => dispatch({ type: 'SET_FIELD', field: 'fechaFin', value: e.target.value })}
                  className="input" required min={state.fechaInicio} />
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
                value={state.observaciones}
                onChange={e => dispatch({ type: 'SET_FIELD', field: 'observaciones', value: e.target.value })}
                className="input h-24 resize-none" maxLength={500}
                placeholder="Describe brevemente las actividades de este período..."
              />
              <p className="text-xs mt-1" style={{ color: 'var(--stone)' }}>{state.observaciones.length}/500</p>
            </div>
          </SectionCard>
        </div>

        <div className="flex justify-end pt-2 animate-fade-in-up delay-400">
          <button type="submit" disabled={saving} className="btn-primary flex items-center gap-2 px-6 py-2.5">
            {saving ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Guardando...
              </>
            ) : (
              <>
                Siguiente
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  )
}
