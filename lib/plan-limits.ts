export type Tier = 'gratuito' | 'basico' | 'pro' | 'premium' | 'pyme'

export interface PlanConfig {
  tier: Tier
  nombre: string
  precio: number
  precioDolar?: number
  trabajadores: number | null
  proyectos: number | null
  cotizacionesMes: number | null
  modulo_ai: boolean
  envPriceId: string | null
  stripeProductId: string | null
  // DB fields applied on checkout.session.completed / invoice.paid
  db: {
    suscripcion_tier: Tier
    suscripcion_activa: boolean
    limite_trabajadores: number
    limite_proyectos: number
    limite_cotizaciones_mes: number
    modulo_asistencias: boolean
    modulo_horas_extra: boolean
    modulo_conceptos_adicionales: boolean
    modulo_plantillas: boolean
    modulo_export_pdf: boolean
    modulo_multi_modalidad: boolean
  }
}

const UNLIMITED = 999999

export const PLANES: Record<string, PlanConfig> = {
  basico: {
    tier: 'basico',
    nombre: 'Basico',
    precio: 99,
    trabajadores: 10,
    proyectos: 3,
    cotizacionesMes: 50,
    modulo_ai: false,
    envPriceId: 'STRIPE_BASICO_PRICE_ID',
    stripeProductId: 'prod_USSqMd221cC4iz',
    db: {
      suscripcion_tier: 'basico',
      suscripcion_activa: true,
      limite_trabajadores: 10,
      limite_proyectos: 3,
      limite_cotizaciones_mes: 50,
      modulo_asistencias: true,
      modulo_horas_extra: true,
      modulo_conceptos_adicionales: true,
      modulo_plantillas: true,
      modulo_export_pdf: true,
      modulo_multi_modalidad: true,
    },
  },
  pro: {
    tier: 'pro',
    nombre: 'Constructor Pro',
    precio: 299,
    trabajadores: 80,
    proyectos: 20,
    cotizacionesMes: null,
    modulo_ai: false,
    envPriceId: 'STRIPE_PRO_PRICE_ID',
    stripeProductId: 'prod_UMe4YiIu3YB3oX',
    db: {
      suscripcion_tier: 'pro',
      suscripcion_activa: true,
      limite_trabajadores: 80,
      limite_proyectos: 20,
      limite_cotizaciones_mes: UNLIMITED,
      modulo_asistencias: true,
      modulo_horas_extra: true,
      modulo_conceptos_adicionales: true,
      modulo_plantillas: true,
      modulo_export_pdf: true,
      modulo_multi_modalidad: true,
    },
  },
  premium: {
    tier: 'premium',
    nombre: 'Maestro Premium',
    precio: 599,
    trabajadores: null,
    proyectos: null,
    cotizacionesMes: null,
    modulo_ai: true,
    envPriceId: 'STRIPE_PREMIUM_PRICE_ID',
    stripeProductId: 'prod_USSrSU022pGlii',
    db: {
      suscripcion_tier: 'premium',
      suscripcion_activa: true,
      limite_trabajadores: UNLIMITED,
      limite_proyectos: UNLIMITED,
      limite_cotizaciones_mes: UNLIMITED,
      modulo_asistencias: true,
      modulo_horas_extra: true,
      modulo_conceptos_adicionales: true,
      modulo_plantillas: true,
      modulo_export_pdf: true,
      modulo_multi_modalidad: true,
    },
  },
}

export const GRATUITO_DB = {
  suscripcion_tier: 'gratuito' as Tier,
  suscripcion_activa: false,
  limite_trabajadores: 5,
  limite_proyectos: 1,
  limite_cotizaciones_mes: 10,
  modulo_asistencias: false,
  modulo_horas_extra: false,
  modulo_conceptos_adicionales: false,
  modulo_plantillas: false,
  modulo_export_pdf: false,
  modulo_multi_modalidad: false,
}

// Returns the plan config for a given tier (pyme maps to pro for legacy)
export function getPlanByTier(tier: string): PlanConfig | null {
  if (tier === 'pyme') return PLANES.pro
  return PLANES[tier] ?? null
}

export function isPaidTier(tier: string): boolean {
  return ['basico', 'pro', 'premium', 'pyme'].includes(tier)
}

export function formatLimit(val: number | null): string {
  if (val === null) return 'Ilimitados'
  return String(val)
}
