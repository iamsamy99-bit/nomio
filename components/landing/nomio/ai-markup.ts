/* Markup for the /nomiextra-ai standalone page.
   Same .nomio CSS scope + NomioScripts animations as the main landing. */

const ARROW_SVG = `<svg class="arrow" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg>`

const SEND_SVG = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#FAF6EF" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>`

const STAR_SVG = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#FAF6EF" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3l1.5 5.5L19 10l-5.5 1.5L12 17l-1.5-5.5L5 10l5.5-1.5L12 3z"></path></svg>`

const CHAT_HEADER = `<div style="display:flex;align-items:center;gap:10px;margin-bottom:20px;padding-bottom:16px;border-bottom:1px solid rgba(250,246,239,0.1);">
              <span style="width:30px;height:30px;border-radius:8px;background:var(--bosque-500);display:flex;align-items:center;justify-content:center;">${STAR_SVG}</span>
              <span style="font-family:var(--font-display);font-size:17px;color:var(--cuero-50);">Nomiextra AI</span>
              <span style="margin-left:auto;display:flex;align-items:center;gap:6px;"><span style="width:7px;height:7px;border-radius:50%;background:#4CAF50;display:inline-block;"></span><span class="mono" style="font-size:11px;color:rgba(250,246,239,0.5);">En línea</span></span>
            </div>`

const FAKE_INPUT = `<div style="display:flex;align-items:center;gap:10px;margin-top:18px;padding:12px 16px;border-radius:999px;background:rgba(250,246,239,0.06);border:1px solid rgba(250,246,239,0.1);">
              <span class="mono" style="font-size:12px;color:rgba(250,246,239,0.45);flex:1;">Pregúntale algo a tu obra…</span>
              <span style="width:30px;height:30px;border-radius:50%;background:var(--bosque-500);display:flex;align-items:center;justify-content:center;flex-shrink:0;">${SEND_SVG}</span>
            </div>
            <p class="mono" style="font-size:10px;color:rgba(250,246,239,0.35);margin-top:12px;text-align:center;letter-spacing:0.05em;">Toca una sugerencia para probar otra pregunta</p>`

export const NOMIO_AI_HTML = `
<!-- ============ HERO (dark petroleo) ============ -->
<header class="hero" id="top" data-dark style="background:var(--petroleo-700);padding-top:clamp(100px,14vw,160px);padding-bottom:clamp(72px,10vw,130px);">
  <div class="ai-grid-bg"></div>
  <div class="wrap" style="position:relative;z-index:1;">
    <div style="text-align:center;max-width:680px;margin:0 auto;">
      <span class="kicker reveal" style="color:var(--bosque-200);">Nomiextra AI</span>
      <h1 class="display-hero reveal" data-split style="color:var(--cuero-50);margin-top:20px;">Tu obra,<br /><em style="color:var(--cuero-300);">en palabras.</em></h1>
      <p class="lede reveal" style="color:rgba(250,246,239,0.75);margin-top:28px;max-width:520px;margin-left:auto;margin-right:auto;">
        Pregúntale a Nomiextra AI como le hablarías a tu maestro de obra. Respuestas reales de tus datos — sin reportes, sin fórmulas, sin abrir nada más.
      </p>
      <div class="reveal" style="display:flex;gap:12px;justify-content:center;margin-top:40px;flex-wrap:wrap;">
        <a href="/auth/register" class="btn btn-light btn-lg" data-magnetic="0.4"><span class="btn-label">Probar gratis — 14 días</span>${ARROW_SVG}</a>
        <a href="/#precios" class="btn btn-ghost btn-lg" style="color:var(--cuero-50);border:1px solid rgba(250,246,239,0.3);" data-magnetic="0.25"><span class="btn-label">Ver planes</span></a>
      </div>
    </div>

    <!-- Hero chat demo -->
    <div class="reveal" style="margin-top:64px;max-width:700px;margin-left:auto;margin-right:auto;">
      <div class="mock" data-chat style="background:rgba(250,246,239,0.04);border:1px solid rgba(250,246,239,0.12);box-shadow:none;backdrop-filter:blur(4px);">
        ${CHAT_HEADER}
        <div style="display:flex;flex-direction:column;gap:14px;min-height:180px;">
          <div class="ai-line" style="display:flex;justify-content:flex-end;opacity:0;transform:translateY(12px);transition:opacity .5s ease,transform .5s ease;">
            <div class="ai-bubble ai-user"><span data-q-text data-type="¿Cuánto debo pagarle a mi cuadrilla este viernes?" data-speed="22"></span></div>
          </div>
          <div class="ai-line" style="display:flex;justify-content:flex-start;opacity:0;transform:translateY(12px);transition:opacity .5s ease,transform .5s ease;">
            <div class="ai-bubble ai-bot"><span data-a-text data-type="Esta semana tienes 14 trabajadores con asistencia completa y 2 con faltas. El total a pagar es $18,950 MXN. ¿Genero la nómina ahora?" data-speed="14"></span></div>
          </div>
        </div>
        <div style="display:flex;flex-wrap:wrap;gap:8px;margin-top:16px;">
          <button class="chip" data-chip-q="¿Cuánto debo pagarle a mi cuadrilla este viernes?" data-chip-a="Esta semana tienes 14 trabajadores con asistencia completa y 2 con faltas. El total a pagar es $18,950 MXN. ¿Genero la nómina ahora?">Ver nómina</button>
          <button class="chip" data-chip-q="¿Cuánto gasté en mano de obra este mes?" data-chip-a="Este mes llevas $124,600 MXN en mano de obra entre todas tus obras. La Obra Polanco representa el 58% del gasto. Estás al 91% del presupuesto mensual.">Costos del mes</button>
          <button class="chip" data-chip-q="Hazme una cotización para 120 m² de impermeabilización" data-chip-a="Lista. Cotización por $38,400 MXN: 120 m² de impermeabilización, mano de obra y material, IVA incluido, con tu logo y firma. ¿La envío al cliente por WhatsApp?">Crear cotización</button>
        </div>
        ${FAKE_INPUT}
      </div>
    </div>
  </div>
</header>

<div class="divider"></div>

<!-- ============ CAPABILITIES ============ -->
<section class="sec">
  <div class="wrap">
    <div class="sec-head reveal" style="margin-bottom:56px;">
      <span class="kicker">Capacidades</span>
      <h2 class="display-lg" style="margin-top:14px;">Todo lo que puede<br />resolver por ti.</h2>
    </div>
    <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:18px;" data-stagger>
      <div class="card card-hover" style="padding:32px;">
        <div style="width:44px;height:44px;border-radius:10px;background:var(--bosque-100);display:flex;align-items:center;justify-content:center;margin-bottom:20px;">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--bosque-600)" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="5" width="20" height="14" rx="2"></rect><line x1="2" y1="10" x2="22" y2="10"></line></svg>
        </div>
        <span class="feat-num">01 — Nómina</span>
        <h4 class="h-section" style="margin-top:8px;">Cierra la raya en segundos.</h4>
        <p class="body-sm" style="margin-top:10px;">Pregunta cuánto debes pagar y lo calcula con las asistencias y tarifas reales de tu cuadrilla. Sin Excel.</p>
      </div>
      <div class="card card-hover" style="padding:32px;">
        <div style="width:44px;height:44px;border-radius:10px;background:var(--bosque-100);display:flex;align-items:center;justify-content:center;margin-bottom:20px;">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--bosque-600)" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
        </div>
        <span class="feat-num">02 — Asistencias</span>
        <h4 class="h-section" style="margin-top:8px;">¿Quién faltó esta semana?</h4>
        <p class="body-sm" style="margin-top:10px;">Un mensaje y sabes quién faltó, quién llegó tarde y quién completó la semana. Aplicar descuentos es un tap.</p>
      </div>
      <div class="card card-hover" style="padding:32px;">
        <div style="width:44px;height:44px;border-radius:10px;background:var(--bosque-100);display:flex;align-items:center;justify-content:center;margin-bottom:20px;">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--bosque-600)" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="1" x2="12" y2="23"></line><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path></svg>
        </div>
        <span class="feat-num">03 — Costos</span>
        <h4 class="h-section" style="margin-top:8px;">Gastos por obra, al instante.</h4>
        <p class="body-sm" style="margin-top:10px;">Compara presupuesto vs. gasto real entre proyectos. Detecta desviaciones antes de que se salgan de control.</p>
      </div>
    </div>
    <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:18px;margin-top:18px;" data-stagger>
      <div class="card card-hover" style="padding:32px;">
        <div style="width:44px;height:44px;border-radius:10px;background:var(--bosque-100);display:flex;align-items:center;justify-content:center;margin-bottom:20px;">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--bosque-600)" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline></svg>
        </div>
        <span class="feat-num">04 — Cotizaciones</span>
        <h4 class="h-section" style="margin-top:8px;">Cotiza describiendo el trabajo.</h4>
        <p class="body-sm" style="margin-top:10px;">Dile qué necesitas — metros cuadrados, material, mano de obra — y genera un PDF con tu logo listo para WhatsApp.</p>
      </div>
      <div class="card card-hover" style="padding:32px;">
        <div style="width:44px;height:44px;border-radius:10px;background:var(--bosque-100);display:flex;align-items:center;justify-content:center;margin-bottom:20px;">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--bosque-600)" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
        </div>
        <span class="feat-num">05 — Anticipos</span>
        <h4 class="h-section" style="margin-top:8px;">Préstamos sin papeles.</h4>
        <p class="body-sm" style="margin-top:10px;">Registra adelantos a tu gente con una frase. Nomiextra AI descuenta solo en la siguiente nómina.</p>
      </div>
      <div class="card card-hover" style="padding:32px;">
        <div style="width:44px;height:44px;border-radius:10px;background:var(--bosque-100);display:flex;align-items:center;justify-content:center;margin-bottom:20px;">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--bosque-600)" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 9.81a19.79 19.79 0 01-3.07-8.68A2 2 0 012 .18h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.09 7.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 14.92z"></path></svg>
        </div>
        <span class="feat-num">06 — Recibos</span>
        <h4 class="h-section" style="margin-top:8px;">Comprobante por WhatsApp.</h4>
        <p class="body-sm" style="margin-top:10px;">Envía recibos individuales con un tap. Tu cuadrilla recibe un mensaje claro con su pago, faltas y deducciones.</p>
      </div>
    </div>
  </div>
</section>

<div class="divider"></div>

<!-- ============ HOW IT WORKS ============ -->
<section class="sec" style="background:var(--cuero-100);">
  <div class="wrap">
    <div class="sec-head reveal" style="margin-bottom:clamp(40px,5vw,64px);">
      <span class="kicker">Cómo funciona</span>
      <h2 class="display-lg" style="margin-top:14px;">Tres pasos.<br />Cero complicación.</h2>
    </div>
    <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:clamp(32px,5vw,64px);align-items:start;" data-stagger>
      <div class="reveal">
        <span style="font-size:clamp(36px,4vw,56px);font-family:var(--font-display);font-style:italic;color:var(--bosque-400);letter-spacing:-0.03em;line-height:1;display:block;">01</span>
        <h4 class="h-section" style="margin-top:16px;">Registra tu obra</h4>
        <p class="body-sm" style="margin-top:10px;color:var(--tinta-500);">Crea tu proyecto, agrega a tu cuadrilla con sus tarifas y empieza a marcar asistencias — desde el celular o en el dashboard.</p>
      </div>
      <div class="reveal">
        <span style="font-size:clamp(36px,4vw,56px);font-family:var(--font-display);font-style:italic;color:var(--bosque-400);letter-spacing:-0.03em;line-height:1;display:block;">02</span>
        <h4 class="h-section" style="margin-top:16px;">Pregunta lo que quieras</h4>
        <p class="body-sm" style="margin-top:10px;color:var(--tinta-500);">Escribe como hablas: "¿cuánto llevo gastado?", "¿quién faltó?", "cierra la nómina del viernes". Sin comandos, sin menús.</p>
      </div>
      <div class="reveal">
        <span style="font-size:clamp(36px,4vw,56px);font-family:var(--font-display);font-style:italic;color:var(--bosque-400);letter-spacing:-0.03em;line-height:1;display:block;">03</span>
        <h4 class="h-section" style="margin-top:16px;">Actúa en un tap</h4>
        <p class="body-sm" style="margin-top:10px;color:var(--tinta-500);">El AI no solo responde — ejecuta. Genera nóminas, crea cotizaciones, registra anticipos y envía recibos por WhatsApp.</p>
      </div>
    </div>
  </div>
</section>

<div class="divider"></div>

<!-- ============ SECOND CHAT DEMO (dark) ============ -->
<section class="sec" id="demo" data-dark style="padding-bottom:clamp(60px,8vw,110px);">
  <div class="wrap">
    <div class="ai-wrap" style="padding:clamp(40px,5vw,72px);">
      <div class="ai-grid-bg"></div>
      <div style="position:relative;display:grid;grid-template-columns:1fr 1.05fr;gap:clamp(40px,5vw,72px);align-items:center;">
        <div class="reveal-l">
          <span class="kicker" style="color:var(--bosque-200);">Pruébalo ahora</span>
          <h2 class="display-xl" style="color:var(--cuero-50);margin-top:16px;">Pregunta como<br /><em style="color:var(--cuero-300);">hablas.</em></h2>
          <p class="body-lg" style="color:rgba(250,246,239,0.78);margin-top:24px;max-width:460px;">
            No necesitas aprender comandos. Escribe lo que necesitas saber y Nomiextra AI lo busca en tus datos de asistencias, nóminas y proyectos.
          </p>
          <div style="display:flex;flex-wrap:wrap;gap:10px;margin-top:32px;">
            <button class="chip" data-chip-q="¿Cuánto llevo gastado en la obra de Polanco este mes?" data-chip-a="En Polanco llevas $148,200 MXN en mano de obra este mes — 12% por debajo de tu presupuesto semanal promedio. La cuadrilla de albañilería es el 54% del gasto.">Gasto del mes</button>
            <button class="chip" data-chip-q="¿Quién faltó más esta semana?" data-chip-a="Hugo T. fue quien más faltó: 1 falta y 1 retardo esta semana. El resto de la cuadrilla tuvo asistencia completa. ¿Le aplico el descuento en la nómina del viernes?">Faltas de la semana</button>
            <button class="chip" data-chip-q="Hazme una cotización para 80 m² de loseta" data-chip-a="Listo. Generé una cotización por $54,400 MXN: 80 m² de loseta, material y mano de obra, IVA incluido, con tu logo y firma. ¿La envío por WhatsApp al cliente?">Crear cotización</button>
          </div>
        </div>

        <div class="reveal-r">
          <div class="mock" data-chat style="background:rgba(250,246,239,0.04);border:1px solid rgba(250,246,239,0.12);box-shadow:none;backdrop-filter:blur(4px);">
            ${CHAT_HEADER}
            <div style="display:flex;flex-direction:column;gap:14px;min-height:230px;">
              <div class="ai-line" style="display:flex;justify-content:flex-end;opacity:0;transform:translateY(12px);transition:opacity .5s ease,transform .5s ease;">
                <div class="ai-bubble ai-user"><span data-q-text data-type="¿Cuánto llevo gastado en la obra de Polanco este mes?" data-speed="22"></span></div>
              </div>
              <div class="ai-line" style="display:flex;justify-content:flex-start;opacity:0;transform:translateY(12px);transition:opacity .5s ease,transform .5s ease;">
                <div class="ai-bubble ai-bot"><span data-a-text data-type="En Polanco llevas $148,200 MXN en mano de obra este mes — 12% por debajo de tu presupuesto semanal promedio. La cuadrilla de albañilería es el 54% del gasto." data-speed="14"></span></div>
              </div>
            </div>
            ${FAKE_INPUT}
          </div>
        </div>
      </div>
    </div>
  </div>
</section>

<div class="divider"></div>

<!-- ============ CTA FINAL ============ -->
<section class="cta-final" data-dark style="background:var(--petroleo-700);">
  <div class="wrap" style="text-align:center;position:relative;padding-block:clamp(80px,10vw,130px);">
    <span class="kicker reveal" style="color:var(--bosque-200);">Empieza hoy</span>
    <h2 class="display-xl reveal" style="color:var(--cuero-50);margin-top:16px;">Sin tarjeta.<br /><em style="color:var(--cuero-300);">Sin contrato.</em></h2>
    <p class="lede reveal" style="color:rgba(250,246,239,0.85);margin-top:28px;max-width:560px;margin-left:auto;margin-right:auto;">
      Crea tu cuenta gratis en 60 segundos, agrega tu primera obra y pregúntale a Nomiextra AI hoy mismo. 14 días de prueba, sin límites.
    </p>
    <div class="reveal" style="display:flex;gap:12px;margin-top:38px;flex-wrap:wrap;justify-content:center;">
      <a href="/auth/register" class="btn btn-light btn-lg" data-magnetic="0.4"><span class="btn-label">Probar Nomiextra gratis</span>${ARROW_SVG}</a>
      <a href="mailto:hola@nomiextra.mx" class="btn btn-ghost btn-lg" style="color:var(--cuero-50);border:1px solid rgba(250,246,239,0.3);" data-magnetic="0.25"><span class="btn-label">Agendar demo de 15 min</span></a>
    </div>
  </div>
</section>
`
