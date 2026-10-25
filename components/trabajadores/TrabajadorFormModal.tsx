'use client'
import { useState } from 'react'
import { X, UserCheck, Phone, Mail, AlertCircle } from 'lucide-react'
import { MODALIDADES } from '@/lib/constants'

type TabKey = 'basicos' | 'contacto' | 'fiscales' | 'emergencia'

export type TrabajadorFormState = {
  nombre: string; modalidad_pago: string; tarifa_dia: string; tarifa_hora: string
  sueldo_fijo: string; tarifa_hora_extra: string; es_administrativo: boolean; notas: string
  puesto: string; telefono: string; email: string; direccion: string
  fecha_ingreso: string; fecha_nacimiento: string
  rfc: string; curp: string; nss: string; sbc_diario: string
  banco: string; cuenta_clabe: string
  contacto_emergencia_nombre: string; contacto_emergencia_parentesco: string; telefono_emergencia: string
}

export const EMPTY_FORM: TrabajadorFormState = {
  nombre: '', modalidad_pago: 'por_dia', tarifa_dia: '', tarifa_hora: '',
  sueldo_fijo: '', tarifa_hora_extra: '', es_administrativo: false, notas: '',
  puesto: '', telefono: '', email: '', direccion: '',
  fecha_ingreso: '', fecha_nacimiento: '',
  rfc: '', curp: '', nss: '', sbc_diario: '',
  banco: '', cuenta_clabe: '',
  contacto_emergencia_nombre: '', contacto_emergencia_parentesco: '', telefono_emergencia: '',
}

interface Props {
  editing: boolean
  form: TrabajadorFormState
  setForm: (f: TrabajadorFormState) => void
  error: string
  saving: boolean
  onSave: (e: React.FormEvent) => void
  onClose: () => void
}

const TABS: { key: TabKey; label: string; icon: typeof UserCheck }[] = [
  { key: 'basicos', label: 'Basicos', icon: UserCheck },
  { key: 'contacto', label: 'Contacto', icon: Phone },
  { key: 'fiscales', label: 'Fiscales / Bancarios', icon: Mail },
  { key: 'emergencia', label: 'Emergencia', icon: AlertCircle },
]

export default function TrabajadorFormModal({ editing, form, setForm, error, saving, onSave, onClose }: Props) {
  const [tab, setTab] = useState<TabKey>('basicos')
  const u = (field: keyof TrabajadorFormState, value: string | boolean) => setForm({ ...form, [field]: value })

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-surface rounded-2xl w-full max-w-2xl max-h-[92vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between p-5 border-b border-border">
          <h2 className="font-display font-bold" style={{ color: 'var(--tinta)' }}>{editing ? 'Editar' : 'Nuevo'} trabajador</h2>
          <button onClick={onClose}><X className="w-5 h-5" style={{ color: 'var(--tinta-500)' }} /></button>
        </div>

        <div className="flex border-b border-border overflow-x-auto shrink-0">
          {TABS.map(t => {
            const Icon = t.icon
            return (
              <button key={t.key} type="button" onClick={() => setTab(t.key)}
                className={`flex items-center gap-1.5 px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                  tab === t.key ? 'border-[var(--primary)] text-[var(--primary)]' : 'border-transparent text-[var(--tinta-500)] hover:text-[var(--tinta)]'
                }`}>
                <Icon className="w-3.5 h-3.5" /> {t.label}
              </button>
            )
          })}
        </div>

        <form onSubmit={onSave} className="overflow-y-auto flex-1">
          <div className="p-5 space-y-4">
            {error && <div className="flex items-center gap-2 bg-red-50 text-red-700 text-sm p-3 rounded-lg"><AlertCircle className="w-4 h-4 shrink-0" />{error}</div>}

            {tab === 'basicos' && (
              <>
                <div>
                  <label className="label">Nombre completo *</label>
                  <input value={form.nombre} onChange={e => u('nombre', e.target.value)} className="input" required maxLength={100} />
                </div>
                <div className="grid sm:grid-cols-2 gap-3">
                  <div>
                    <label className="label">Puesto / Cargo</label>
                    <input value={form.puesto} onChange={e => u('puesto', e.target.value)} className="input" placeholder="Ej: Albanil, Maestro de obra" maxLength={80} />
                  </div>
                  <div className="flex items-center gap-2 pt-6">
                    <label className="flex items-center gap-2 cursor-pointer text-sm" style={{ color: 'var(--tinta)' }}>
                      <input type="checkbox" checked={form.es_administrativo} onChange={e => u('es_administrativo', e.target.checked)} className="rounded" />
                      Es administrativo
                    </label>
                  </div>
                </div>
                <div>
                  <label className="label">Modalidad de pago *</label>
                  <select value={form.modalidad_pago} onChange={e => u('modalidad_pago', e.target.value)} className="input">
                    {MODALIDADES.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                  </select>
                </div>
                <div className="grid sm:grid-cols-2 gap-3">
                  {(form.modalidad_pago === 'por_dia' || form.modalidad_pago === 'mixto') && (
                    <div><label className="label">Tarifa dia ($)</label><input type="number" step="0.01" min="0" value={form.tarifa_dia} onChange={e => u('tarifa_dia', e.target.value)} className="input" /></div>
                  )}
                  {(form.modalidad_pago === 'por_hora' || form.modalidad_pago === 'mixto') && (
                    <div><label className="label">Tarifa hora ($)</label><input type="number" step="0.01" min="0" value={form.tarifa_hora} onChange={e => u('tarifa_hora', e.target.value)} className="input" /></div>
                  )}
                  {form.modalidad_pago === 'sueldo_fijo' && (
                    <div className="sm:col-span-2"><label className="label">Sueldo fijo mensual ($)</label><input type="number" step="0.01" min="0" value={form.sueldo_fijo} onChange={e => u('sueldo_fijo', e.target.value)} className="input" /></div>
                  )}
                  <div><label className="label">Tarifa hora extra ($)</label><input type="number" step="0.01" min="0" value={form.tarifa_hora_extra} onChange={e => u('tarifa_hora_extra', e.target.value)} className="input" /></div>
                </div>
                <div className="grid sm:grid-cols-2 gap-3">
                  <div><label className="label">Fecha de ingreso</label><input type="date" value={form.fecha_ingreso} onChange={e => u('fecha_ingreso', e.target.value)} className="input" /></div>
                  <div><label className="label">Fecha de nacimiento</label><input type="date" value={form.fecha_nacimiento} onChange={e => u('fecha_nacimiento', e.target.value)} className="input" /></div>
                </div>
                <div><label className="label">Notas internas</label><textarea value={form.notas} onChange={e => u('notas', e.target.value)} className="input h-20 resize-none" maxLength={500} /></div>
              </>
            )}

            {tab === 'contacto' && (
              <>
                <div><label className="label">Telefono principal</label><input value={form.telefono} onChange={e => u('telefono', e.target.value)} className="input" placeholder="33 1234 5678" maxLength={20} /></div>
                <div><label className="label">Correo electronico</label><input type="email" value={form.email} onChange={e => u('email', e.target.value)} className="input" placeholder="trabajador@ejemplo.com" /></div>
                <div><label className="label">Direccion</label><textarea value={form.direccion} onChange={e => u('direccion', e.target.value)} className="input h-20 resize-none" placeholder="Calle, numero, colonia, ciudad, CP" maxLength={300} /></div>
              </>
            )}

            {tab === 'fiscales' && (
              <>
                <div className="grid sm:grid-cols-2 gap-3">
                  <div><label className="label">RFC</label><input value={form.rfc} onChange={e => u('rfc', e.target.value.toUpperCase())} className="input font-mono" placeholder="ABCD010101XXX" maxLength={13} /></div>
                  <div><label className="label">CURP</label><input value={form.curp} onChange={e => u('curp', e.target.value.toUpperCase())} className="input font-mono" placeholder="ABCD010101HDFXYZ00" maxLength={18} /></div>
                </div>
                <div className="grid sm:grid-cols-2 gap-3">
                  <div><label className="label">NSS (IMSS)</label><input value={form.nss} onChange={e => u('nss', e.target.value)} className="input font-mono" placeholder="12345678901" maxLength={11} /></div>
                  <div>
                    <label className="label">SBC diario ($)</label>
                    <input type="number" step="0.01" min="0" value={form.sbc_diario} onChange={e => u('sbc_diario', e.target.value)} className="input font-mono" placeholder="Ej. 350.00" />
                    <p className="text-xs mt-1" style={{ color: 'var(--tinta-500)' }}>Salario Base de Cotizacion para calculo IMSS/ISR. Si no se indica, se usa la tarifa dia.</p>
                  </div>
                </div>
                <div className="pt-3 border-t border-border">
                  <p className="text-xs font-semibold uppercase tracking-wide mb-3" style={{ color: 'var(--tinta-500)' }}>Datos bancarios</p>
                  <div className="grid sm:grid-cols-2 gap-3">
                    <div><label className="label">Banco</label><input value={form.banco} onChange={e => u('banco', e.target.value)} className="input" placeholder="BBVA, Santander..." /></div>
                    <div><label className="label">CLABE interbancaria</label><input value={form.cuenta_clabe} onChange={e => u('cuenta_clabe', e.target.value.replace(/\D/g, ''))} className="input font-mono" placeholder="18 digitos" maxLength={18} /></div>
                  </div>
                </div>
              </>
            )}

            {tab === 'emergencia' && (
              <>
                <p className="text-xs bg-bg rounded-lg p-3" style={{ color: 'var(--tinta-500)' }}>Persona a contactar en caso de accidente o emergencia laboral.</p>
                <div><label className="label">Nombre completo</label><input value={form.contacto_emergencia_nombre} onChange={e => u('contacto_emergencia_nombre', e.target.value)} className="input" maxLength={100} /></div>
                <div className="grid sm:grid-cols-2 gap-3">
                  <div><label className="label">Parentesco</label><input value={form.contacto_emergencia_parentesco} onChange={e => u('contacto_emergencia_parentesco', e.target.value)} className="input" placeholder="Esposa, madre, hijo..." maxLength={30} /></div>
                  <div><label className="label">Telefono</label><input value={form.telefono_emergencia} onChange={e => u('telefono_emergencia', e.target.value)} className="input" placeholder="33 1234 5678" maxLength={20} /></div>
                </div>
              </>
            )}
          </div>

          <div className="flex gap-3 p-5 border-t border-border bg-bg">
            <button type="button" onClick={onClose} className="btn-secondary flex-1">Cancelar</button>
            <button type="submit" disabled={saving} className="btn-primary flex-1">{saving ? 'Guardando...' : 'Guardar'}</button>
          </div>
        </form>
      </div>
    </div>
  )
}
