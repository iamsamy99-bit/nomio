declare global {
  interface Window {
    electron?: { isElectron: true }
  }
}

export type SuscripcionTier = 'gratuito' | 'pyme' | 'basico' | 'pro' | 'premium'
export type ModalidadPago = 'por_dia' | 'por_hora' | 'sueldo_fijo' | 'mixto'
export type EstadoNomina = 'en_progreso' | 'generada' | 'pagada'
export type EstadoCotizacion = 'borrador' | 'enviada' | 'aceptada' | 'rechazada'
export type RolUsuario = 'owner' | 'admin' | 'operador' | 'capataz'
export type TipoContacto = 'cliente' | 'proveedor' | 'subcontratista' | 'arquitecto' | 'otro'

export interface Empresa {
  id: string
  nombre: string
  rfc?: string
  telefono?: string
  email_contacto?: string
  suscripcion_tier: SuscripcionTier
  suscripcion_activa: boolean
  fecha_vencimiento?: string
  stripe_customer_id?: string
  stripe_subscription_id?: string
  limite_trabajadores: number
  limite_proyectos: number
  limite_cotizaciones_mes: number
  modulo_asistencias: boolean
  modulo_horas_extra: boolean
  modulo_conceptos_adicionales: boolean
  modulo_plantillas: boolean
  modulo_export_pdf: boolean
  modulo_multi_modalidad: boolean
  activa: boolean
  created_at: string
  logo_url?: string
  pagar_dias_festivos?: boolean
  aplica_imss?: boolean
  aplica_isr?: boolean
  direccion?: string | null
  website?: string | null
}

export interface EmpresaUser {
  id: string
  empresa_id: string
  user_id: string
  rol: RolUsuario
  activo: boolean
}

export interface Proyecto {
  id: string
  empresa_id: string
  nombre: string
  clave?: string
  encargado: string
  descripcion?: string
  fecha_inicio?: string
  fecha_fin_estimada?: string
  dias_laborales_semana: '5_dias' | '6_dias'
  activo: boolean
  color_etiqueta: string
  created_at: string
}

export interface Trabajador {
  id: string
  empresa_id: string
  nombre: string
  modalidad_pago: ModalidadPago
  tarifa_dia?: number | null
  tarifa_hora?: number | null
  sueldo_fijo?: number | null
  tarifa_hora_extra?: number | null
  es_administrativo: boolean
  activo: boolean
  notas?: string | null
  telefono?: string | null
  telefono_emergencia?: string | null
  contacto_emergencia_nombre?: string | null
  contacto_emergencia_parentesco?: string | null
  email?: string | null
  direccion?: string | null
  curp?: string | null
  rfc?: string | null
  nss?: string | null
  sbc_diario?: number | null
  fecha_ingreso?: string | null
  fecha_nacimiento?: string | null
  puesto?: string | null
  banco?: string | null
  cuenta_clabe?: string | null
  created_at?: string
  updated_at?: string
}

export interface PeriodoNomina {
  id: string
  empresa_id: string
  proyecto_id: string
  numero_nomina: number
  encargado: string
  fecha_inicio: string
  fecha_fin: string
  observaciones_actividades?: string
  estado: EstadoNomina
  subtotal_mano_obra: number
  subtotal_administrativos: number
  subtotal_conceptos: number
  total_nomina: number
  created_at: string
  proyectos?: Proyecto
}

export interface LineaNomina {
  id: string
  empresa_id: string
  nomina_id: string
  trabajador_id: string
  horas_trabajadas: number
  dias_trabajados: number
  horas_extra: number
  total_horas_extra: number
  subtotal: number
  descuentos: number
  imss_obrero?: number
  isr_retenido?: number
  total: number
  notas_linea?: string
  trabajadores?: Trabajador
}

export interface ConceptoAdicional {
  id: string
  empresa_id: string
  nomina_id: string
  trabajador_id?: string
  nombre: string
  tipo: 'suma' | 'descuento'
  aplica_a: 'trabajador_individual' | 'nomina_total'
  monto: number
  descripcion?: string
}

export interface Cliente {
  id: string
  empresa_id: string
  nombre: string
  tipo: TipoContacto
  email?: string | null
  telefono?: string | null
  direccion?: string | null
  empresa_cliente?: string | null
  puesto?: string | null
  notas?: string | null
  ultimo_contacto_at?: string | null
  activo: boolean
  created_at: string
}

export type RecordatorioCategoria = 'obra' | 'contacto' | 'cotizacion' | 'general'

export interface ProyectoRecordatorio {
  id: string
  empresa_id: string
  proyecto_id?: string | null
  cliente_id?: string | null
  cotizacion_id?: string | null
  categoria?: RecordatorioCategoria
  titulo: string
  fecha_recordatorio: string
  notas?: string | null
  completado: boolean
  created_at: string
  proyectos?: { nombre: string } | null
  clientes?: { nombre: string } | null
}

export interface Cotizacion {
  id: string
  empresa_id: string
  numero_cotizacion: number
  titulo: string
  cliente_id?: string | null
  cliente_nombre: string
  cliente_email?: string
  cliente_telefono?: string
  cliente_direccion?: string
  fecha_emision: string
  fecha_validez?: string
  logo_url?: string
  notas?: string
  terminos?: string
  subtotal: number
  iva_porcentaje: number
  iva_monto: number
  total: number
  estado: EstadoCotizacion
  moneda: string
  created_at: string
}

export interface CotizacionItem {
  id: string
  empresa_id: string
  cotizacion_id: string
  orden: number
  concepto: string
  descripcion?: string
  cantidad: number
  unidad: string
  precio_unitario: number
  importe: number
}

export interface RegistroAsistencia {
  id: string
  empresa_id: string
  proyecto_id: string
  trabajador_id: string
  fecha: string
  asistio: boolean
  hora_llegada?: string
  hora_salida?: string
  horas_calculadas?: number
}
