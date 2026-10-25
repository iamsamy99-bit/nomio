import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll() },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  // Server-side capataz enforcement: only queries DB when path is not in capataz-allowed list.
  if (user && request.nextUrl.pathname.startsWith('/dashboard')) {
    const p = request.nextUrl.pathname
    const capatazAllowed =
      p === '/dashboard' ||
      ['/dashboard/asistencias', '/dashboard/perfil', '/dashboard/proyectos'].some(
        prefix => p === prefix || p.startsWith(`${prefix}/`)
      )
    if (!capatazAllowed) {
      const { data: eu } = await supabase
        .from('empresa_users')
        .select('rol')
        .eq('user_id', user.id)
        .eq('activo', true)
        .single()
      if (eu?.rol === 'capataz') {
        const url = request.nextUrl.clone()
        url.pathname = '/dashboard/asistencias'
        return NextResponse.redirect(url)
      }
    }
  }

  const publicPaths = [
    '/',
    '/nomiextra-ai',
    '/auth/login',
    '/auth/register',
    '/auth/callback',
    '/auth/reset',
    '/api/stripe/webhook',
    '/api/health',
    '/api/alerts/telegram',
    '/terminos',
    '/politica-privacidad',
    '/onboarding'
  ]
  const isPublic = publicPaths.some(p => {
    if (p === '/') {
      return request.nextUrl.pathname === '/'
    }
    return request.nextUrl.pathname.startsWith(p)
  })

  if (!user && !isPublic) {
    const url = request.nextUrl.clone()
    url.pathname = '/auth/login'
    return NextResponse.redirect(url)
  }

  if (user && (request.nextUrl.pathname === '/auth/login' || request.nextUrl.pathname === '/auth/register')) {
    const url = request.nextUrl.clone()
    url.pathname = '/dashboard'
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}
