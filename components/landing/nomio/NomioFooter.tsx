const ICON_FT = `<svg width="36" height="36" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" style="flex-shrink:0;display:block;"><defs><linearGradient id="nomio-bg-ft" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#22315A"/><stop offset="100%" stop-color="#121C36"/></linearGradient><linearGradient id="nomio-n-ft" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#4ADE80"/><stop offset="100%" stop-color="#22D3BB"/></linearGradient></defs><rect width="100" height="100" rx="24" fill="url(#nomio-bg-ft)"/><g stroke-width="11" stroke-linecap="round" stroke-linejoin="round" fill="none"><path d="M32 78 L32 34" stroke="#FAF6EF"/><path d="M32 34 L64 78" stroke="#FAF6EF"/><path d="M64 78 L64 34" stroke="url(#nomio-n-ft)"/></g><path d="M82 11 L85 18.5 L92.5 21 L85 23.5 L82 31 L79 23.5 L71.5 21 L79 18.5 Z" fill="#22D3BB"/></svg>`

const FOOT_INNER = `
  <div class="foot-grid">
    <div>
      <div class="logo" style="pointer-events:none;">
        <span class="logo-mark">${ICON_FT}</span>
        <span class="logo-word" style="color:var(--cuero-50);">Nomi<span style="color:#22D3BB;">extra</span></span>
      </div>
      <p class="body-sm" style="color:rgba(250,246,239,0.55);margin-top:18px;max-width:280px;">
        Software para nóminas, asistencias y cotizaciones. Hecho en México para arquitectos y constructoras.
      </p>
    </div>
    <div class="foot-col">
      <h5>Producto</h5>
      <ul>
        <li><a href="/#producto">Asistencias</a></li>
        <li><a href="/#producto">Nómina</a></li>
        <li><a href="/#producto">Cotizaciones</a></li>
        <li><a href="/nomiextra-ai">Nomiextra AI</a></li>
        <li><a href="/#producto">Multi-obra</a></li>
        <li><a href="https://github.com/iamsamy99-bit/nomio-releases/releases/latest/download/Nomio-Setup.exe" rel="noopener">App para Windows</a></li>
      </ul>
    </div>
    <div class="foot-col">
      <h5>Empresa</h5>
      <ul>
        <li><a href="/">Inicio</a></li>
        <li><a href="/#precios">Precios</a></li>
        <li><a href="mailto:hola@nomiextra.mx">Contacto</a></li>
      </ul>
    </div>
    <div class="foot-col">
      <h5>Legal</h5>
      <ul>
        <li><a href="/terminos">Términos</a></li>
        <li><a href="/politica-privacidad">Privacidad</a></li>
      </ul>
    </div>
  </div>
  <div class="foot-bot">
    <span>© 2026 Nomiextra · Ciudad de México</span>
    <span>Nómina de obra, sin papeleo.</span>
  </div>
`

export default function NomioFooter() {
  return <footer className="foot" dangerouslySetInnerHTML={{ __html: FOOT_INNER }} />
}
