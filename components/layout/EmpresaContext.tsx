'use client'

import { createContext, useContext } from 'react'
import type { Empresa, RolUsuario } from '@/types'

export interface EmpresaContextValue {
  userId: string
  userEmail: string
  userName: string
  empresaUserId: string
  empresaId: string
  rol: RolUsuario
  empresa: Empresa
}

// Populated once by the dashboard layout (server) and shared with every client
// page below it, so pages no longer repeat getUser() + empresa_users on mount.
const EmpresaCtx = createContext<EmpresaContextValue | null>(null)

export function EmpresaProvider({ value, children }: { value: EmpresaContextValue; children: React.ReactNode }) {
  return <EmpresaCtx.Provider value={value}>{children}</EmpresaCtx.Provider>
}

// Throws if used outside the dashboard layout, which is the only place that can
// guarantee an authenticated empresa context exists.
export function useEmpresa(): EmpresaContextValue {
  const ctx = useContext(EmpresaCtx)
  if (!ctx) throw new Error('useEmpresa must be used within EmpresaProvider (dashboard layout)')
  return ctx
}
