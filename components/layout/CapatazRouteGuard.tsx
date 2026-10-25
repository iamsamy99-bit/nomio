'use client'

import { useEffect } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { canAccessDashboardPath } from '@/lib/permissions'
import type { RolUsuario } from '@/types'

export default function CapatazRouteGuard({ rol, children }: { rol: RolUsuario; children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()

  useEffect(() => {
    if (!pathname || canAccessDashboardPath(pathname, rol)) return
    router.replace(rol === 'admin' ? '/dashboard' : '/dashboard/asistencias')
  }, [pathname, rol, router])

  return <>{children}</>
}
