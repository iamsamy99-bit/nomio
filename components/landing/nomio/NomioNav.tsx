const ICON = `<svg width="36" height="36" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" style="flex-shrink:0;display:block;"><defs><linearGradient id="nomio-bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#22315A"/><stop offset="100%" stop-color="#121C36"/></linearGradient><linearGradient id="nomio-n" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#4ADE80"/><stop offset="100%" stop-color="#22D3BB"/></linearGradient></defs><rect width="100" height="100" rx="24" fill="url(#nomio-bg)"/><g stroke-width="11" stroke-linecap="round" stroke-linejoin="round" fill="none"><path d="M32 78 L32 34" stroke="#FAF6EF"/><path d="M32 34 L64 78" stroke="#FAF6EF"/><path d="M64 78 L64 34" stroke="url(#nomio-n)"/></g><path d="M82 11 L85 18.5 L92.5 21 L85 23.5 L82 31 L79 23.5 L71.5 21 L79 18.5 Z" fill="#22D3BB"/></svg>`

const NAV_INNER = `
  <a class="logo" href="/" aria-label="Nomiextra inicio">
    <span class="logo-mark">${ICON}</span>
    <span class="logo-word">Nomi<span style="color:#22D3BB;">extra</span></span>
  </a>
  <div class="nav-links">
    <a href="/#producto">Producto</a>
    <a href="/nomiextra-ai">Nomiextra AI</a>
    <a href="/#precios">Precios</a>
    <a href="/#historia">Casos</a>
  </div>
  <div class="nav-cta">
    <a href="/auth/login" class="btn btn-ghost btn-sm"><span class="btn-label">Iniciar sesión</span></a>
    <a href="/auth/register" class="btn btn-dark btn-sm" data-magnetic="0.3"><span class="btn-label">Probar gratis</span><svg class="arrow" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg></a>
    <button class="nav-burger" aria-label="Menú"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><line x1="3" y1="7" x2="21" y2="7"></line><line x1="3" y1="13" x2="21" y2="13"></line><line x1="3" y1="19" x2="21" y2="19"></line></svg></button>
  </div>
`

const MMENU_INNER = `
  <div class="mmenu-top">
    <span class="logo-word">Nomiextra</span>
    <button class="mmenu-close btn-ghost" style="background:transparent;border:none;cursor:pointer;padding:8px;"><svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#1A1714" stroke-width="1.8" stroke-linecap="round"><line x1="6" y1="6" x2="18" y2="18"></line><line x1="18" y1="6" x2="6" y2="18"></line></svg></button>
  </div>
  <a href="/#producto">Producto</a>
  <a href="/nomiextra-ai">Nomiextra AI</a>
  <a href="/#precios">Precios</a>
  <a href="/#historia">Casos</a>
  <a href="/auth/register" style="color:var(--bosque-500);">Probar gratis →</a>
`

export default function NomioNav() {
  return (
    <>
      <nav className="nav" dangerouslySetInnerHTML={{ __html: NAV_INNER }} />
      <div className="mmenu" dangerouslySetInnerHTML={{ __html: MMENU_INNER }} />
    </>
  )
}
