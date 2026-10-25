import { createClient } from '@/lib/supabase/server'
import { formatMXN, padNomina } from '@/lib/utils'
import DashboardUI from '@/components/dashboard/DashboardUI'
import { getCurrentUser, getEmpresaContext } from '@/lib/auth/empresa-context'

export default async function DashboardPage() {
  const user = await getCurrentUser()
  if (!user) return null
  const ctx = await getEmpresaContext()
  if (!ctx) return null
  const eid = ctx.empresaId
  const rol = ctx.rol ?? 'owner'

  const supabase = await createClient()

  const now = new Date()
  const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10)
  const lastOfMonth  = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().slice(0, 10)
  const twelveMonthsAgo = new Date(now.getFullYear() - 1, now.getMonth(), 1).toISOString().slice(0, 10)
  const firstOfPrevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString().slice(0, 10)
  const lastOfPrevMonth  = new Date(now.getFullYear(), now.getMonth(), 0).toISOString().slice(0, 10)

  const [
    { count: totalTrab },
    { count: totalProyectos },
    { data: nominasRecientes },
    { data: nominasGrafica },
    { count: anticiposPendientesCount },
    { data: nominasMes },
    { data: nominasMesPrevio },
    { data: proyectosActivos },
    { data: anticiposPendientes },
  ] = await Promise.all([
    supabase.from('trabajadores').select('*', { count: 'exact', head: true }).eq('empresa_id', eid).eq('activo', true),
    supabase.from('proyectos').select('*', { count: 'exact', head: true }).eq('empresa_id', eid).eq('activo', true),
    supabase.from('periodos_nomina').select('*, proyectos(nombre)').eq('empresa_id', eid).order('created_at', { ascending: false }).limit(5),
    supabase.from('periodos_nomina').select('total_nomina, fecha_inicio, fecha_fin, estado').eq('empresa_id', eid).gte('fecha_inicio', twelveMonthsAgo).order('fecha_inicio'),
    supabase.from('anticipos').select('*', { count: 'exact', head: true }).eq('empresa_id', eid).in('estado', ['pendiente', 'aprobado']),
    supabase.from('periodos_nomina').select('total_nomina').eq('empresa_id', eid).gte('fecha_inicio', firstOfMonth).lte('fecha_inicio', lastOfMonth),
    supabase.from('periodos_nomina').select('total_nomina').eq('empresa_id', eid).gte('fecha_inicio', firstOfPrevMonth).lte('fecha_inicio', lastOfPrevMonth),
    supabase.from('proyectos').select('id, nombre, color_etiqueta').eq('empresa_id', eid).eq('activo', true).order('created_at', { ascending: false }).limit(6),
    supabase.from('anticipos').select('id, monto, estado, trabajadores(nombre)').eq('empresa_id', eid).in('estado', ['pendiente', 'aprobado']).order('created_at', { ascending: false }).limit(5),
  ])

  const totalMes = nominasMes?.reduce((s, n) => s + (n.total_nomina || 0), 0) || 0
  const totalMesPrevio = nominasMesPrevio?.reduce((s, n) => s + (n.total_nomina || 0), 0) || 0

  // Resolve user display name from auth metadata
  const userName: string =
    (user.user_metadata?.full_name as string | undefined) ||
    (user.user_metadata?.name as string | undefined) ||
    user.email?.split('@')[0] ||
    'equipo'

  return (
    <DashboardUI
      userName={userName}
      rol={rol}
      totalTrab={totalTrab || 0}
      totalProyectos={totalProyectos || 0}
      totalMes={totalMes}
      totalMesPrevio={totalMesPrevio}
      anticiposPendientesCount={anticiposPendientesCount || 0}
      nominasRecientes={nominasRecientes || []}
      nominasGrafica={nominasGrafica || []}
      proyectosActivos={proyectosActivos || []}
      anticiposPendientes={(anticiposPendientes || []) as unknown as { id: string; monto: number; estado: string; trabajadores: { nombre: string } | null }[]}
    />
  )
}
