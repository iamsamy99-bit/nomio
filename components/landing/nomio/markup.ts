/* Auto-generated from the uploaded design (Landing Nomio.html).
   Server-rendered via dangerouslySetInnerHTML inside the .nomio wrapper;
   interactions are wired by NomioScripts. Edit the design source, not this file by hand. */
export const NOMIO_HTML = `
<!-- ============ HERO ============ -->
<header class="hero" id="top">
  <div class="hero-grid-bg"></div>
  <div class="wrap hero-inner">
    <h1 class="display-hero" data-split>Nómina<br /><em>de obra</em>, sin papeleo.</h1>

    <div class="hero-sub">
      <p class="lede reveal" style="max-width:520px;">
        La app que tu cuadrilla marca en obra y tú cierras desde el celular. Nómina semanal, asistencias offline y cotizaciones con tu logo — más un asistente con IA que entiende tu obra.
      </p>
      <div class="hero-cta reveal" style="flex-direction:column;align-items:flex-start;gap:14px;">
        <div style="display:flex;gap:12px;flex-wrap:wrap;">
          <a href="/auth/register" class="btn btn-primary btn-lg" data-magnetic="0.4"><span class="btn-label">Probar Nomiextra gratis</span>
            <svg class="arrow" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg>
          </a>
          <a href="/nomiextra-ai" class="btn btn-secondary btn-lg" data-magnetic="0.25"><span class="btn-label">Ver Nomiextra AI</span>
            <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor" stroke="none"><polygon points="6 4 20 12 6 20 6 4"></polygon></svg>
          </a>
        </div>
      </div>
    </div>

    <!-- hero photo + drawn blueprint + floating card -->
    <div class="hero-photo img-clip reveal-scale">
      <img src="/atelier/img-skylight.jpg" alt="Tragaluz arquitectónico" data-parallax="0.06" />
      <svg class="draw-svg" viewBox="0 0 1280 600" preserveAspectRatio="none" aria-hidden="true">
        <path class="draw" style="--len:2600;" d="M120 60 L120 540 M120 300 L640 300 M640 60 L640 380 M640 380 L1160 380 M380 300 L380 540" fill="none" stroke="rgba(250,246,239,0.55)" stroke-width="1.2"></path>
        <circle class="draw" style="--len:200;" cx="250" cy="430" r="30" fill="none" stroke="rgba(250,246,239,0.55)" stroke-width="1.2"></circle>
      </svg>
      <div class="float-card" style="top:24px;left:24px;" data-parallax="0.03">
        <div class="mono" style="font-size:10px;letter-spacing:0.1em;color:var(--tinta-500);text-transform:uppercase;">Obra Polanco · Semana 47</div>
        <div style="display:flex;align-items:baseline;gap:6px;margin-top:6px;">
          <span class="serif-num" style="font-size:32px;font-style:normal;color:var(--tinta);" data-count="8750" data-prefix="$">$8,750</span>
          <span class="mono" style="font-size:11px;color:var(--tinta-500);">MXN listos para pagar</span>
        </div>
      </div>
      <div class="float-card" style="bottom:24px;right:24px;display:flex;align-items:center;gap:10px;" data-parallax="0.045">
        <span class="check"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><polyline points="4 12 10 18 20 6"></polyline></svg></span>
        <div>
          <div style="font-size:14px;font-weight:500;color:var(--tinta);">Cuadrilla completa</div>
          <div class="mono" style="font-size:10px;color:var(--tinta-500);">12 asistencias sincronizadas</div>
        </div>
      </div>
    </div>
  </div>
</header>

<!-- ============ METRICS ============ -->
<section class="sec-tight">
  <div class="wrap">
    <div class="metrics" data-stagger>
      <div class="metric">
        <div class="num"><span data-count="3" data-suffix=" hr">3 hr</span></div>
        <div class="lbl">Ahorradas cada semana, por obra, contra cuadrar Excel a mano.</div>
      </div>
      <div class="metric">
        <div class="num"><span class="serif-num" style="font-style:normal;">$0</span><span class="u">mxn</span></div>
        <div class="lbl">Plan gratuito de verdad. Una obra, una cuadrilla, para siempre.</div>
      </div>
      <div class="metric">
        <div class="num"><span data-count="412">412</span></div>
        <div class="lbl">Constructoras y despachos generando nómina con Nomiextra este mes.</div>
      </div>
    </div>
  </div>
</section>

<!-- editorial marquee -->
<div class="strip" aria-hidden="true">
  <div class="strip-track">
    <span class="strip-item">Asistencias</span><span class="strip-item">Nómina semanal</span><span class="strip-item">Cotizaciones</span><span class="strip-item">Anticipos</span><span class="strip-item">Multi-obra</span><span class="strip-item">Nomiextra AI</span>
    <span class="strip-item">Asistencias</span><span class="strip-item">Nómina semanal</span><span class="strip-item">Cotizaciones</span><span class="strip-item">Anticipos</span><span class="strip-item">Multi-obra</span><span class="strip-item">Nomiextra AI</span>
  </div>
</div>

<!-- ============ PRODUCTO header ============ -->
<section class="sec" id="producto">
  <div class="wrap">
    <div class="sec-head reveal">
      <h2 class="display-xl">Una herramienta<br />para <em>cada</em> tarea de obra.</h2>
      <div class="sec-rule" style="margin-top:30px;max-width:240px;"></div>
      <p class="body-lg" style="margin-top:26px;max-width:560px;">
        Lo que pasa en obra el lunes ya está en la nómina del viernes. Sin pasar nada a mano, sin perseguir a nadie por WhatsApp.
      </p>
    </div>
  </div>
</section>

<!-- ============ FEATURE: ASISTENCIAS (semáforo mockup) ============ -->
<section class="sec" style="padding-top:0;">
  <div class="wrap">
    <div class="feat">
      <div class="reveal-l">
        <span class="feat-num">01 — Asistencias</span>
        <h3 class="display-lg" style="margin-top:14px;">Marca el día,<br /><em>en obra</em>.</h3>
        <p class="body-lg" style="margin-top:22px;max-width:480px;">
          Tu maestro de obra usa el teléfono. Marca asistencia con un tap, aunque no haya señal. Cuando vuelve el internet, todo se sincroniza solo.
        </p>
        <div class="feat-list">
          <div class="row"><div class="t">Offline-first</div><div class="body-sm">Funciona sin señal en la obra. Sincroniza cuando puede.</div></div>
          <div class="row"><div class="t">Semáforo semanal</div><div class="body-sm">Verde si vino, ámbar si llegó tarde, rojo si faltó.</div></div>
          <div class="row"><div class="t">Desde el sitio</div><div class="body-sm">Geolocalización opcional: sabes que la marca se hizo en obra.</div></div>
        </div>
        <a href="#" class="link-draw" style="margin-top:30px;">Ver cómo funciona
          <svg class="arrow" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg>
        </a>
      </div>

      <div class="mock-side reveal-r">
        <div class="mock">
          <div class="mock-bar">
            <div>
              <div class="mono" style="font-size:10px;letter-spacing:0.1em;color:var(--tinta-500);text-transform:uppercase;">Asistencias · Semana 47</div>
              <div class="h-section" style="margin-top:4px;">Obra Polanco</div>
            </div>
            <span class="tag tag-bosque">12 en obra</span>
          </div>
          <div class="att-grid" style="margin-top:10px;">
            <div></div>
            <div class="att-head">L</div><div class="att-head">M</div><div class="att-head">M</div><div class="att-head">J</div><div class="att-head">V</div><div class="att-head">S</div>
            <div class="att-name">Manuel S.</div>
            <div class="att-cell ok"></div><div class="att-cell ok"></div><div class="att-cell ok"></div><div class="att-cell ok"></div><div class="att-cell ok"></div><div class="att-cell late"></div>
            <div class="att-name">José R.</div>
            <div class="att-cell ok"></div><div class="att-cell ok"></div><div class="att-cell late"></div><div class="att-cell ok"></div><div class="att-cell ok"></div><div class="att-cell ok"></div>
            <div class="att-name">Carlos M.</div>
            <div class="att-cell ok"></div><div class="att-cell ok"></div><div class="att-cell ok"></div><div class="att-cell ok"></div><div class="att-cell ok"></div><div class="att-cell ok"></div>
            <div class="att-name">Hugo T.</div>
            <div class="att-cell ok"></div><div class="att-cell miss"></div><div class="att-cell ok"></div><div class="att-cell ok"></div><div class="att-cell late"></div><div class="att-cell ok"></div>
            <div class="att-name">Beto L.</div>
            <div class="att-cell ok"></div><div class="att-cell ok"></div><div class="att-cell ok"></div><div class="att-cell ok"></div><div class="att-cell ok"></div><div class="att-cell late"></div>
          </div>
          <div style="display:flex;gap:18px;margin-top:22px;padding-top:18px;border-top:1px solid var(--border);">
            <div style="display:flex;align-items:center;gap:7px;"><span style="width:11px;height:11px;border-radius:3px;background:var(--verde-ok);"></span><span class="body-sm">Asistió</span></div>
            <div style="display:flex;align-items:center;gap:7px;"><span style="width:11px;height:11px;border-radius:3px;background:var(--ambar);"></span><span class="body-sm">Tarde</span></div>
            <div style="display:flex;align-items:center;gap:7px;"><span style="width:11px;height:11px;border-radius:3px;background:var(--rojo-falta);"></span><span class="body-sm">Faltó</span></div>
          </div>
        </div>
      </div>
    </div>
  </div>
</section>

<!-- ============ FEATURE: NÓMINA (payroll mockup) ============ -->
<section class="sec" style="padding-top:0;">
  <div class="wrap">
    <div class="feat rev">
      <div class="mock-side reveal-l">
        <div class="mock" data-bars>
          <div class="mock-bar">
            <div>
              <div class="mono" style="font-size:10px;letter-spacing:0.1em;color:var(--tinta-500);text-transform:uppercase;">Nómina · Semana 47</div>
              <div class="h-section" style="margin-top:4px;">Obra Polanco</div>
            </div>
            <span class="tag tag-bosque">Lista para pagar</span>
          </div>
          <div style="display:flex;flex-direction:column;gap:14px;margin-top:6px;">
            <div>
              <div style="display:flex;justify-content:space-between;font-size:13.5px;margin-bottom:6px;"><span>Manuel S. · Albañil</span><span class="mono" style="font-weight:500;">$2,250</span></div>
              <div class="bar"><i data-w="90%"></i></div>
            </div>
            <div>
              <div style="display:flex;justify-content:space-between;font-size:13.5px;margin-bottom:6px;"><span>José R. · Ayudante</span><span class="mono" style="font-weight:500;">$1,750</span></div>
              <div class="bar"><i data-w="70%"></i></div>
            </div>
            <div>
              <div style="display:flex;justify-content:space-between;font-size:13.5px;margin-bottom:6px;"><span>Carlos M. · Maestro</span><span class="mono" style="font-weight:500;">$2,750</span></div>
              <div class="bar"><i data-w="100%"></i></div>
            </div>
            <div>
              <div style="display:flex;justify-content:space-between;font-size:13.5px;margin-bottom:6px;"><span>Hugo T. · Eléctrico</span><span class="mono" style="font-weight:500;">$2,000</span></div>
              <div class="bar"><i data-w="80%"></i></div>
            </div>
          </div>
          <div style="display:flex;justify-content:space-between;align-items:baseline;margin-top:24px;padding-top:18px;border-top:1px solid var(--border-strong);">
            <span class="mono" style="font-size:10px;letter-spacing:0.08em;color:var(--tinta-500);text-transform:uppercase;">Total a pagar</span>
            <span class="serif-num" style="font-style:normal;font-size:38px;color:var(--tinta);"><span data-count="8750" data-prefix="$">$8,750</span><span class="mono" style="font-size:12px;color:var(--tinta-500);margin-left:6px;">MXN</span></span>
          </div>
          <a href="/auth/register" class="btn btn-primary" style="width:100%;justify-content:center;margin-top:18px;"><span class="btn-label">Generar PDF y SPEI</span>
            <svg class="arrow" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg>
          </a>
        </div>
      </div>

      <div class="reveal-r" style="padding-left:8px;">
        <span class="feat-num">02 — Nómina</span>
        <h3 class="display-lg" style="margin-top:14px;">El <em>viernes</em>,<br />un solo botón.</h3>
        <p class="body-lg" style="margin-top:22px;max-width:480px;">
          Por día, por hora, salario fijo o mixto. Nomiextra suma las asistencias, descuenta anticipos y deja la nómina lista para pagar por SPEI.
        </p>
        <div style="display:flex;gap:40px;margin-top:34px;">
          <div>
            <div class="serif-num" style="font-style:normal;font-size:52px;color:var(--tinta);line-height:1;">3<span style="font-style:italic;font-weight:300;font-size:0.5em;color:var(--bosque-400);">min</span></div>
            <div class="body-sm" style="margin-top:8px;max-width:160px;">Para generar la nómina de la semana completa.</div>
          </div>
          <div>
            <div class="serif-num" style="font-style:normal;font-size:52px;color:var(--tinta);line-height:1;">0</div>
            <div class="body-sm" style="margin-top:8px;max-width:160px;">Hojas de cálculo que vuelves a tocar.</div>
          </div>
        </div>
      </div>
    </div>
  </div>
</section>

<!-- ============ NOMIO AI ============ -->
<section class="sec" id="nomio-ai" data-dark style="padding-bottom:clamp(60px,8vw,110px);">
  <div class="wrap">
    <div class="ai-wrap" style="padding:clamp(40px,5vw,72px);">
      <div class="ai-grid-bg"></div>
      <div style="position:relative;display:grid;grid-template-columns:1fr 1.05fr;gap:clamp(40px,5vw,72px);align-items:center;">
        <div class="reveal-l">
          <span class="kicker" style="color:var(--bosque-200);">Nomiextra AI</span>
          <h2 class="display-xl" style="color:var(--cuero-50);margin-top:16px;">Pregúntale<br />a tu <em style="color:var(--cuero-300);">obra</em>.</h2>
          <p class="body-lg" style="color:rgba(250,246,239,0.78);margin-top:24px;max-width:460px;">
            Escribe como hablas. Nomiextra AI lee tus asistencias, nóminas y cotizaciones y te responde en segundos — sin reportes, sin fórmulas, sin abrir nada.
          </p>
          <div style="display:flex;flex-wrap:wrap;gap:10px;margin-top:32px;">
            <button class="chip" data-chip-q="¿Cuánto llevo gastado en la obra de Polanco este mes?" data-chip-a="En Polanco llevas $148,200 MXN en mano de obra este mes — 12% por debajo de tu presupuesto semanal promedio. La cuadrilla de albañilería es el 54% del gasto.">Gasto del mes</button>
            <button class="chip" data-chip-q="¿Quién faltó más esta semana?" data-chip-a="Hugo T. fue quien más faltó: 1 falta y 1 retardo esta semana. El resto de la cuadrilla tuvo asistencia completa. ¿Le aplico el descuento en la nómina del viernes?">Faltas de la semana</button>
            <button class="chip" data-chip-q="Hazme una cotización para 80 m² de loseta" data-chip-a="Listo. Generé una cotización por $54,400 MXN: 80 m² de loseta, material y mano de obra, IVA incluido, con tu logo y firma. ¿La envío por WhatsApp al cliente?">Crear cotización</button>
          </div>
        </div>

        <div class="reveal-r">
          <div class="mock" data-chat style="background:rgba(250,246,239,0.04);border:1px solid rgba(250,246,239,0.12);box-shadow:none;backdrop-filter:blur(4px);">
            <div style="display:flex;align-items:center;gap:10px;margin-bottom:20px;padding-bottom:16px;border-bottom:1px solid rgba(250,246,239,0.1);">
              <span style="width:30px;height:30px;border-radius:8px;background:var(--bosque-500);display:flex;align-items:center;justify-content:center;">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#FAF6EF" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3l1.5 5.5L19 10l-5.5 1.5L12 17l-1.5-5.5L5 10l5.5-1.5L12 3z"></path></svg>
              </span>
              <span style="font-family:var(--font-display);font-size:17px;color:var(--cuero-50);">Nomiextra AI</span>
            </div>
            <div style="display:flex;flex-direction:column;gap:14px;min-height:230px;">
              <div class="ai-line" style="display:flex;justify-content:flex-end;opacity:0;transform:translateY(12px);transition:opacity .5s ease,transform .5s ease;">
                <div class="ai-bubble ai-user"><span data-q-text data-type="¿Cuánto llevo gastado en la obra de Polanco este mes?" data-speed="22"></span></div>
              </div>
              <div class="ai-line" style="display:flex;justify-content:flex-start;opacity:0;transform:translateY(12px);transition:opacity .5s ease,transform .5s ease;">
                <div class="ai-bubble ai-bot"><span data-a-text data-type="En Polanco llevas $148,200 MXN en mano de obra este mes — 12% por debajo de tu presupuesto semanal promedio. La cuadrilla de albañilería es el 54% del gasto." data-speed="14"></span></div>
              </div>
            </div>
            <div style="display:flex;align-items:center;gap:10px;margin-top:18px;padding:12px 16px;border-radius:999px;background:rgba(250,246,239,0.06);border:1px solid rgba(250,246,239,0.1);">
              <span class="mono" style="font-size:12px;color:rgba(250,246,239,0.45);flex:1;">Pregúntale algo a tu obra…</span>
              <span style="width:30px;height:30px;border-radius:50%;background:var(--bosque-500);display:flex;align-items:center;justify-content:center;">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#FAF6EF" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>
              </span>
            </div>
            <p class="mono" style="font-size:10px;color:rgba(250,246,239,0.35);margin-top:12px;text-align:center;letter-spacing:0.05em;">↑ Toca una sugerencia para probar otra pregunta</p>
          </div>
        </div>
      </div>
    </div>
  </div>
</section>

<div class="divider"></div>

<!-- ============ FEATURE TRIO ============ -->
<section class="sec">
  <div class="wrap">
    <div class="sec-head reveal" style="margin-bottom:48px;">
      <h2 class="display-lg">Y todo lo demás<br />que vive en la obra.</h2>
    </div>
    <div class="trio" style="display:grid;grid-template-columns:repeat(3,1fr);gap:18px;" data-stagger>
      <div class="card card-hover" data-cursor>
        <div class="card-img"><img src="/atelier/img-architect-blueprints.jpg" alt="Cotizaciones" /></div>
        <div style="padding:26px;">
          <span class="feat-num">03 — Cotizaciones</span>
          <h4 class="h-section" style="margin-top:8px;">PDF con tu firma.</h4>
          <p class="body-sm" style="margin-top:10px;">Plantilla con tu logo, IVA, descuento y partidas. Envías por WhatsApp en un tap.</p>
        </div>
      </div>
      <div class="card card-hover" data-cursor>
        <div class="card-img"><img src="/atelier/img-workers.jpg" alt="Anticipos" /></div>
        <div style="padding:26px;">
          <span class="feat-num">04 — Anticipos</span>
          <h4 class="h-section" style="margin-top:8px;">Préstamos al maestro.</h4>
          <p class="body-sm" style="margin-top:10px;">Le adelantas a tu gente y Nomiextra descuenta solo en la siguiente nómina.</p>
        </div>
      </div>
      <div class="card card-hover" data-cursor>
        <div class="card-img"><img src="/atelier/img-construction-team.jpg" alt="Multi-obra" /></div>
        <div style="padding:26px;">
          <span class="feat-num">05 — Multi-obra</span>
          <h4 class="h-section" style="margin-top:8px;">Cada obra, su raya.</h4>
          <p class="body-sm" style="margin-top:10px;">Cuadrillas por obra, costos separados y reportes por proyecto.</p>
        </div>
      </div>
    </div>
  </div>
</section>

<!-- ============ TESTIMONIAL ============ -->
<section id="historia" style="background:var(--cuero-200);">
  <div style="display:grid;grid-template-columns:1fr 1fr;align-items:stretch;">
    <div style="padding:clamp(56px,7vw,110px) var(--gut);display:flex;flex-direction:column;justify-content:center;" class="reveal-l">
      <span class="kicker">Una voz desde la obra</span>
      <p class="display-md" style="margin-top:26px;font-weight:300;line-height:1.2;max-width:560px;">
        “Antes pasaba el sábado en Excel cuadrando los días de cada cuadrilla. Con Nomiextra cierro la nómina el viernes a la 1 y me voy con mi hija al parque.”
      </p>
      <div style="margin-top:38px;display:flex;align-items:center;gap:16px;">
        <div style="width:52px;height:52px;border-radius:50%;overflow:hidden;flex-shrink:0;"><img src="/atelier/img-construction-team.jpg" alt="Arq. Daniela Reyes" style="width:100%;height:100%;object-fit:cover;" /></div>
        <div>
          <div style="font-family:var(--font-display);font-size:17px;font-weight:500;">Arq. Daniela Reyes</div>
          <div class="body-sm">Reyes &amp; Asociados · Guadalajara · 3 obras activas</div>
        </div>
      </div>
    </div>
    <div class="img-clip" style="border-radius:0;min-height:480px;position:relative;overflow:hidden;">
      <img src="/atelier/img-scaffolding.jpg" alt="Obra" style="width:100%;height:112%;object-fit:cover;" data-parallax="0.05" />
    </div>
  </div>
</section>

<!-- ============ PRICING ============ -->
<section class="sec" id="precios">
  <div class="wrap">
    <div style="display:flex;justify-content:space-between;align-items:flex-end;gap:40px;flex-wrap:wrap;margin-bottom:52px;" class="reveal">
      <div class="sec-head" style="margin:0;">
        <h2 class="display-xl">Honesto.<br />Como un <em>presupuesto</em>.</h2>
        <div class="sec-rule" style="margin-top:26px;max-width:200px;"></div>
      </div>
      <p class="body-lg" style="max-width:360px;">Empieza gratis. Crece cuando crezca tu obra. Cancelas con un correo, cuando quieras.</p>
    </div>

    <div class="price-grid" data-stagger>
      <div class="price-card price-free">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;">
          <div>
            <span class="kicker" style="color:var(--tinta-500);">Plan Gratuito</span>
            <div class="price-amt" style="margin-top:14px;">$0<span class="mono" style="font-size:14px;color:var(--tinta-500);margin-left:8px;">MXN / mes</span></div>
          </div>
          <span class="tag tag-outline">Para empezar</span>
        </div>
        <p class="body-md" style="margin-top:14px;">Para una obra chica, una cuadrilla. Para siempre.</p>
        <ul class="plist" style="margin-top:28px;">
          <li><span class="check"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><polyline points="4 12 10 18 20 6"></polyline></svg></span>Hasta 5 trabajadores</li>
          <li><span class="check"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><polyline points="4 12 10 18 20 6"></polyline></svg></span>1 obra activa</li>
          <li><span class="check"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><polyline points="4 12 10 18 20 6"></polyline></svg></span>10 cotizaciones / mes</li>
          <li><span class="check"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><polyline points="4 12 10 18 20 6"></polyline></svg></span>Asistencias offline</li>
          <li><span class="check"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><polyline points="4 12 10 18 20 6"></polyline></svg></span>5 preguntas / día a Nomiextra AI</li>
        </ul>
        <a href="/auth/register" class="btn btn-secondary btn-lg" style="width:100%;justify-content:center;margin-top:32px;" data-magnetic="0.2"><span class="btn-label">Crear cuenta gratis</span></a>
      </div>

      <div class="price-card price-pyme" data-dark>
        <div class="pgrid"></div>
        <div style="position:relative;">
          <div style="display:flex;justify-content:space-between;align-items:flex-start;">
            <div>
              <span class="kicker" style="color:rgba(250,246,239,0.55);">Plan PYME</span>
              <div class="price-amt" style="margin-top:14px;color:var(--cuero-50);">$299<span class="mono" style="font-size:14px;color:rgba(250,246,239,0.55);margin-left:8px;">MXN / mes</span></div>
            </div>
            <span class="tag" style="background:var(--bosque-500);color:var(--cuero-50);">Recomendado</span>
          </div>
          <p class="body-md" style="margin-top:14px;color:rgba(250,246,239,0.78);">Todo sin límites, Nomiextra AI completo. 14 días de prueba sin tarjeta.</p>
          <ul class="plist" style="margin-top:28px;">
            <li style="color:rgba(250,246,239,0.92);"><span class="check"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><polyline points="4 12 10 18 20 6"></polyline></svg></span>Trabajadores y obras ilimitados</li>
            <li style="color:rgba(250,246,239,0.92);"><span class="check"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><polyline points="4 12 10 18 20 6"></polyline></svg></span>Cotizaciones ilimitadas</li>
            <li style="color:rgba(250,246,239,0.92);"><span class="check"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><polyline points="4 12 10 18 20 6"></polyline></svg></span>Anticipos y préstamos</li>
            <li style="color:rgba(250,246,239,0.92);"><span class="check"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><polyline points="4 12 10 18 20 6"></polyline></svg></span>Nomiextra AI sin límite</li>
            <li style="color:rgba(250,246,239,0.92);"><span class="check"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><polyline points="4 12 10 18 20 6"></polyline></svg></span>Soporte por WhatsApp</li>
          </ul>
          <a href="/auth/register" class="btn btn-light btn-lg" style="width:100%;justify-content:center;margin-top:32px;" data-magnetic="0.3"><span class="btn-label">Empezar prueba de 14 días</span>
            <svg class="arrow" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg>
          </a>
        </div>
      </div>
    </div>
  </div>
</section>

<!-- ============ FINAL CTA ============ -->
<section class="cta-final" data-dark>
  <img class="bg" src="/atelier/img-construction-site.jpg" alt="" data-parallax="0.07" />
  <div class="veil"></div>
  <div class="wrap" style="position:relative;color:var(--cuero-50);padding-block:clamp(80px,10vw,130px);">
    <h2 class="display-hero" style="color:var(--cuero-50);" data-split>La <em style="color:var(--cuero-200);">obra</em> espera.<br />Nomiextra, no.</h2>
    <p class="lede reveal" style="color:rgba(250,246,239,0.85);margin-top:28px;max-width:560px;">
      Crea tu cuenta gratis en 60 segundos, agrega tu primera obra y prueba Nomiextra AI hoy mismo. Sin tarjeta, sin contrato.
    </p>
    <div class="reveal" style="display:flex;gap:12px;margin-top:38px;flex-wrap:wrap;">
      <a href="/auth/register" class="btn btn-light btn-lg" data-magnetic="0.4"><span class="btn-label">Probar Nomiextra gratis</span>
        <svg class="arrow" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg>
      </a>
      <a href="mailto:hola@nomio.mx" class="btn btn-ghost btn-lg" style="color:var(--cuero-50);border:1px solid rgba(250,246,239,0.3);" data-magnetic="0.25"><span class="btn-label">Agendar demo de 15 min</span></a>
    </div>
  </div>
</section>
`
