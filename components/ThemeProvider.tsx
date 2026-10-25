'use client'

// Dark mode removed — app is light-only.
export default function ThemeProvider({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}

export function toggleTheme() {
  // no-op
}
