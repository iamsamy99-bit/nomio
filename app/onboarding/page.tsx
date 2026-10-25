'use client'
import { useState, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { sanitizeText } from '@/lib/utils'
import { logAudit } from '@/lib/audit'
import { ArrowRight, Check, Building2, MapPin, Users, Plus, X, CalendarDays, Receipt, FileText } from 'lucide-react'
import NomioLogo from '@/components/brand/NomioLogo'

type Step = 1 | 2 | 3 | 4

interface WorkerRow {
  id: string
  nombre: string
  puesto: string
  modalidad: 'por_dia' | 'por_hora' | 'sueldo_fijo'
  tarifa: string
}

const STEP_LABELS = [
  { n: '01', t: 'Tu despacho' },
  { n: '02', t: 'Primera obra' },
  { n: '03', t: 'Cuadrilla' },
  { n: '04', t: 'Listo' },
]

const STEP_PHOTOS = [
  '/atelier/img-architect-blueprints.jpg',
  '/atelier/img-blueprints.jpg',
  '/atelier/img-construction-team.jpg',
  '/atelier/img-construction-site.jpg',
]

const RIGHT_FACTS = [
  { caption: 'Bienvenida · 01 / 04', fact: 'El 68% de arquitectos mexicanos llevan su nómina en Excel o a mano.', src: 'INEGI · Encuesta Pyme 2024' },
  { caption: 'Primera obra · 02 / 04', fact: 'Nomiextra genera tu cotización con tu logo en menos de 3 minutos.', src: 'Solventa · Mayo 2026' },
  { caption: 'Cuadrilla · 03 / 04', fact: 'El 40% de los anticipos nunca se descuentan correctamente de la nómina.', src: 'CMIC · Estudio de obra 2025' },
]


function Stepper({ active }: { active: number }) {
  return (
    <div style={{ display: 'flex', gap: 8, marginTop: 36 }}>
      {STEP_LABELS.map((s, i) => {
        const done = i + 1 < active
        return (
          <div key={s.n} style={{ flex: 1, opacity: i + 1 <= active ? 1 : 0.38 }}>
            <div style={{ height: 2, background: i + 1 <= active ? 'var(--bosque-500)' : 'var(--cuero-300)', borderRadius: 999 }} />
            <div style={{ display: 'flex', gap: 7, alignItems: 'center', marginTop: 10 }}>
              {done && (
                <span style={{ width: 14, height: 14, borderRadius: '50%', background: 'var(--bosque-500)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Check size={9} color="var(--cuero-50)" strokeWidth={3} />
                </span>
              )}
              <span className="eyebrow-num">{s.n}</span>
              <span className="eyebrow" style={{ fontSize: 10 }}>{s.t}</span>
            </div>
          </div>
        )
      })}
    </div>
  )
}

function RightPanel({ step }: { step: number }) {
  const photo = STEP_PHOTOS[step - 1]

  if (step === 4) {
    return (
      <aside style={{ position: 'relative', overflow: 'hidden', background: 'var(--petroleo-900)' }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={photo} alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', filter: 'brightness(0.5) saturate(0.8)' }} />
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(160deg, rgba(14,26,32,0.35), rgba(14,26,32,0.75))' }} />
        <div style={{ position: 'relative', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', padding: '40px', color: 'var(--cuero-50)', textAlign: 'center' }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/icon-192.png" alt="" style={{ width: 52, height: 52, borderRadius: 10, objectFit: 'cover', marginBottom: 28 }} />
          <h2 className="display-xl" style={{ color: 'var(--cuero-50)', fontSize: 68, lineHeight: 0.96 }}>
            Bienvenida<br />a <em style={{ color: 'var(--cuero-300)' }}>Nomiextra</em>.
          </h2>
          <p className="body-lg" style={{ marginTop: 24, color: 'rgba(250,246,239,0.7)', maxWidth: 360, fontSize: 16.5, lineHeight: 1.5 }}>
            El lunes marcas asistencias. El viernes generas la nómina. Sin Excel. Sin papel. Sin sábados.
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, width: '100%', maxWidth: 400, marginTop: 52 }}>
            {[
              { v: '3 min', l: 'Nómina semanal' },
              { v: '$0', l: 'Plan gratuito' },
              { v: '100%', l: 'Funciona offline' },
            ].map(s => (
              <div key={s.l} style={{ padding: '16px 12px', background: 'rgba(250,246,239,0.08)', borderRadius: 10, backdropFilter: 'blur(6px)', border: '1px solid rgba(250,246,239,0.12)' }}>
                <div style={{ fontFamily: 'Fraunces, Georgia, serif', fontSize: 28, fontWeight: 400, letterSpacing: '-0.02em', color: 'var(--cuero-100)' }}>{s.v}</div>
                <div className="caption" style={{ marginTop: 6, color: 'rgba(250,246,239,0.55)' }}>{s.l}</div>
              </div>
            ))}
          </div>
        </div>
      </aside>
    )
  }

  const { caption, fact, src } = RIGHT_FACTS[step - 1]
  return (
    <aside style={{ position: 'relative', overflow: 'hidden', background: 'var(--petroleo-700)' }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={photo} alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', filter: 'brightness(0.82) saturate(0.9)' }} />
      <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(14,26,32,0.2), rgba(14,26,32,0.5))' }} />
      <div style={{ position: 'absolute', top: 24, right: 24 }}>
        <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase' as const, color: 'rgba(250,246,239,0.6)', background: 'rgba(14,26,32,0.5)', backdropFilter: 'blur(8px)', padding: '6px 10px', borderRadius: 6 }}>
          {caption}
        </span>
      </div>
      <div style={{ position: 'absolute', top: 72, right: 36, width: 268 }}>
        <div style={{ background: 'rgba(250,246,239,0.94)', backdropFilter: 'blur(10px)', borderRadius: 10, padding: '14px 16px', boxShadow: '0 8px 24px rgba(0,0,0,0.22)' }}>
          <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 9, letterSpacing: '0.1em', textTransform: 'uppercase' as const, color: 'var(--tinta-500)', opacity: 0.6, marginBottom: 8 }}>
            ¿Sabías?
          </div>
          <p style={{ fontFamily: 'Fraunces, Georgia, serif', fontWeight: 400, fontSize: 14.5, lineHeight: 1.35, color: 'var(--tinta)', letterSpacing: '-0.01em', margin: 0 }}>
            {fact}
          </p>
          <div style={{ marginTop: 10, paddingTop: 8, borderTop: '1px solid rgba(26,23,20,0.1)', fontFamily: 'JetBrains Mono, monospace', fontSize: 9.5, color: 'var(--tinta-500)', opacity: 0.5 }}>
            {src}
          </div>
        </div>
      </div>
    </aside>
  )
}

export default function OnboardingPage() {
  const supabase = useMemo(() => createClient(), [])
  const [step, setStep] = useState<Step>(1)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Step 1
  const [nombre, setNombre] = useState('')
  const [rfc, setRfc] = useState('')
  const [telefono, setTelefono] = useState('')

  // Persisted after step 1
  const [empresaId, setEmpresaId] = useState<string | null>(null)
  const [summaryEmpresa, setSummaryEmpresa] = useState('')

  // Step 2
  const [proyectoNombre, setProyectoNombre] = useState('')
  const [proyectoFecha, setProyectoFecha] = useState('')
  const [summaryProyecto, setSummaryProyecto] = useState('')

  // Step 3
  const [workers, setWorkers] = useState<WorkerRow[]>([
    { id: crypto.randomUUID(), nombre: '', puesto: 'Albañil', modalidad: 'por_dia', tarifa: '450' },
  ])
  const [workerCount, setWorkerCount] = useState(0)

  // ── handlers ────────────────────────────────────────

  async function handleStep1() {
    if (!nombre.trim()) { setError('El nombre del despacho es obligatorio.'); return }
    // Empresa ya creada (usuario volvió con ← Atrás y reenvió): solo avanzar
    if (empresaId) { setError(''); setStep(2); return }
    setLoading(true); setError('')
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Sesión expirada. Inicia sesión de nuevo.')

      const id = crypto.randomUUID()
      const { error: empErr } = await supabase.from('empresas').insert({
        id,
        nombre: sanitizeText(nombre),
        rfc: rfc ? rfc.toUpperCase().slice(0, 13) : null,
        telefono: telefono || null,
        suscripcion_tier: 'gratuito',
        suscripcion_activa: true,
        limite_trabajadores: 5,
        limite_proyectos: 1,
        modulo_asistencias: false,
        modulo_horas_extra: false,
        modulo_conceptos_adicionales: false,
        modulo_plantillas: false,
        modulo_export_pdf: false,
        modulo_multi_modalidad: false,
        activa: true,
      })
      if (empErr) throw new Error(`Error creando empresa: ${empErr.message}`)

      const { error: euErr } = await supabase.from('empresa_users').insert({
        empresa_id: id,
        user_id: user.id,
        rol: 'owner',
        activo: true,
      })
      if (euErr) throw new Error(`Error configurando usuario: ${euErr.message}`)

      setEmpresaId(id)
      setSummaryEmpresa(nombre.trim())
      setStep(2)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error desconocido. Intenta de nuevo.')
    } finally {
      setLoading(false)
    }
  }

  async function handleStep2(skip: boolean) {
    if (skip || !proyectoNombre.trim()) { setStep(3); return }
    setLoading(true); setError('')
    try {
      const id = crypto.randomUUID()
      const { error: pErr } = await supabase.from('proyectos').insert({
        id,
        empresa_id: empresaId,
        nombre: sanitizeText(proyectoNombre),
        encargado: 'Encargado',
        fecha_inicio: proyectoFecha || null,
        dias_laborales_semana: '6_dias',
        color_etiqueta: '#556B45',
        activo: true,
      })
      if (pErr) throw new Error(`Error creando obra: ${pErr.message}`)

      setSummaryProyecto(proyectoNombre.trim())
      setStep(3)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error desconocido. Intenta de nuevo.')
    } finally {
      setLoading(false)
    }
  }

  async function handleStep3(skip: boolean) {
    const valid = workers.filter(w => w.nombre.trim())
    if (skip || valid.length === 0) { setWorkerCount(0); setStep(4); return }
    setLoading(true); setError('')
    try {
      const rows = valid.map(w => {
        const tarifa = parseFloat(w.tarifa) || 0
        return {
          empresa_id: empresaId,
          nombre: sanitizeText(w.nombre),
          modalidad_pago: w.modalidad,
          tarifa_dia:    w.modalidad === 'por_dia'     ? tarifa : null,
          tarifa_hora:   w.modalidad === 'por_hora'    ? tarifa : null,
          sueldo_fijo:   w.modalidad === 'sueldo_fijo' ? tarifa : null,
          es_administrativo: false,
          activo: true,
        }
      })
      const { error: tErr } = await supabase.from('trabajadores').insert(rows)
      if (tErr) throw new Error(`Error creando trabajadores: ${tErr.message}`)

      logAudit({ supabase, empresaId: empresaId!, tabla: 'trabajadores', operacion: 'trabajador_creado', registroId: empresaId!, payload: { count: rows.length } })
      setWorkerCount(valid.length)
      setStep(4)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error desconocido. Intenta de nuevo.')
    } finally {
      setLoading(false)
    }
  }

  function addWorker() {
    setWorkers(prev => [...prev, { id: crypto.randomUUID(), nombre: '', puesto: 'Albañil', modalidad: 'por_dia', tarifa: '450' }])
  }

  function removeWorker(id: string) {
    setWorkers(prev => prev.filter(w => w.id !== id))
  }

  function updateWorker(id: string, field: keyof WorkerRow, value: string) {
    setWorkers(prev => prev.map(w => w.id === id ? { ...w, [field]: value } : w))
  }

  // ── render ───────────────────────────────────────────

  return (
    <div className="atelier" style={{ minHeight: '100vh', display: 'grid', gridTemplateColumns: '1.1fr 1fr' }}>

      {/* LEFT — form */}
      <section style={{ padding: '40px 64px', display: 'flex', flexDirection: 'column', background: 'var(--bg)', overflowY: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <NomioLogo size={32} />
          <span className="caption">Paso {step} de 4</span>
        </div>

        <Stepper active={step} />

        {error && (
          <div style={{ marginTop: 14, padding: '10px 14px', background: '#FFF0EE', border: '1px solid #FECBC2', borderRadius: 8, fontSize: 13, color: '#8B2E1A' }}>
            {error}
          </div>
        )}

        {/* ── Paso 1: Tu despacho ── */}
        {step === 1 && (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', maxWidth: 540, marginTop: 16 }}>
            <span className="eyebrow" style={{ fontSize: 11 }}>Paso 1 / 4 · Tu despacho</span>
            <h1 className="display-xl" style={{ marginTop: 20, fontSize: 56 }}>
              Cuéntanos sobre <em>tu empresa</em>.
            </h1>
            <p className="body-lg" style={{ marginTop: 14, fontSize: 16 }}>
              Esta información aparece en tus cotizaciones y comprobantes de nómina.
            </p>

            <div style={{ marginTop: 32, display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                <div>
                  <label className="caption" style={{ display: 'block', marginBottom: 6 }}>Nombre del despacho *</label>
                  <input
                    className="atelier-input"
                    value={nombre}
                    onChange={e => { setNombre(e.target.value); if (error) setError('') }}
                    onKeyDown={e => { if (e.key === 'Enter') handleStep1() }}
                    placeholder="Reyes & Asociados"
                    maxLength={100}
                    autoFocus
                  />
                </div>
                <div>
                  <label className="caption" style={{ display: 'block', marginBottom: 6 }}>RFC del despacho</label>
                  <input
                    className="atelier-input"
                    style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 13, letterSpacing: '0.05em' }}
                    value={rfc}
                    onChange={e => setRfc(e.target.value.toUpperCase())}
                    placeholder="REYD850912AB3"
                    maxLength={13}
                  />
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                <div>
                  <label className="caption" style={{ display: 'block', marginBottom: 6 }}>Tipo de empresa</label>
                  <select className="atelier-input" style={{ cursor: 'pointer' }}>
                    <option>Despacho de arquitectura</option>
                    <option>Constructora</option>
                    <option>Persona física con actividad emp.</option>
                    <option>Empresa de remodelación</option>
                  </select>
                </div>
                <div>
                  <label className="caption" style={{ display: 'block', marginBottom: 6 }}>WhatsApp de obra</label>
                  <input
                    className="atelier-input"
                    style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 13 }}
                    value={telefono}
                    onChange={e => setTelefono(e.target.value)}
                    placeholder="+52 33 1234 5678"
                    type="tel"
                    maxLength={15}
                  />
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 36 }}>
              <button
                className="btn btn-primary btn-lg"
                onClick={handleStep1}
                disabled={loading || !nombre.trim()}
              >
                {loading ? 'Creando...' : <>Continuar a primera obra <ArrowRight size={14} /></>}
              </button>
            </div>
          </div>
        )}

        {/* ── Paso 2: Primera obra ── */}
        {step === 2 && (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', maxWidth: 540, marginTop: 16 }}>
            <span className="eyebrow" style={{ fontSize: 11 }}>Paso 2 / 4 · Primera obra</span>
            <h1 className="display-xl" style={{ marginTop: 20, fontSize: 56 }}>
              ¿Cuál es la <em>obra</em><br />que vamos a llevar?
            </h1>
            <p className="body-lg" style={{ marginTop: 14, fontSize: 16 }}>
              Después podrás añadir todas las que quieras. Por ahora, una.
            </p>

            <div style={{ marginTop: 32, display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label className="caption" style={{ display: 'block', marginBottom: 6 }}>Nombre de la obra</label>
                <input
                  className="atelier-input"
                  value={proyectoNombre}
                  onChange={e => { setProyectoNombre(e.target.value); if (error) setError('') }}
                  onKeyDown={e => { if (e.key === 'Enter' && proyectoNombre.trim()) handleStep2(false) }}
                  placeholder="Casa Hidalgo · Polanco"
                  maxLength={100}
                  autoFocus
                />
                <span className="caption" style={{ marginTop: 5, display: 'block' }}>Así verás esta obra en todos los reportes.</span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                <div>
                  <label className="caption" style={{ display: 'block', marginBottom: 6 }}>Tipo de obra</label>
                  <select className="atelier-input" style={{ cursor: 'pointer' }}>
                    <option>Remodelación residencial</option>
                    <option>Obra nueva residencial</option>
                    <option>Comercial</option>
                    <option>Hotelería · Restaurante</option>
                  </select>
                </div>
                <div>
                  <label className="caption" style={{ display: 'block', marginBottom: 6 }}>Fecha de inicio</label>
                  <input
                    className="atelier-input"
                    style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 13 }}
                    type="date"
                    value={proyectoFecha}
                    onChange={e => setProyectoFecha(e.target.value)}
                  />
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 36 }}>
              <button className="btn btn-ghost" onClick={() => { setError(''); setStep(1) }}>← Atrás</button>
              <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                <button className="btn btn-ghost" style={{ fontSize: 13, color: 'var(--tinta-500)' }} onClick={() => handleStep2(true)}>
                  Llenar después
                </button>
                <button
                  className="btn btn-primary btn-lg"
                  onClick={() => handleStep2(false)}
                  disabled={loading || !proyectoNombre.trim()}
                  style={{ opacity: loading || !proyectoNombre.trim() ? 0.55 : 1 }}
                >
                  {loading ? 'Guardando...' : <>Continuar a cuadrilla <ArrowRight size={14} /></>}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── Paso 3: Cuadrilla ── */}
        {step === 3 && (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', maxWidth: 600, marginTop: 16 }}>
            <span className="eyebrow" style={{ fontSize: 11 }}>Paso 3 / 4 · Cuadrilla</span>
            <h1 className="display-xl" style={{ marginTop: 20, fontSize: 56 }}>
              Agrega a tu <em>gente</em>.
            </h1>
            <p className="body-lg" style={{ marginTop: 14, fontSize: 16 }}>
              Registra a cada trabajador con su rol y pago. Nomiextra calcula la nómina a partir de esto.
            </p>

            <div style={{ marginTop: 28, border: '1px solid var(--at-border-strong)', borderRadius: 10, overflow: 'hidden' }}>
              {/* Header */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 108px 100px 96px 32px', gap: 10, padding: '9px 14px', background: 'var(--bg-paper)', borderBottom: '1px solid var(--at-border)' }}>
                {['Nombre', 'Rol', 'Tipo pago', 'Tarifa', ''].map(h => (
                  <span key={h} className="caption">{h}</span>
                ))}
              </div>

              {workers.map((w, i) => {
                const tarifaWarning = w.nombre.trim() && (parseFloat(w.tarifa) || 0) === 0
                return (
                <div key={w.id} style={{
                  display: 'grid', gridTemplateColumns: '1fr 108px 100px 96px 32px',
                  gap: 10, padding: '10px 14px',
                  borderBottom: i < workers.length - 1 ? '1px solid var(--at-border)' : 'none',
                  alignItems: 'center',
                  background: tarifaWarning ? '#FFFBF0' : i % 2 === 0 ? 'transparent' : 'var(--bg-paper)',
                }}>
                  <input
                    className="atelier-input"
                    style={{ padding: '7px 10px', fontSize: 13 }}
                    value={w.nombre}
                    onChange={e => updateWorker(w.id, 'nombre', e.target.value)}
                    placeholder="Nombre completo"
                  />
                  <select
                    className="atelier-input"
                    style={{ padding: '7px 8px', fontSize: 12.5, cursor: 'pointer' }}
                    value={w.puesto}
                    onChange={e => updateWorker(w.id, 'puesto', e.target.value)}
                  >
                    {['Albañil', 'Ayudante', 'Maestro', 'Eléctrico', 'Plomero', 'Soldador', 'Otro'].map(p => (
                      <option key={p}>{p}</option>
                    ))}
                  </select>
                  <select
                    className="atelier-input"
                    style={{ padding: '7px 8px', fontSize: 12.5, cursor: 'pointer' }}
                    value={w.modalidad}
                    onChange={e => updateWorker(w.id, 'modalidad', e.target.value as WorkerRow['modalidad'])}
                  >
                    <option value="por_dia">Diario</option>
                    <option value="por_hora">Por hora</option>
                    <option value="sueldo_fijo">Sueldo fijo</option>
                  </select>
                  <div style={{ display: 'flex', alignItems: 'center', border: '1px solid var(--at-border-strong)', borderRadius: 8, background: 'white', padding: '0 8px', height: 36 }}>
                    <span className="mono" style={{ fontSize: 11, color: 'var(--tinta-500)', marginRight: 3 }}>$</span>
                    <input
                      style={{ width: 48, border: 'none', background: 'transparent', fontFamily: 'JetBrains Mono, monospace', fontSize: 13, fontWeight: 500, outline: 'none', padding: 0 }}
                      value={w.tarifa}
                      onChange={e => updateWorker(w.id, 'tarifa', e.target.value)}
                      placeholder="450"
                      inputMode="numeric"
                    />
                  </div>
                  <button
                    onClick={() => removeWorker(w.id)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--tinta-300)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0 }}
                  >
                    <X size={14} />
                  </button>
                  {tarifaWarning && (
                    <div style={{ gridColumn: '1 / -1', fontSize: 11.5, color: '#92650A', paddingTop: 2 }}>
                      Ingresa una tarifa para este trabajador.
                    </div>
                  )}
                </div>
                )
              })}

              <div style={{ padding: '10px 14px', borderTop: '1px solid var(--at-border)', display: 'flex', gap: 8, background: 'var(--bg-paper)' }}>
                <button className="btn btn-ghost btn-sm" onClick={addWorker} style={{ fontSize: 12.5, display: 'flex', alignItems: 'center', gap: 5 }}>
                  <Plus size={12} /> Agregar trabajador
                </button>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 28 }}>
              <button className="btn btn-ghost" onClick={() => { setError(''); setStep(2) }}>← Atrás</button>
              <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                <button className="btn btn-ghost" style={{ fontSize: 13, color: 'var(--tinta-500)' }} onClick={() => handleStep3(true)}>
                  Llenar después
                </button>
                <button
                  className="btn btn-primary btn-lg"
                  onClick={() => handleStep3(false)}
                  disabled={loading}
                >
                  {loading ? 'Guardando...' : <>Continuar y finalizar <ArrowRight size={14} /></>}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── Paso 4: Listo ── */}
        {step === 4 && (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', maxWidth: 540, marginTop: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 18 }}>
              <div style={{ width: 44, height: 44, background: 'var(--bosque-500)', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Check size={22} color="var(--cuero-50)" strokeWidth={2.5} />
              </div>
              <span className="eyebrow" style={{ fontSize: 11 }}>Configuración completa · Todo en su lugar</span>
            </div>
            <h1 className="display-xl" style={{ fontSize: 60 }}>
              Tu obra<br />está <em>en Nomiextra</em>.
            </h1>
            <p className="body-lg" style={{ marginTop: 18, fontSize: 16 }}>
              Despacho, obra y cuadrilla configurados. Ya puedes marcar asistencias, generar nóminas y enviar cotizaciones.
            </p>

            {/* Summary cards */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginTop: 28 }}>
              <div style={{ padding: '14px 12px', borderRadius: 10, background: 'var(--bosque-50)', border: '1px solid var(--bosque-100)' }}>
                <Building2 size={16} color="var(--bosque-500)" />
                <div style={{ fontFamily: 'Fraunces, Georgia, serif', fontSize: 14, fontWeight: 500, marginTop: 8, lineHeight: 1.2 }}>{summaryEmpresa}</div>
                <div className="caption" style={{ marginTop: 4 }}>Despacho listo</div>
              </div>
              <div style={{ padding: '14px 12px', borderRadius: 10, background: 'var(--cuero-200)', border: '1px solid var(--cuero-300)' }}>
                <MapPin size={16} color="var(--cuero-500)" />
                <div style={{ fontFamily: 'Fraunces, Georgia, serif', fontSize: 14, fontWeight: 500, marginTop: 8, lineHeight: 1.2 }}>{summaryProyecto || 'Sin obra aún'}</div>
                <div className="caption" style={{ marginTop: 4 }}>{summaryProyecto ? 'Obra creada' : 'Agregar después'}</div>
              </div>
              <div style={{ padding: '14px 12px', borderRadius: 10, background: 'var(--petroleo-50)', border: '1px solid var(--petroleo-100)' }}>
                <Users size={16} color="var(--petroleo-500)" />
                <div style={{ fontFamily: 'Fraunces, Georgia, serif', fontSize: 14, fontWeight: 500, marginTop: 8, lineHeight: 1.2 }}>
                  {workerCount > 0 ? `${workerCount} trabajador${workerCount !== 1 ? 'es' : ''}` : 'Sin cuadrilla aún'}
                </div>
                <div className="caption" style={{ marginTop: 4 }}>{workerCount > 0 ? 'Cuadrilla activa' : 'Agregar después'}</div>
              </div>
            </div>

            {/* Quick actions */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 28 }}>
              <div className="caption" style={{ marginBottom: 4 }}>¿Qué quieres hacer primero?</div>
              {[
                { Icon: CalendarDays, label: 'Marcar asistencias de hoy', sub: 'Registra quién entró a obra', href: '/dashboard/asistencias', primary: true },
                { Icon: Receipt,      label: 'Generar primera nómina',    sub: 'Configura el período de pago', href: '/dashboard/nomina/nueva/wizard' },
                { Icon: FileText,     label: 'Crear cotización',          sub: 'PDF con tu logo en 3 minutos', href: '/dashboard/cotizaciones/nueva' },
              ].map(a => (
                <a key={a.href} href={a.href} style={{
                  display: 'flex', gap: 12, alignItems: 'center', padding: '12px 14px',
                  background: a.primary ? 'var(--bosque-500)' : 'var(--surface)',
                  border: `1px solid ${a.primary ? 'var(--bosque-500)' : 'var(--at-border-strong)'}`,
                  borderRadius: 10, textDecoration: 'none',
                }}>
                  <div style={{ width: 34, height: 34, borderRadius: 8, background: a.primary ? 'rgba(250,246,239,0.15)' : 'var(--cuero-100)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <a.Icon size={17} color={a.primary ? 'var(--cuero-50)' : 'var(--cuero-500)'} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 14, fontWeight: 500, color: a.primary ? 'var(--cuero-50)' : 'var(--tinta)' }}>{a.label}</div>
                    <div className="caption" style={{ marginTop: 2, color: a.primary ? 'rgba(250,246,239,0.65)' : 'var(--tinta-500)' }}>{a.sub}</div>
                  </div>
                  <ArrowRight size={14} color={a.primary ? 'var(--cuero-50)' : 'var(--tinta-500)'} />
                </a>
              ))}
            </div>

            <div style={{ marginTop: 18 }}>
              <a href="/dashboard" className="caption" style={{ color: 'var(--tinta-500)', textDecoration: 'none' }}>
                Ir al dashboard →
              </a>
            </div>
          </div>
        )}
      </section>

      {/* RIGHT — photo panel */}
      <RightPanel step={step} />
    </div>
  )
}
