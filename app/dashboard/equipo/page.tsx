'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useEmpresa } from '@/components/layout/EmpresaContext'
import { UserPlus, AlertCircle, Shield, ChevronDown, ChevronUp, Trash2, Loader2 } from 'lucide-react'
import Link from 'next/link'
import { canManageTeam, rolLabel } from '@/lib/permissions'
import type { EmpresaUser, RolUsuario } from '@/types'

type Miembro = EmpresaUser & { email?: string; full_name?: string }

const ROL_DESCRIPTIONS: Record<string, string> = {
  owner: 'Acceso completo (excepto configuracion de empresa)',
  admin: 'Acceso completo (excepto configuracion de empresa)',
  operador: 'Acceso a nominas, proyectos, trabajadores y reportes',
  capataz: 'Solo asistencias y proyectos asignados como encargado. Puede agregar evidencias.',
}

const PERMISOS_TABLE = [
  { funcion: 'Nominas y pagos',        admin: true,  capataz: false },
  { funcion: 'Trabajadores',           admin: true,  capataz: false },
  { funcion: 'Cotizaciones / CRM',     admin: true,  capataz: false },
  { funcion: 'Proyectos (todos)',       admin: true,  capataz: false },
  { funcion: 'Proyectos asignados',     admin: true,  capataz: true  },
  { funcion: 'Asistencias',            admin: true,  capataz: true  },
  { funcion: 'Agregar evidencias',     admin: true,  capataz: true  },
  { funcion: 'Reportes y estadisticas',admin: true,  capataz: false },
  { funcion: 'Configuracion empresa',  admin: false, capataz: false },
]

function RolBadge({ rol }: { rol: string }) {
  const styles: Record<string, React.CSSProperties> = {
    owner:    { backgroundColor: 'color-mix(in srgb, var(--bosque-500) 15%, transparent)', color: 'var(--bosque-500)', borderColor: 'color-mix(in srgb, var(--bosque-500) 30%, transparent)' },
    admin:    { backgroundColor: 'color-mix(in srgb, var(--petroleo-500) 15%, transparent)', color: 'var(--petroleo-300)', borderColor: 'color-mix(in srgb, var(--petroleo-500) 30%, transparent)' },
    operador: { backgroundColor: 'color-mix(in srgb, var(--ambar) 15%, transparent)', color: 'var(--ambar)', borderColor: 'color-mix(in srgb, var(--ambar) 30%, transparent)' },
    capataz:  { backgroundColor: 'color-mix(in srgb, var(--terracota) 15%, transparent)', color: 'var(--terracota)', borderColor: 'color-mix(in srgb, var(--terracota) 30%, transparent)' },
  }
  const s = styles[rol] ?? styles.operador
  return (
    <span
      className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border"
      style={s}
    >
      {rolLabel(rol)}
    </span>
  )
}

export default function EquipoPage() {
  const supabase = useMemo(() => createClient(), [])
  const { empresaId, rol } = useEmpresa()
  const [miembros, setMiembros] = useState<Miembro[]>([])
  const [email, setEmail] = useState('')
  const [nuevoRol, setNuevoRol] = useState<'capataz' | 'operador' | 'admin'>('capataz')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [permisosOpen, setPermisosOpen] = useState(false)
  const [actingId, setActingId] = useState<string | null>(null)
  const [memberMsg, setMemberMsg] = useState('')
  const [confirmDelete, setConfirmDelete] = useState<Miembro | null>(null)

  const loadData = useCallback(async () => {
    try {
      const { data: list } = await supabase
        .rpc('get_empresa_members', { p_empresa_id: empresaId })

      setMiembros((list || []) as Miembro[])
    } catch (err) {
      console.error('[equipo] load', err)
    } finally {
      setLoading(false)
    }
  }, [supabase, empresaId])

  useEffect(() => { loadData() }, [loadData])

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccess('')
    setSaving(true)
    try {
      const { data, error: rpcErr } = await supabase.rpc('agregar_miembro_empresa', {
        p_email: email.trim(),
        p_rol: nuevoRol,
      })
      if (rpcErr) {
        if (rpcErr.message.includes('agregar_miembro_empresa')) {
          setError('Ejecuta la migracion SQL en Supabase (funcion agregar_miembro_empresa).')
        } else {
          setError(rpcErr.message)
        }
        return
      }
      const result = data as { ok?: boolean; error?: string; message?: string; rol?: string }
      if (!result?.ok) {
        if (result?.error === 'user_not_found' || result?.error === 'invite_failed') {
          setError(result.message || 'No se pudo agregar. Verifica que el correo sea correcto y que la persona tenga cuenta en Nomio.')
        } else if (result?.error === 'sin_permiso') {
          setError('No tienes permiso para agregar miembros.')
        } else {
          setError(result?.message || 'No se pudo agregar el usuario.')
        }
        return
      }
      setSuccess(`Usuario agregado como ${rolLabel(result.rol || nuevoRol)}.`)
      setEmail('')
      await loadData()
    } finally {
      setSaving(false)
    }
  }

  const cambiarRol = async (m: Miembro, nuevoRol: string) => {
    setActingId(m.user_id); setMemberMsg('')
    try {
      const { data, error: rpcErr } = await supabase.rpc('actualizar_rol_miembro', { p_user_id: m.user_id, p_rol: nuevoRol })
      const result = data as { ok?: boolean; message?: string } | null
      if (rpcErr || !result?.ok) {
        setMemberMsg(result?.message || rpcErr?.message || 'No se pudo cambiar el rol.')
        return
      }
      setMiembros(prev => prev.map(x => x.user_id === m.user_id ? { ...x, rol: nuevoRol as RolUsuario } : x))
    } finally {
      setActingId(null)
    }
  }

  const eliminarMiembro = async (m: Miembro) => {
    setActingId(m.user_id); setMemberMsg('')
    try {
      const { data, error: rpcErr } = await supabase.rpc('eliminar_miembro_empresa', { p_user_id: m.user_id })
      const result = data as { ok?: boolean; message?: string } | null
      if (rpcErr || !result?.ok) {
        setMemberMsg(result?.message || rpcErr?.message || 'No se pudo eliminar al miembro.')
        return
      }
      setMiembros(prev => prev.filter(x => x.user_id !== m.user_id))
    } finally {
      setActingId(null)
      setConfirmDelete(null)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-6 h-6 border-2 border-navy-200 border-t-primary rounded-full animate-spin" />
      </div>
    )
  }

  if (!canManageTeam(rol)) {
    return (
      <div className="max-w-lg mx-auto tile text-center py-10">
        <Shield className="w-10 h-10 mx-auto text-ink-soft mb-3" />
        <p className="text-ink-soft">Solo el propietario o administrador puede gestionar el equipo.</p>
        <Link href="/dashboard/perfil" className="btn-secondary text-sm mt-4 inline-block">Volver a perfil</Link>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto space-y-5">
      <div>
        <h1 className="font-display text-2xl font-bold">Equipo</h1>
        <p className="text-sm text-ink-soft mt-0.5">
          Invita usuarios adicionales y asigna el rol que mejor corresponda a cada persona.
        </p>
      </div>

      {/* Permisos por rol — collapsible summary */}
      <div className="tile p-0 overflow-hidden">
        <button
          type="button"
          onClick={() => setPermisosOpen((v) => !v)}
          className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-white/5 transition-colors"
        >
          <span className="font-display font-semibold text-sm flex items-center gap-2">
            <Shield className="w-4 h-4 text-primary" /> Permisos por rol
          </span>
          {permisosOpen ? <ChevronUp className="w-4 h-4 text-ink-soft" /> : <ChevronDown className="w-4 h-4 text-ink-soft" />}
        </button>
        {permisosOpen && (
          <div className="border-t border-border px-4 pb-4 pt-3">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs uppercase tracking-wide text-ink-soft">
                  <th className="text-left pb-2 font-medium w-1/2">Funcion</th>
                  <th className="text-center pb-2 font-medium">Admin / Operador</th>
                  <th className="text-center pb-2 font-medium">Capataz</th>
                </tr>
              </thead>
              <tbody>
                {PERMISOS_TABLE.map((row) => (
                  <tr key={row.funcion} className="border-t border-border/50">
                    <td className="py-1.5 text-ink">{row.funcion}</td>
                    <td className="py-1.5 text-center">
                      {row.admin
                        ? <span className="text-green-400 font-bold">✓</span>
                        : <span className="text-ink-soft/40">—</span>}
                    </td>
                    <td className="py-1.5 text-center">
                      {row.capataz
                        ? <span className="text-green-400 font-bold">✓</span>
                        : <span className="text-ink-soft/40">—</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="tile">
        <h2 className="font-display font-semibold mb-3 flex items-center gap-2">
          <UserPlus className="w-4 h-4 text-primary" /> Agregar miembro
        </h2>
        <form onSubmit={handleInvite} className="space-y-3">
          <div>
            <label className="label">Correo del usuario (debe estar registrado)</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="input"
              required
              placeholder="capataz@empresa.com"
            />
          </div>
          <div>
            <label className="label">Rol</label>
            <select value={nuevoRol} onChange={(e) => setNuevoRol(e.target.value as typeof nuevoRol)} className="input">
              <option value="capataz">Capataz</option>
              <option value="operador">Operador</option>
              <option value="admin">Administrador</option>
            </select>
            <p className="text-xs text-ink-soft mt-1.5">{ROL_DESCRIPTIONS[nuevoRol]}</p>
            {nuevoRol === 'capataz' && (
              <p className="text-xs mt-1 px-2 py-1.5 rounded-lg border" style={{ borderColor: 'color-mix(in srgb, var(--terracota) 30%, transparent)', backgroundColor: 'color-mix(in srgb, var(--terracota) 8%, transparent)', color: 'var(--terracota)' }}>
                El capataz solo vera los proyectos donde su nombre este registrado como encargado.
              </p>
            )}
          </div>
          {error && (
            <div className="flex items-start gap-2 text-sm text-red-400 bg-red-500/10 p-3 rounded-xl border border-red-500/20">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" /> {error}
            </div>
          )}
          {success && <p className="text-sm text-accent">{success}</p>}
          <button type="submit" disabled={saving} className="btn-primary text-sm">
            {saving ? 'Agregando...' : 'Agregar al equipo'}
          </button>
        </form>
      </div>

      <div className="tile">
        <h2 className="font-display font-semibold mb-3">Miembros activos ({miembros.length})</h2>
        {memberMsg && (
          <div className="flex items-start gap-2 text-sm text-red-400 bg-red-500/10 p-3 rounded-xl border border-red-500/20 mb-3">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" /> {memberMsg}
          </div>
        )}
        <ul className="space-y-2">
          {miembros.map((m) => (
            <li key={m.id} className="flex justify-between items-center gap-3 py-2 border-b border-border last:border-0">
              <div className="flex flex-col gap-0.5 min-w-0">
                <span className="text-sm font-medium truncate max-w-[200px]" style={{ color: 'var(--text)' }}>
                  {m.full_name || m.email?.split('@')[0] || '—'}
                </span>
                <span className="text-xs truncate max-w-[200px]" style={{ color: 'var(--text-muted)' }}>{m.email}</span>
              </div>
              {m.rol === 'owner' ? (
                <RolBadge rol={m.rol} />
              ) : (
                <div className="flex items-center gap-2 shrink-0">
                  <select
                    value={m.rol}
                    disabled={actingId === m.user_id}
                    onChange={(e) => cambiarRol(m, e.target.value)}
                    className="input text-xs py-1 w-auto"
                    aria-label="Cambiar rol"
                  >
                    <option value="admin">Administrador</option>
                    <option value="operador">Operador</option>
                    <option value="capataz">Capataz</option>
                  </select>
                  <button
                    onClick={() => setConfirmDelete(m)}
                    disabled={actingId === m.user_id}
                    className="p-1.5 rounded-lg transition-colors disabled:opacity-50"
                    style={{ color: 'var(--text-muted)' }}
                    title="Eliminar del equipo"
                  >
                    {actingId === m.user_id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                  </button>
                </div>
              )}
            </li>
          ))}
        </ul>
        <p className="text-xs mt-3" style={{ color: 'var(--text-muted)' }}>
          ¿El correo quedó mal? Elimina al miembro y vuelve a agregarlo con el correo correcto.
        </p>
      </div>

      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="rounded-2xl shadow-2xl w-full max-w-sm p-6 space-y-4" style={{ background: 'var(--surface)' }}>
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: 'rgba(160,78,62,0.12)' }}>
                <Trash2 className="w-5 h-5" style={{ color: 'var(--rojo-falta, #ef4444)' }} />
              </div>
              <div>
                <h3 className="font-display font-semibold" style={{ color: 'var(--text)' }}>Eliminar del equipo</h3>
                <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
                  {confirmDelete.full_name || confirmDelete.email} perderá el acceso a esta cuenta. Esta acción no se puede deshacer.
                </p>
              </div>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setConfirmDelete(null)} disabled={!!actingId} className="btn-secondary flex-1 text-sm">Cancelar</button>
              <button onClick={() => eliminarMiembro(confirmDelete)} disabled={!!actingId} className="btn-primary flex-1 text-sm" style={{ background: 'var(--rojo-falta, #ef4444)' }}>
                {actingId ? 'Eliminando...' : 'Sí, eliminar'}
              </button>
            </div>
          </div>
        </div>
      )}

      <Link href="/dashboard/perfil" className="text-sm text-primary hover:underline">← Perfil</Link>
    </div>
  )
}
