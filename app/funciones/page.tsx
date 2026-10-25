'use client'
import Link from 'next/link'
import { ArrowLeft, CheckCircle2, Clock, Sparkles, FileSpreadsheet, ShieldAlert, Cpu } from 'lucide-react'
import BuildingAnimation from '@/components/ui/BuildingAnimation'

const FEATURES = [
  {
    icon: Clock,
    title: 'Control de Asistencias Inteligente',
    desc: 'Registra horas trabajadas, faltas y retardos por obra de forma visual y rápida. Compatible con importaciones masivas de Excel y mapeo inteligente asistido por IA.',
  },
  {
    icon: Sparkles,
    title: 'Cálculo de Nómina en 1 Clic',
    desc: 'Motor de nóminas automatizado que interpreta asistencia, horas extra dobles/triples y modalidad de pago (por día, por hora, mixto o sueldo fijo) con total idempotencia.',
  },
  {
    icon: Cpu,
    title: 'Cuantificaciones con IA (Premium)',
    desc: 'Describe elementos de obra en lenguaje natural y deja que nuestra IA calcule m², m³, ml y agregue los conceptos directamente a tu cotización de manera precisa.',
  },
  {
    icon: FileSpreadsheet,
    title: 'Exportación Avanzada (PDF/Excel)',
    desc: 'Genera hojas de firmas en PDF, reportes analíticos de costos en XLSX y resúmenes directos para compartir a través de WhatsApp a tus encargados en obra.',
  },
  {
    icon: ShieldAlert,
    title: 'Descuento de Anticipos y Préstamos',
    desc: 'Vinculación automática de anticipos aprobados para que se descuenten exactamente en la nómina del proyecto correspondiente sin errores de cálculo manual.',
  },
]

export default function FuncionesPage() {
  return (
    <div className="min-h-screen text-stone-200 py-16 px-4 sm:px-6 relative overflow-hidden" style={{ background: '#050507' }}>
      {/* Background blueprint grid lines */}
      <div 
        className="absolute inset-0 opacity-10 pointer-events-none"
        style={{
          backgroundImage: 'linear-gradient(to right, rgba(6, 182, 212, 0.1) 1px, transparent 1px), linear-gradient(to bottom, rgba(6, 182, 212, 0.1) 1px, transparent 1px)',
          backgroundSize: '32px 32px',
        }}
      />

      <div className="max-w-6xl mx-auto relative z-10">
        {/* Navigation Header */}
        <div className="mb-12">
          <Link 
            href="/" 
            className="inline-flex items-center gap-2 text-xs font-semibold text-cyan-400 hover:text-cyan-300 transition-colors uppercase tracking-wider"
          >
            <ArrowLeft className="w-4 h-4" /> Volver al Inicio
          </Link>
        </div>

        {/* Main Content Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center mb-20">
          <div className="lg:col-span-7 space-y-6">
            <div className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-widest px-3 py-1 rounded-full border border-cyan-500/20" style={{ background: 'rgba(6,182,212,0.06)', color: '#06b6d4' }}>
              <Sparkles className="w-3.5 h-3.5" />
              Características del Sistema
            </div>
            <h1 className="font-display text-4xl sm:text-5xl font-extrabold tracking-tight text-white leading-tight">
              Diseñado para el control de <span className="text-cyan-400">obras y constructoras</span>
            </h1>
            <p className="text-lg text-stone-400 leading-relaxed max-w-2xl">
              Nomiextra unifica el control de asistencias del personal en campo con un motor de cálculo potente, preciso e intuitivo. Diseñado bajo estándares técnicos para evitar fugas financieras en tus proyectos.
            </p>
          </div>
          <div className="lg:col-span-5 flex justify-center">
            <BuildingAnimation />
          </div>
        </div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {FEATURES.map((feat, index) => (
            <div 
              key={index} 
              className="rounded-2xl border p-6 space-y-4 hover:shadow-lg transition-all duration-500 hover:-translate-y-1"
              style={{ 
                background: '#0b0c10', 
                borderColor: 'rgba(6, 182, 212, 0.08)',
                boxShadow: 'inset 0 0 20px rgba(6,182,212,0.02)'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = 'rgba(6, 182, 212, 0.2)'
                e.currentTarget.style.boxShadow = '0 10px 30px -15px rgba(6,182,212,0.1), inset 0 0 20px rgba(6,182,212,0.05)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = 'rgba(6, 182, 212, 0.08)'
                e.currentTarget.style.boxShadow = 'inset 0 0 20px rgba(6,182,212,0.02)'
              }}
            >
              <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'rgba(6,182,212,0.06)' }}>
                <feat.icon className="w-5 h-5 text-cyan-400" />
              </div>
              <h3 className="font-semibold text-lg text-white">{feat.title}</h3>
              <p className="text-sm text-stone-400 leading-relaxed">{feat.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
