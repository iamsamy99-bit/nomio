'use client'
import { useState, useEffect, useRef, useCallback } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import {
  LayoutDashboard, Users, FolderOpen, ClipboardList,
  CalendarDays, CreditCard, Receipt, LogOut, Menu, X, ChevronDown,
  Wallet, UserCircle, Building2, Bell, Search, BookUser,
  Camera, Pencil, Check, AlertCircle, Shield,
} from 'lucide-react'
import { LukaIcon } from '@/components/brand/LukaIcon'
import type { Empresa, RolUsuario } from '@/types'
import { filterNavForRole } from '@/lib/permissions'
import RemindersBell from '@/components/recordatorios/RemindersBell'
import CuantificarFAB from '@/components/cuantificar/CuantificarFAB'
import AsistenteVozLauncher, { abrirAsistenteVoz, ASISTENTE_VOZ_OPENED, ASISTENTE_VOZ_CLOSED } from '@/components/asistente/AsistenteVozLauncher'
import { motion } from 'framer-motion'
import { toast } from 'sonner'
import { NomioIcon } from '@/components/brand/NomioLogo'

// Resize image to maxPx on longest side, output as JPEG blob
function resizeImage(file: File, maxPx = 256): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new window.Image()
    const url = URL.createObjectURL(file)
    img.onload = () => {
      URL.revokeObjectURL(url)
      const { width, height } = img
      const ratio = Math.min(maxPx / width, maxPx / height, 1)
      const w = Math.round(width * ratio)
      const h = Math.round(height * ratio)
      const canvas = document.createElement('canvas')
      canvas.width = w
      canvas.height = h
      const ctx = canvas.getContext('2d')
      if (!ctx) { reject(new Error('canvas')); return }
      ctx.drawImage(img, 0, 0, w, h)
      canvas.toBlob(blob => {
        if (blob) resolve(blob)
        else reject(new Error('toBlob'))
      }, 'image/jpeg', 0.88)
    }
    img.onerror = reject
    img.src = url
  })
}

type SearchResult = {
  id: string
  label: string
  sublabel?: string
  href: string
  group: 'Trabajadores' | 'Proyectos' | 'Cotizaciones'
}

function escapeIlike(raw: string): string {
  return raw.replace(/[%_\\]/g, c => `\\${c}`)
}

const allNavItems = [
  { href: '/dashboard',              icon: LayoutDashboard, label: 'Inicio',      exact: true },
  { href: '/dashboard/recordatorios', icon: Bell,           label: 'Recordatorios'        },
  { href: '/dashboard/proyectos',    icon: FolderOpen,      label: 'Proyectos'            },
  { href: '/dashboard/asistencias',  icon: CalendarDays,    label: 'Asistencias'          },
  { href: '/dashboard/nomina',       icon: ClipboardList,   label: 'Nóminas'              },
  { href: '/dashboard/anticipos',    icon: Wallet,          label: 'Anticipos'            },
  { href: '/dashboard/trabajadores', icon: Users,           label: 'Trabajadores'         },
  { href: '/dashboard/contactos',    icon: BookUser,        label: 'Red de obra'          },
  { href: '/dashboard/cotizaciones', icon: Receipt,         label: 'Cotizaciones'         },
  { href: '/dashboard/auditoria',    icon: Shield,          label: 'Auditoría'            },
]

interface Props {
  empresa: Record<string, unknown>
  userEmail: string
  rol?: RolUsuario
  children: React.ReactNode
}

export default function DashboardShell({ empresa, userEmail, rol = 'operador', children }: Props) {
  const navItems = filterNavForRole(allNavItems, rol)
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()
  const emp = empresa as unknown as Empresa

  // Sidebar / mobile
  const [sidebarOpen, setSidebarOpen] = useState(false)

  // Search
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<SearchResult[]>([])
  const [searchLoading, setSearchLoading] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const searchRef = useRef<HTMLDivElement>(null)
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Profile popup (top-right)
  const [profileOpen, setProfileOpen] = useState(false)
  const [asistenteActivo, setAsistenteActivo] = useState(false)

  useEffect(() => {
    const onOpen = () => setAsistenteActivo(true)
    const onClose = () => setAsistenteActivo(false)
    window.addEventListener(ASISTENTE_VOZ_OPENED, onOpen)
    window.addEventListener(ASISTENTE_VOZ_CLOSED, onClose)
    return () => {
      window.removeEventListener(ASISTENTE_VOZ_OPENED, onOpen)
      window.removeEventListener(ASISTENTE_VOZ_CLOSED, onClose)
    }
  }, [])
  const profileRef = useRef<HTMLDivElement>(null)

  // Company name edit
  const [empresaNombre, setEmpresaNombre] = useState(emp.nombre ?? '')
  const [editingNombre, setEditingNombre] = useState(false)
  const [nombreInput, setNombreInput] = useState(emp.nombre ?? '')
  const [savingNombre, setSavingNombre] = useState(false)
  const [nombreError, setNombreError] = useState('')

  // Logo
  const [logoUrl, setLogoUrl] = useState(emp.logo_url ?? '')
  const [uploading, setUploading] = useState(false)
  const [logoError, setLogoError] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Close search on outside click
  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) setSearchOpen(false)
    }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])

  // Close profile popup on outside click
  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) setProfileOpen(false)
    }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])

  // Close both on route change
  useEffect(() => {
    setSearchOpen(false)
    setSearchQuery('')
    setProfileOpen(false)
  }, [pathname])

  // Cmd+K / Ctrl+K opens global search
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setSearchOpen(true)
        setTimeout(() => {
          const input = searchRef.current?.querySelector('input')
          input?.focus()
        }, 0)
      }
      if (e.key === 'Escape') {
        setSearchOpen(false)
        setSearchQuery('')
      }
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [])

  // Search logic
  const runSearch = useCallback(async (raw: string) => {
    const q = raw.trim().slice(0, 100)
    if (q.length < 2) { setSearchResults([]); setSearchLoading(false); return }
    const empresaId = emp.id
    if (!empresaId) { setSearchLoading(false); return }
    const safe = escapeIlike(q)
    setSearchLoading(true)
    const [{ data: trabajadores }, { data: proyectos }, { data: cotizaciones }] = await Promise.all([
      supabase.from('trabajadores').select('id, nombre, puesto').eq('empresa_id', empresaId).ilike('nombre', `%${safe}%`).eq('activo', true).limit(4),
      supabase.from('proyectos').select('id, nombre, encargado').eq('empresa_id', empresaId).ilike('nombre', `%${safe}%`).limit(4),
      supabase.from('cotizaciones').select('id, titulo, cliente_nombre, numero_cotizacion').eq('empresa_id', empresaId).or(`titulo.ilike.%${safe}%,cliente_nombre.ilike.%${safe}%`).limit(3),
    ])
    setSearchResults([
      ...(trabajadores ?? []).map(t => ({ id: t.id, label: t.nombre, sublabel: t.puesto ?? undefined, href: `/dashboard/trabajadores/${t.id}`, group: 'Trabajadores' as const })),
      ...(proyectos ?? []).map(p => ({ id: p.id, label: p.nombre, sublabel: p.encargado ?? undefined, href: `/dashboard/proyectos/${p.id}`, group: 'Proyectos' as const })),
      ...(cotizaciones ?? []).map(c => ({ id: c.id, label: c.titulo, sublabel: `${c.cliente_nombre} · #COT-${String(c.numero_cotizacion).padStart(4, '0')}`, href: `/dashboard/cotizaciones/${c.id}`, group: 'Cotizaciones' as const })),
    ])
    setSearchLoading(false)
  }, [supabase, emp.id])

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value
    setSearchQuery(val)
    setSearchOpen(true)
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current)
    if (val.trim().length < 2) { setSearchResults([]); return }
    searchTimerRef.current = setTimeout(() => runSearch(val), 300)
  }

  const handleResultClick = (href: string) => {
    setSearchOpen(false)
    setSearchQuery('')
    router.push(href)
  }

  // Save company name
  const handleSaveNombre = async () => {
    const trimmed = nombreInput.trim().slice(0, 80)
    if (!trimmed) { setNombreError('El nombre no puede estar vacío'); return }
    setSavingNombre(true)
    setNombreError('')
    const { error } = await supabase.from('empresas').update({ nombre: trimmed }).eq('id', emp.id)
    if (error) {
      setNombreError('Error al guardar. Intenta de nuevo.')
      toast.error('No se pudo guardar el nombre')
    } else {
      setEmpresaNombre(trimmed)
      setEditingNombre(false)
      toast.success('Nombre actualizado')
      fetch('/api/cache/bust-empresa', { method: 'POST' }).catch(() => {})
    }
    setSavingNombre(false)
  }

  // Upload logo
  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!['image/jpeg', 'image/png', 'image/webp', 'image/gif'].includes(file.type)) {
      setLogoError('Formato no válido. Usa JPG, PNG o WebP')
      return
    }
    setUploading(true)
    setLogoError('')

    // Resize to 256x256 max before uploading
    let blob: Blob
    try {
      blob = await resizeImage(file, 256)
    } catch {
      setLogoError('No se pudo procesar la imagen. Intenta con otro archivo.')
      setUploading(false)
      return
    }

    const path = `${emp.id}/logo.jpg`
    const { error: uploadErr } = await supabase.storage
      .from('empresa-logos')
      .upload(path, blob, { upsert: true, contentType: 'image/jpeg' })

    if (uploadErr) {
      setLogoError('Error al subir la imagen. Intenta de nuevo.')
      setUploading(false)
      return
    }

    const { data: urlData } = supabase.storage.from('empresa-logos').getPublicUrl(path)
    // Add cache-buster only for local state so browser re-fetches; store clean URL in DB
    const cleanUrl = urlData.publicUrl
    const displayUrl = `${cleanUrl}?v=${Date.now()}`

    const { error: dbErr } = await supabase.from('empresas').update({ logo_url: cleanUrl }).eq('id', emp.id)
    if (dbErr) {
      setLogoError('Imagen subida pero no se pudo guardar la referencia.')
      setUploading(false)
      return
    }

    setLogoUrl(displayUrl)
    setUploading(false)
    toast.success('Logo actualizado')
    fetch('/api/cache/bust-empresa', { method: 'POST' }).catch(() => {})
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    window.location.href = '/auth/login'
  }

  const isActive = (href: string, exact?: boolean) =>
    exact ? pathname === href : pathname.startsWith(href)

  const tierLabel = () => {
    if (emp.suscripcion_tier === 'premium') return 'Maestro Premium'
    if (emp.suscripcion_tier === 'pro' || emp.suscripcion_tier === 'pyme') return 'Constructor Pro'
    if (emp.suscripcion_tier === 'basico') return 'Básico'
    return 'Gratuito'
  }

  const tierColor = () => {
    if (emp.suscripcion_tier === 'premium') return 'text-amber-400 bg-amber-400/10 border-amber-400/20'
    if (emp.suscripcion_tier === 'pro' || emp.suscripcion_tier === 'pyme') return 'text-[#6FA4CC] bg-[#1B6CA8]/20 border-[#1B6CA8]/30'
    if (emp.suscripcion_tier === 'basico') return 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20'
    return 'text-white/50 bg-white/5 border-white/15'
  }

  const tierColorPopup = () => {
    if (emp.suscripcion_tier === 'premium') return 'text-amber-600 bg-amber-50 border-amber-200'
    if (emp.suscripcion_tier === 'pro' || emp.suscripcion_tier === 'pyme') return 'text-[#1B6CA8] bg-[#1B6CA8]/8 border-[#1B6CA8]/20'
    if (emp.suscripcion_tier === 'basico') return 'text-emerald-600 bg-emerald-50 border-emerald-200'
    return 'text-slate-500 bg-slate-100 border-slate-200'
  }

  const NavLink = ({ item }: { item: typeof navItems[0] }) => {
    const active = isActive(item.href, (item as { exact?: boolean }).exact)
    return (
      <Link
        href={item.href}
        onClick={() => setSidebarOpen(false)}
        className="relative flex items-center gap-3 py-2.5 px-3 rounded-xl text-sm font-medium transition-all duration-150 group cursor-pointer"
        style={active ? {
          background: 'rgba(255,254,251,0.08)',
          color: '#FAF6EF',
          borderLeft: '2px solid #556B45',
          paddingLeft: '10px',
        } : {
          color: 'rgba(255,255,255,0.72)',
        }}
      >
        {/* Hover bg for inactive items */}
        {!active && (
          <span
            className="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-150"
            style={{ background: 'rgba(255,255,255,0.06)' }}
          />
        )}
        <item.icon
          className="w-4 h-4 shrink-0 relative z-10 transition-colors"
          style={{ color: active ? '#A8B5A0' : 'rgba(255,254,251,0.45)' }}
        />
        <span className="relative z-10 truncate" style={{ color: active ? '#FAF6EF' : 'rgba(255,254,251,0.72)' }}>
          {item.label}
        </span>
        {active && (
          <span className="ml-auto w-1.5 h-1.5 rounded-full bg-[#556B45] shrink-0 relative z-10" />
        )}
      </Link>
    )
  }

  // Avatar shown in sidebar company section and topbar
  const LogoAvatar = ({ size = 28, ring = false }: { size?: number; ring?: boolean }) => (
    logoUrl
      // eslint-disable-next-line @next/next/no-img-element
      ? <img src={logoUrl} alt="Logo empresa"
          className={`rounded-lg object-cover shrink-0 ${ring ? 'ring-2 ring-white/20' : ''}`}
          style={{ width: size, height: size }} />
      : <div className={`rounded-lg shrink-0 overflow-hidden ${ring ? 'ring-2 ring-white/20' : ''}`}
          style={{ width: size, height: size }}>
          <NomioIcon size={size} />
        </div>
  )

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Brand header */}
      <div className="px-5 py-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <Link href="/dashboard" aria-label="Nomiextra — panel de control" className="flex items-center gap-3 group">
          <div style={{ boxShadow: '0 0 12px rgba(85,107,69,0.35)', borderRadius: 12, overflow: 'hidden', flexShrink: 0 }}>
            <NomioIcon size={36} />
          </div>
          <div className="min-w-0">
            <p
              className="font-bold text-sm leading-none"
              style={{ fontFamily: "'Fraunces', serif", color: 'var(--cuero-50)', letterSpacing: '-0.01em' }}
            >
              NOMIEXTRA
            </p>
            <p className="text-[0.55rem] font-semibold tracking-[0.18em] uppercase mt-0.5" style={{ color: 'rgba(250,246,239,0.30)', fontFamily: "'JetBrains Mono', monospace" }}>
              SAAS DE OBRA
            </p>
          </div>
        </Link>
      </div>

      {/* Company pill */}
      <div className="px-3 py-3" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
        <div
          className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl"
          style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}
        >
          <LogoAvatar size={30} />
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold truncate" style={{ color: 'rgba(255,255,255,0.80)' }}>
              {empresaNombre}
            </p>
            <span className={`inline-flex items-center gap-1 text-[0.58rem] font-semibold border rounded-full px-1.5 py-0.5 mt-0.5 ${tierColor()}`}>
              <span className="w-1 h-1 rounded-full bg-current" />
              {tierLabel()}
            </span>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-3 space-y-0.5 overflow-y-auto scrollbar-none">
        <p
          className="text-[0.58rem] font-bold uppercase tracking-[0.24em] px-3 mb-2 mt-1"
          style={{ color: 'rgba(255,255,255,0.20)' }}
        >
          Menu principal
        </p>
        {navItems.map(item => <NavLink key={item.href} item={item} />)}
      </nav>

      {/* User footer */}
      <div className="px-3 py-3" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
        {/* User info row */}
        <div
          className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl mb-1"
          style={{ background: 'rgba(255,255,255,0.03)' }}
        >
          <div
            className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 text-xs font-bold"
            style={{ background: 'rgba(85,107,69,0.18)', color: '#A8B5A0', border: '1px solid rgba(85,107,69,0.28)' }}
          >
            {userEmail[0]?.toUpperCase() ?? 'U'}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-medium truncate" style={{ color: 'rgba(255,255,255,0.55)' }}>
              {userEmail}
            </p>
          </div>
        </div>

        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium transition-all duration-150 cursor-pointer group"
          style={{ color: 'rgba(248,113,113,0.70)' }}
        >
          <LogOut className="w-4 h-4 shrink-0 group-hover:text-red-400 transition-colors" />
          <span className="group-hover:text-red-400 transition-colors">Cerrar sesión</span>
        </button>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen flex" style={{ background: 'var(--bg)' }}>
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex flex-col w-[240px] sidebar-dark dark:bg-none dark:bg-gradient-to-b dark:from-[#0f1117] dark:to-[#1a1f2e] shrink-0 fixed h-full z-20">
        <SidebarContent />
      </aside>

      {/* Mobile Sidebar */}
      {sidebarOpen && (
        <div className="lg:hidden fixed inset-0 z-40 flex">
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setSidebarOpen(false)} />
          <aside className="relative w-72 sidebar-dark dark:bg-none dark:bg-gradient-to-b dark:from-[#0f1117] dark:to-[#1a1f2e] flex flex-col z-50">
            <button onClick={() => setSidebarOpen(false)} className="absolute top-4 right-4 p-1.5 rounded-lg hover:bg-surface/10">
              <X className="w-5 h-5 text-white/60" />
            </button>
            <SidebarContent />
          </aside>
        </div>
      )}

      {/* Main */}
      <div className="flex-1 lg:ml-[240px] flex flex-col min-h-screen min-w-0 w-full overflow-x-hidden">
        {/* Desktop topbar */}
        <header
          className="hidden lg:flex sticky top-0 z-30 items-center justify-between px-6 h-14"
          style={{
            background: '#1A2E37',
            borderBottom: '1px solid rgba(255,254,251,0.08)',
          }}
        >
          {/* Search */}
          <div ref={searchRef} className="relative flex-1 max-w-sm">
            <div
              className="flex items-center gap-2.5 px-3 py-2 rounded-xl transition-all duration-200"
              style={{
                background: 'rgba(255,254,251,0.07)',
                border: '1px solid rgba(255,254,251,0.10)',
              }}
            >
              <Search className="w-4 h-4 shrink-0" style={{ color: 'rgba(255,254,251,0.50)' }} />
              <input
                type="search" value={searchQuery} onChange={handleSearchChange}
                onKeyDown={e => e.key === 'Escape' && (setSearchOpen(false), setSearchQuery(''))}
                onFocus={() => searchQuery.trim().length >= 2 && setSearchOpen(true)}
                placeholder="Buscar proyecto, trabajador... (⌘K)"
                className="w-full text-sm bg-transparent outline-none"
                style={{ color: 'rgba(255,254,251,0.88)' }}
                autoComplete="off" maxLength={100}
              />
            </div>
            {searchOpen && (searchLoading || searchResults.length > 0 || searchQuery.trim().length >= 2) && (
              <div className="absolute top-full left-0 mt-2 rounded-xl shadow-2xl z-50 overflow-hidden border"
                style={{ minWidth: 320, background: 'var(--surface)', borderColor: 'var(--border-bright)' }}>
                {searchLoading ? (
                  <div className="px-4 py-3 text-sm" style={{ color: 'var(--text-muted)' }}>Buscando...</div>
                ) : searchResults.length === 0 ? (
                  <div className="px-4 py-3 text-sm" style={{ color: 'var(--text-muted)' }}>Sin resultados para &ldquo;{searchQuery}&rdquo;</div>
                ) : (
                  (['Trabajadores', 'Proyectos', 'Cotizaciones'] as const).map(group => {
                    const items = searchResults.filter(r => r.group === group)
                    if (!items.length) return null
                    return (
                      <div key={group}>
                        <p className="px-4 pt-2.5 pb-1 text-[0.65rem] font-semibold uppercase tracking-widest" style={{ color: 'var(--text-dim)' }}>{group}</p>
                        {items.map(result => (
                          <button key={result.id} onMouseDown={() => handleResultClick(result.href)}
                            className="w-full text-left px-4 py-2 transition-colors flex items-center gap-3 hover:bg-[var(--table-hover)]">
                            <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
                              style={{ background: 'var(--primary-glow)', border: '1px solid var(--border-bright)' }}>
                              <span className="text-xs font-bold" style={{ color: 'var(--primary)' }}>{result.label[0]?.toUpperCase()}</span>
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm font-medium truncate" style={{ color: 'var(--text)' }}>{result.label}</p>
                              {result.sublabel && <p className="text-xs truncate" style={{ color: 'var(--text-muted)' }}>{result.sublabel}</p>}
                            </div>
                          </button>
                        ))}
                      </div>
                    )
                  })
                )}
              </div>
            )}
          </div>

          {/* Right side */}
          <div className="flex items-center gap-2">
            <RemindersBell />

            {/* Profile trigger */}
            <div ref={profileRef} className="relative">
              <button
                onClick={() => setProfileOpen(v => !v)}
                className="flex items-center gap-2.5 pl-2.5 pr-3 py-1.5 rounded-xl transition-all duration-150 cursor-pointer"
                style={{
                  background: profileOpen ? 'rgba(255,254,251,0.10)' : 'transparent',
                  border: `1px solid ${profileOpen ? 'rgba(255,254,251,0.15)' : 'transparent'}`,
                }}
              >
                <div className="w-7 h-7 rounded-lg overflow-hidden shrink-0" style={{ boxShadow: '0 0 0 2px rgba(58,78,46,0.30)' }}>
                  <LogoAvatar size={28} />
                </div>
                <div className="hidden xl:block text-left">
                  <p className="text-xs font-semibold leading-none" style={{ color: 'rgba(255,254,251,0.88)' }}>
                    {empresaNombre}
                  </p>
                  <p className="text-[0.60rem] mt-0.5" style={{ color: 'rgba(255,254,251,0.50)' }}>{tierLabel()}</p>
                </div>
                <ChevronDown
                  className="w-3.5 h-3.5 transition-transform duration-200"
                  style={{ color: 'rgba(255,254,251,0.45)', transform: profileOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}
                />
              </button>

              {/* Floating profile popup */}
              {profileOpen && (
                <div className="absolute top-full right-0 mt-2 w-80 rounded-2xl shadow-2xl z-50 overflow-hidden border"
                  style={{ background: 'var(--surface)', borderColor: 'var(--border)', boxShadow: '0 8px 32px rgba(0,0,0,0.10), 0 2px 8px rgba(0,0,0,0.06)' }}>

                  {/* Header with logo + name */}
                  <div className="px-5 pt-5 pb-4 border-b" style={{ borderColor: 'var(--divider)' }}>
                    <div className="flex items-start gap-4">
                      {/* Logo upload */}
                      <div className="relative shrink-0">
                        <div className="w-14 h-14 rounded-xl overflow-hidden border-2" style={{ borderColor: 'var(--border-bright)' }}>
                          {logoUrl
                            // eslint-disable-next-line @next/next/no-img-element
                            ? <img src={logoUrl} alt="Logo" className="w-full h-full object-cover" />
                            : <div className="w-full h-full bg-[#1B6CA8]/20 flex items-center justify-center">
                                <span className="text-xl font-bold text-[#6FA4CC]">{empresaNombre[0]?.toUpperCase() ?? 'E'}</span>
                              </div>
                          }
                        </div>
                        <button
                          onClick={() => fileInputRef.current?.click()}
                          disabled={uploading}
                          className="absolute -bottom-1.5 -right-1.5 w-6 h-6 rounded-full bg-[#1B6CA8] flex items-center justify-center shadow-md hover:bg-[#1558A0] transition-colors"
                          title="Cambiar logo">
                          {uploading
                            ? <div className="w-3 h-3 border border-white/40 border-t-white rounded-full animate-spin" />
                            : <Camera className="w-3 h-3 text-white" />
                          }
                        </button>
                        <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif"
                          className="hidden" onChange={handleLogoUpload} />
                      </div>

                      {/* Name + email */}
                      <div className="flex-1 min-w-0">
                        {editingNombre ? (
                          <div className="flex items-center gap-1.5">
                            <input
                              value={nombreInput}
                              onChange={e => setNombreInput(e.target.value.slice(0, 80))}
                              onKeyDown={e => { if (e.key === 'Enter') handleSaveNombre(); if (e.key === 'Escape') { setEditingNombre(false); setNombreInput(empresaNombre) } }}
                              className="flex-1 text-sm font-semibold rounded-lg px-2 py-1 outline-none"
                              style={{ color: 'var(--text)', background: 'var(--surface-3)', border: '1px solid var(--border-bright)' }}
                              autoFocus
                              maxLength={80}
                            />
                            <button onClick={handleSaveNombre} disabled={savingNombre}
                              className="p-1.5 rounded-lg bg-[#1B6CA8] hover:bg-[#1558A0] transition-colors shrink-0">
                              {savingNombre
                                ? <div className="w-3 h-3 border border-white/40 border-t-white rounded-full animate-spin" />
                                : <Check className="w-3 h-3 text-white" />
                              }
                            </button>
                            <button onClick={() => { setEditingNombre(false); setNombreInput(empresaNombre) }}
                              className="p-1.5 rounded-lg hover:bg-[var(--surface-2)] transition-colors shrink-0">
                              <X className="w-3 h-3" style={{ color: 'var(--text-muted)' }} />
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1.5 group">
                            <p className="text-sm font-semibold truncate" style={{ color: 'var(--text)' }}>{empresaNombre}</p>
                            <button onClick={() => { setEditingNombre(true); setNombreInput(empresaNombre) }}
                              className="p-1 rounded-md opacity-0 group-hover:opacity-100 hover:bg-surface/10 transition-all shrink-0"
                              title="Editar nombre">
                              <Pencil className="w-3 h-3" style={{ color: 'var(--text-dim)' }} />
                            </button>
                          </div>
                        )}
                        <p className="text-xs mt-0.5 truncate" style={{ color: 'var(--text-muted)' }}>{userEmail}</p>
                        <span className={`inline-flex items-center gap-1 text-[0.62rem] font-semibold border rounded-full px-2 py-0.5 mt-1.5 ${tierColorPopup()}`}>
                          <span className="w-1.5 h-1.5 rounded-full bg-current" />
                          {tierLabel()}
                        </span>
                      </div>
                    </div>

                    {/* Error messages */}
                    {(logoError || nombreError) && (
                      <div className="mt-3 flex items-start gap-2 rounded-lg px-3 py-2 text-xs"
                        style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.20)', color: '#DC2626' }}>
                        <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                        <span>{logoError || nombreError}</span>
                      </div>
                    )}
                    <p className="text-[0.62rem] mt-2" style={{ color: 'var(--text-dim)' }}>
                      Haz hover sobre el nombre para editarlo. Logo: JPG, PNG o WebP, máx. 2 MB.
                    </p>
                  </div>

                  {/* Actions */}
                  <div className="py-1.5">
                    <Link href="/dashboard/perfil" onClick={() => setProfileOpen(false)}
                      className="flex items-center gap-3 px-5 py-2.5 text-sm hover:bg-[var(--table-hover)] transition-colors" style={{ color: 'var(--text-muted)' }}>
                      <UserCircle className="w-4 h-4" style={{ color: 'var(--text-dim)' }} />
                      Perfil y suscripción
                    </Link>
                    <Link href="/dashboard/planes" onClick={() => setProfileOpen(false)}
                      className="flex items-center gap-3 px-5 py-2.5 text-sm hover:bg-[var(--table-hover)] transition-colors" style={{ color: 'var(--text-muted)' }}>
                      <CreditCard className="w-4 h-4" style={{ color: 'var(--text-dim)' }} />
                      Mi plan
                    </Link>
                  </div>

                  <div className="border-t py-1.5" style={{ borderColor: 'var(--divider)' }}>
                    <button onClick={handleLogout}
                      className="w-full flex items-center gap-3 px-5 py-2.5 text-sm hover:bg-red-500/10 transition-colors" style={{ color: '#FCA5A5' }}>
                      <LogOut className="w-4 h-4" />
                      Cerrar sesión
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Mobile topbar */}
        <header className="lg:hidden sticky top-0 z-30 border-b px-4 h-14 flex items-center justify-between"
          style={{ background: '#1A2E37', borderColor: 'rgba(255,254,251,0.08)' }}>
          <button onClick={() => setSidebarOpen(true)} className="p-2 rounded-xl transition-colors" style={{ color: 'rgba(255,254,251,0.60)' }} aria-label="Abrir menú">
            <Menu className="w-5 h-5" />
          </button>
          <Link href="/dashboard" aria-label="Nomiextra — panel de control" className="flex items-center gap-2">
            <div style={{ borderRadius: 8, overflow: 'hidden', flexShrink: 0 }}>
              <NomioIcon size={28} />
            </div>
            <span className="font-bold text-sm tracking-widest" style={{ color: '#FAF6EF', fontFamily: 'var(--font-mono)' }}>NOMIEXTRA</span>
          </Link>
          <RemindersBell />
        </header>

        <main className="flex-1 p-4 sm:p-6 pb-24 lg:pb-6">
          {emp.suscripcion_tier === 'gratuito' && (
            <div className="tile-stone mb-5 px-4 py-3 flex items-center justify-between gap-3">
              <p className="text-sm text-ink">
                <strong>Plan Gratuito</strong> — 5 trabajadores, 1 proyecto, 10 cotizaciones/mes.
              </p>
              <Link href="/dashboard/planes" className="btn-accent shrink-0 text-xs py-1.5">Actualizar →</Link>
            </div>
          )}
          {children}
        </main>
      </div>

      <CuantificarFAB tier={emp.suscripcion_tier as string ?? 'gratuito'} />
      <AsistenteVozLauncher tier={emp.suscripcion_tier as string ?? 'gratuito'} />

      {/* Mobile bottom nav */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-30 flex items-end border-t overflow-visible"
        style={{ background: '#1A2E37', borderColor: 'rgba(255,254,251,0.08)', height: '64px' }}>

        {/* Left items: Inicio + Asistencias */}
        {[
          navItems.find(i => i.href === '/dashboard'),
          navItems.find(i => i.href === '/dashboard/asistencias'),
        ].filter(Boolean).map(item => {
          const active = isActive(item!.href, (item as { exact?: boolean })?.exact)
          const Icon = item!.icon
          return (
            <Link key={item!.href} href={item!.href}
              className="flex-1 flex flex-col items-center gap-1 pb-3 pt-2 text-xs transition-colors relative"
              style={{ color: active ? '#A8B5A0' : 'rgba(255,254,251,0.45)' }}>
              {active && <span className="absolute top-0 w-8 h-0.5 rounded-full" style={{ background: '#556B45' }} />}
              <Icon className="w-5 h-5" />
              <span className="font-medium">{item!.label}</span>
            </Link>
          )
        })}

        {/* Center Luka AI button */}
        <div className="relative overflow-visible flex-shrink-0" style={{ width: '80px', height: '64px' }}>
          {/* Relleno del nav detras del boton */}
          <div className="absolute inset-0" style={{ background: '#1A2E37' }} />

          {/* Anillo pulsante (uno solo, limpio) detras del boton */}
          <span
            className="absolute rounded-full pointer-events-none"
            style={{ width: '58px', height: '58px', left: '11px', bottom: '18px', zIndex: 9 }}
          >
            <motion.span
              key={asistenteActivo ? 'active-ring' : 'idle-ring'}
              className="absolute inset-0 rounded-full"
              style={{
                border: asistenteActivo
                  ? '2px solid rgba(45,212,191,0.65)'
                  : '2px solid rgba(61,220,132,0.45)',
              }}
              animate={{ scale: [1, 1.6], opacity: [0.55, 0] }}
              transition={{ duration: asistenteActivo ? 1.1 : 2.4, repeat: Infinity, ease: 'easeOut' }}
            />
          </span>

          <motion.button
            onClick={abrirAsistenteVoz}
            aria-label="Abrir Luka AI"
            className="absolute flex items-center justify-center rounded-full"
            style={{
              width: '58px',
              height: '58px',
              left: '11px',
              bottom: '18px',
              zIndex: 10,
              border: '1.5px solid rgba(255,255,255,0.16)',
              background: asistenteActivo
                ? 'radial-gradient(circle at 38% 28%, #5BE89A 0%, #2DD4BF 55%, #16B8A6 100%)'
                : 'radial-gradient(circle at 38% 28%, #34466B 0%, #1C2B4A 52%, #111D36 100%)',
              boxShadow: asistenteActivo
                ? '0 0 0 4px rgba(45,212,191,0.22), 0 10px 26px rgba(45,212,191,0.42), 0 2px 6px rgba(0,0,0,0.3)'
                : '0 10px 22px rgba(11,18,33,0.5), 0 2px 6px rgba(0,0,0,0.35), inset 0 1px 1px rgba(255,255,255,0.12)',
              transition: 'background 0.35s ease, box-shadow 0.35s ease',
            }}
            animate={asistenteActivo ? { scale: [1, 1.04, 1] } : {}}
            transition={{ duration: 1.6, repeat: asistenteActivo ? Infinity : 0, ease: 'easeInOut' }}
            whileTap={{ scale: 0.9 }}
            whileHover={{ scale: 1.05 }}
          >
            <motion.span
              className="flex items-center justify-center"
              animate={{ scale: asistenteActivo ? [1, 1.12, 1] : [1, 1.06, 1] }}
              transition={{ duration: asistenteActivo ? 1.4 : 3, repeat: Infinity, ease: 'easeInOut' }}
            >
              <LukaIcon
                size={26}
                color="#FAF6EF"
                accent={asistenteActivo ? '#0F1B33' : '#3DDC84'}
              />
            </motion.span>
          </motion.button>

          <span
            className="absolute text-[9px] font-semibold leading-none"
            style={{
              bottom: '3px',
              left: '50%',
              transform: 'translateX(-50%)',
              zIndex: 10,
              whiteSpace: 'nowrap',
              color: asistenteActivo ? '#2DD4BF' : 'rgba(255,254,251,0.6)',
            }}
          >
            {asistenteActivo ? 'Activo' : 'Luka AI'}
          </span>
        </div>

        {/* Right items: Nominas + Proyectos */}
        {[
          navItems.find(i => i.href === '/dashboard/nomina'),
          navItems.find(i => i.href === '/dashboard/proyectos'),
        ].filter(Boolean).map(item => {
          const active = isActive(item!.href, (item as { exact?: boolean })?.exact)
          const Icon = item!.icon
          return (
            <Link key={item!.href} href={item!.href}
              className="flex-1 flex flex-col items-center gap-1 pb-3 pt-2 text-xs transition-colors relative"
              style={{ color: active ? '#A8B5A0' : 'rgba(255,254,251,0.45)' }}>
              {active && <span className="absolute top-0 w-8 h-0.5 rounded-full" style={{ background: '#556B45' }} />}
              <Icon className="w-5 h-5" />
              <span className="font-medium">{item!.label}</span>
            </Link>
          )
        })}
      </nav>
    </div>
  )
}
