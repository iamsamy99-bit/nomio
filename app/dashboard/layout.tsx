import { redirect } from 'next/navigation'
import DashboardShell from '@/components/layout/DashboardShell'
import TourOverlay from '@/components/layout/TourOverlay'
import CapatazRouteGuard from '@/components/layout/CapatazRouteGuard'
import OfflineBanner from '@/components/ui/OfflineBanner'
import { EmpresaProvider } from '@/components/layout/EmpresaContext'
import { getCurrentUser, getEmpresaContext } from '@/lib/auth/empresa-context'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser()
  if (!user) redirect('/auth/login')

  const ctx = await getEmpresaContext()
  if (!ctx) redirect('/onboarding')

  const { rol, empresaId, empresa, tourCompletado } = ctx
  const userName =
    (user.user_metadata?.full_name as string | undefined) ||
    (user.user_metadata?.name as string | undefined) ||
    user.email?.split('@')[0] ||
    ''

  return (
    <>
      <OfflineBanner />
      <EmpresaProvider value={{ userId: user.id, userEmail: user.email || '', userName, empresaUserId: ctx.empresaUserId, empresaId, rol, empresa }}>
        <DashboardShell empresa={empresa as unknown as Record<string, unknown>} userEmail={user.email || ''} rol={rol}>
          <CapatazRouteGuard rol={rol}>{children}</CapatazRouteGuard>
        </DashboardShell>
      </EmpresaProvider>
      {!tourCompletado && rol !== 'capataz' && <TourOverlay userId={user.id} />}
    </>
  )
}
