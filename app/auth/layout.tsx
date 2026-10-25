// Auth pages create the Supabase browser client during render, which requires
// NEXT_PUBLIC_SUPABASE_* at build time when statically prerendered. Forcing the
// whole /auth segment to render dynamically keeps the build from depending on
// those env vars at prerender — a missing var previously failed a preview build
// on /auth/register instead of just degrading at runtime.
export const dynamic = 'force-dynamic'

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return children
}
