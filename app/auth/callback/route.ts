import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import type { EmailOtpType } from '@supabase/supabase-js'
import { sendEmail } from '@/lib/email/resend'
import { buildWelcomeEmail } from '@/lib/email/welcome-template'

export async function GET(request: Request) {
  const url = new URL(request.url)
  const code       = url.searchParams.get('code')
  const token_hash = url.searchParams.get('token_hash')
  const type       = url.searchParams.get('type') as EmailOtpType | null
  const rawNext    = url.searchParams.get('next') ?? '/dashboard'

  // Block open-redirect: only allow relative paths within this origin
  const safeNext = rawNext.startsWith('/') && !rawNext.startsWith('//') ? rawNext : '/dashboard'

  const supabase = await createClient()

  // PKCE OAuth / magic-link code exchange
  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) return NextResponse.redirect(new URL(safeNext, url.origin))
  }

  // Email OTP via token_hash — used when Supabase email templates are configured
  // to link directly to this app ({{ .SiteURL }}/auth/callback?token_hash=…)
  // instead of routing through supabase.co/auth/v1/verify first.
  if (token_hash && type) {
    const { data, error } = await supabase.auth.verifyOtp({ token_hash, type })
    if (!error) {
      if (type === 'signup' && data.user?.email) {
        const name = data.user.user_metadata?.full_name as string | undefined
        sendEmail({
          to: data.user.email,
          subject: 'Bienvenido a NomiExtra 🏗️',
          html: buildWelcomeEmail(name),
        }).catch(() => {})
      }
      return NextResponse.redirect(new URL(safeNext, url.origin))
    }
  }

  return NextResponse.redirect(new URL('/auth/login?error=link_invalido', url.origin))
}
