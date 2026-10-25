'use client'
import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { NomioIcon } from '@/components/brand/NomioLogo'
import { ChevronDown, Menu, X } from 'lucide-react'

/* ── Types ───────────────────────────────────────────────────── */
interface DropdownItem {
  label: string
  description: string
  href: string
  dot: string
}

interface NavItem {
  label: string
  href?: string
  items?: DropdownItem[]
}

/* ── Nav structure ───────────────────────────────────────────── */
const NAV_ITEMS: NavItem[] = [
  {
    label: 'Producto',
    items: [
      { label: 'Nominas de obra', description: 'Genera la nomina semanal en 3 minutos.', href: '/producto/nomina', dot: '#3A4E2E' },
      { label: 'Asistencias', description: 'Registro offline con semaforo semanal.', href: '/producto/asistencias', dot: '#556B45' },
      { label: 'Cotizaciones', description: 'PDF con tu logo y firma en segundos.', href: '/producto/cotizaciones', dot: '#6F8A4F' },
      { label: 'Proyectos', description: 'Multi-obra con bitacora y avance.', href: '/producto/proyectos', dot: '#8FAF6A' },
    ],
  },
  {
    label: 'Precios',
    href: '/precios',
  },
  {
    label: 'Recursos',
    items: [
      { label: 'Funciones', description: 'Guia completa de todo lo que hace Nomiextra.', href: '/funciones', dot: '#C77A52' },
      { label: 'Casos de uso', description: 'Como lo usan arquitectos y constructoras.', href: '/casos', dot: '#D4956E' },
    ],
  },
  {
    label: 'Empresa',
    items: [
      { label: 'Nosotros', description: 'El equipo detras de Nomiextra.', href: '/empresa', dot: '#1A1714' },
      { label: 'Contacto', description: 'Hablamos por WhatsApp o correo.', href: '/contacto', dot: '#3A3330' },
    ],
  },
]

/* ── Dropdown panel ──────────────────────────────────────────── */
function DropdownPanel({ items, visible }: { items: DropdownItem[]; visible: boolean }) {
  return (
    <div
      role="menu"
      style={{
        position: 'absolute',
        top: 'calc(100% + 8px)',
        left: '50%',
        background: '#FFFEFB',
        border: '1px solid rgba(26,23,20,0.08)',
        borderRadius: 12,
        boxShadow: '0 8px 32px rgba(26,23,20,0.12), 0 2px 8px rgba(26,23,20,0.06)',
        minWidth: 280,
        padding: '8px',
        pointerEvents: visible ? 'auto' : 'none',
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateX(-50%) translateY(0)' : 'translateX(-50%) translateY(-6px)',
        transition: 'opacity 0.15s ease, transform 0.15s ease',
        zIndex: 100,
      }}
    >
      {items.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          role="menuitem"
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: 12,
            padding: '10px 12px',
            borderRadius: 8,
            textDecoration: 'none',
            transition: 'background 0.12s ease',
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLAnchorElement).style.background = 'rgba(58,78,46,0.05)'
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLAnchorElement).style.background = 'transparent'
          }}
        >
          <span
            aria-hidden="true"
            style={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              background: item.dot,
              flexShrink: 0,
              marginTop: 5,
            }}
          />
          <div>
            <div style={{
              fontFamily: 'Inter Tight, Inter, system-ui, sans-serif',
              fontSize: 14,
              fontWeight: 500,
              color: '#1A1714',
              lineHeight: 1.3,
              marginBottom: 2,
            }}>
              {item.label}
            </div>
            <div style={{
              fontFamily: 'Inter Tight, Inter, system-ui, sans-serif',
              fontSize: 12,
              color: 'rgba(26,23,20,0.5)',
              lineHeight: 1.4,
            }}>
              {item.description}
            </div>
          </div>
        </Link>
      ))}
    </div>
  )
}

/* ── Main component ──────────────────────────────────────────── */
export default function LandingNav() {
  const [scrolled, setScrolled] = useState(false)
  const [openMenu, setOpenMenu] = useState<string | null>(null)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [mobileExpanded, setMobileExpanded] = useState<string | null>(null)
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  // Close mobile menu on route change / escape
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpenMenu(null)
        setMobileOpen(false)
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [])

  // Prevent body scroll when mobile overlay is open
  useEffect(() => {
    document.body.style.overflow = mobileOpen ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [mobileOpen])

  function handleMouseEnter(label: string) {
    if (closeTimer.current) clearTimeout(closeTimer.current)
    setOpenMenu(label)
  }

  function handleMouseLeave() {
    closeTimer.current = setTimeout(() => setOpenMenu(null), 120)
  }

  return (
    <>
      <nav
        aria-label="Navegacion principal"
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 50,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '0 40px',
          height: 60,
          background: 'rgba(242,235,221,0.92)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          boxShadow: scrolled ? '0 1px 0 rgba(26,23,20,0.08)' : 'none',
          transition: 'box-shadow 0.2s ease',
        }}
      >
        {/* Left: logo */}
        <Link
          href="/"
          aria-label="Nomiextra — inicio"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            textDecoration: 'none',
            flexShrink: 0,
          }}
        >
          <NomioIcon size={32} />
          <span style={{
            fontFamily: 'Fraunces, Georgia, serif',
            fontSize: 17,
            fontWeight: 500,
            color: '#1A1714',
            letterSpacing: '-0.01em',
            lineHeight: 1,
          }}>
            Nomiextr<span style={{ color: '#C77A52' }}>a</span>
          </span>
        </Link>

        {/* Center: desktop nav items */}
        <ul
          className="landing-nav-links"
          role="menubar"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 2,
            listStyle: 'none',
            margin: 0,
            padding: 0,
          }}
        >
          {NAV_ITEMS.map((item) => (
            <li
              key={item.label}
              role="none"
              style={{ position: 'relative' }}
              onMouseEnter={() => item.items && handleMouseEnter(item.label)}
              onMouseLeave={() => item.items && handleMouseLeave()}
            >
              {item.href ? (
                <Link
                  href={item.href}
                  role="menuitem"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 4,
                    padding: '6px 12px',
                    borderRadius: 6,
                    fontFamily: 'Inter Tight, Inter, system-ui, sans-serif',
                    fontSize: 14,
                    fontWeight: 500,
                    color: openMenu === item.label ? 'var(--bosque-500, #3A4E2E)' : '#1A1714',
                    textDecoration: 'none',
                    transition: 'color 0.12s ease, background 0.12s ease',
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLAnchorElement).style.background = 'rgba(26,23,20,0.05)'
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLAnchorElement).style.background = 'transparent'
                  }}
                >
                  {item.label}
                </Link>
              ) : (
                <button
                  role="menuitem"
                  aria-haspopup="true"
                  aria-expanded={openMenu === item.label}
                  onClick={() => setOpenMenu(openMenu === item.label ? null : item.label)}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 4,
                    padding: '6px 12px',
                    borderRadius: 6,
                    fontFamily: 'Inter Tight, Inter, system-ui, sans-serif',
                    fontSize: 14,
                    fontWeight: 500,
                    color: openMenu === item.label ? '#3A4E2E' : '#1A1714',
                    background: openMenu === item.label ? 'rgba(58,78,46,0.07)' : 'transparent',
                    border: 'none',
                    cursor: 'pointer',
                    transition: 'color 0.12s ease, background 0.12s ease',
                  }}
                >
                  {item.label}
                  <ChevronDown
                    size={13}
                    style={{
                      transition: 'transform 0.15s ease',
                      transform: openMenu === item.label ? 'rotate(180deg)' : 'rotate(0deg)',
                      opacity: 0.6,
                    }}
                  />
                </button>
              )}

              {item.items && (
                <DropdownPanel items={item.items} visible={openMenu === item.label} />
              )}
            </li>
          ))}
        </ul>

        {/* Right: CTA buttons (desktop) */}
        <div
          className="landing-nav-cta"
          style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}
        >
          <Link
            href="/auth/login"
            style={{
              fontFamily: 'Inter Tight, Inter, system-ui, sans-serif',
              fontSize: 14,
              fontWeight: 500,
              color: '#1A1714',
              textDecoration: 'none',
              padding: '6px 12px',
              borderRadius: 6,
              transition: 'background 0.12s ease',
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLAnchorElement).style.background = 'rgba(26,23,20,0.05)'
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLAnchorElement).style.background = 'transparent'
            }}
          >
            Iniciar sesion
          </Link>
          <Link
            href="/auth/register"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: '7px 16px',
              borderRadius: 999,
              background: '#3A4E2E',
              color: '#F2EBDD',
              fontFamily: 'Inter Tight, Inter, system-ui, sans-serif',
              fontSize: 14,
              fontWeight: 600,
              textDecoration: 'none',
              transition: 'opacity 0.15s ease',
              whiteSpace: 'nowrap',
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLAnchorElement).style.opacity = '0.88'
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLAnchorElement).style.opacity = '1'
            }}
          >
            Crear cuenta gratis&nbsp;&rarr;
          </Link>
        </div>

        {/* Hamburger (mobile only) */}
        <button
          className="landing-nav-hamburger"
          aria-label={mobileOpen ? 'Cerrar menu' : 'Abrir menu'}
          aria-expanded={mobileOpen}
          onClick={() => setMobileOpen(!mobileOpen)}
          style={{
            display: 'none',
            alignItems: 'center',
            justifyContent: 'center',
            width: 36,
            height: 36,
            background: 'transparent',
            border: 'none',
            cursor: 'pointer',
            borderRadius: 8,
            color: '#1A1714',
            flexShrink: 0,
          }}
        >
          {mobileOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </nav>

      {/* ── Mobile overlay ───────────────────────────────────── */}
      <div
        aria-hidden={!mobileOpen}
        style={{
          position: 'fixed',
          inset: 0,
          top: 60,
          zIndex: 49,
          background: '#F2EBDD',
          overflowY: 'auto',
          pointerEvents: mobileOpen ? 'auto' : 'none',
          opacity: mobileOpen ? 1 : 0,
          transition: 'opacity 0.2s ease',
        }}
      >
        <div style={{ padding: '24px 24px 40px' }}>
          {NAV_ITEMS.map((item) => (
            <div key={item.label} style={{ marginBottom: 4 }}>
              {item.href ? (
                <Link
                  href={item.href}
                  onClick={() => setMobileOpen(false)}
                  style={{
                    display: 'block',
                    padding: '12px 4px',
                    fontFamily: 'Inter Tight, Inter, system-ui, sans-serif',
                    fontSize: 18,
                    fontWeight: 500,
                    color: '#1A1714',
                    textDecoration: 'none',
                    borderBottom: '1px solid rgba(26,23,20,0.08)',
                  }}
                >
                  {item.label}
                </Link>
              ) : (
                <>
                  <button
                    onClick={() => setMobileExpanded(mobileExpanded === item.label ? null : item.label)}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      width: '100%',
                      padding: '12px 4px',
                      fontFamily: 'Inter Tight, Inter, system-ui, sans-serif',
                      fontSize: 18,
                      fontWeight: 500,
                      color: '#1A1714',
                      background: 'transparent',
                      border: 'none',
                      borderBottom: '1px solid rgba(26,23,20,0.08)',
                      cursor: 'pointer',
                      textAlign: 'left',
                    }}
                  >
                    {item.label}
                    <ChevronDown
                      size={16}
                      style={{
                        transition: 'transform 0.15s ease',
                        transform: mobileExpanded === item.label ? 'rotate(180deg)' : 'rotate(0deg)',
                        opacity: 0.5,
                      }}
                    />
                  </button>
                  {mobileExpanded === item.label && item.items && (
                    <div style={{ paddingLeft: 16, paddingTop: 4, paddingBottom: 8 }}>
                      {item.items.map((sub) => (
                        <Link
                          key={sub.href}
                          href={sub.href}
                          onClick={() => setMobileOpen(false)}
                          style={{
                            display: 'flex',
                            alignItems: 'flex-start',
                            gap: 10,
                            padding: '10px 4px',
                            textDecoration: 'none',
                          }}
                        >
                          <span style={{
                            width: 7,
                            height: 7,
                            borderRadius: '50%',
                            background: sub.dot,
                            flexShrink: 0,
                            marginTop: 5,
                          }} />
                          <div>
                            <div style={{
                              fontFamily: 'Inter Tight, Inter, system-ui, sans-serif',
                              fontSize: 15,
                              fontWeight: 500,
                              color: '#1A1714',
                            }}>
                              {sub.label}
                            </div>
                            <div style={{
                              fontFamily: 'Inter Tight, Inter, system-ui, sans-serif',
                              fontSize: 12,
                              color: 'rgba(26,23,20,0.5)',
                              marginTop: 2,
                            }}>
                              {sub.description}
                            </div>
                          </div>
                        </Link>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          ))}

          {/* Mobile CTA */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 28 }}>
            <Link
              href="/auth/register"
              onClick={() => setMobileOpen(false)}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '14px 24px',
                borderRadius: 999,
                background: '#3A4E2E',
                color: '#F2EBDD',
                fontFamily: 'Inter Tight, Inter, system-ui, sans-serif',
                fontSize: 16,
                fontWeight: 600,
                textDecoration: 'none',
              }}
            >
              Crear cuenta gratis &rarr;
            </Link>
            <Link
              href="/auth/login"
              onClick={() => setMobileOpen(false)}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '14px 24px',
                borderRadius: 999,
                border: '1px solid rgba(26,23,20,0.15)',
                background: 'transparent',
                color: '#1A1714',
                fontFamily: 'Inter Tight, Inter, system-ui, sans-serif',
                fontSize: 16,
                fontWeight: 500,
                textDecoration: 'none',
              }}
            >
              Iniciar sesion
            </Link>
          </div>
        </div>
      </div>

      {/* Responsive styles injected as a style tag */}
      <style>{`
        @media (max-width: 767px) {
          .landing-nav-links { display: none !important; }
          .landing-nav-cta { display: none !important; }
          .landing-nav-hamburger { display: flex !important; }
        }
        @media (min-width: 768px) {
          .landing-nav-hamburger { display: none !important; }
        }
      `}</style>
    </>
  )
}
