import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { bustEmpresaContext } from '@/lib/auth/empresa-context'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// Busts the caller's cached empresa context after they change empresa config
// (perfil toggles, name, logo). Other members self-heal via the 180s TTL.
export async function POST() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  await bustEmpresaContext(user.id)
  return NextResponse.json({ ok: true })
}
