# Nomio — Propuesta de Rediseño V2
**Nivel: Spotify / Apple / Google**
Fecha: 2026-05-24 | Autor: Design System AI (ui-ux-pro-max)

---

## 1. Filosofía de Diseño

### El Problema con V1
El diseño actual es funcional pero genérico — podría ser cualquier SaaS. Le falta **identidad**.
Nomio no es una app de tecnología. Es una herramienta para **constructores mexicanos** — gente que
trabaja en obra, que suda concreto, que mide en metros y paga por día. El diseño debe hablarle a
ese mundo.

### La Visión: "Despacho de Arquitectura Digital"
Piensa en cómo se ven los portfolios de **Zaha Hadid Architects**, **Foster + Partners** o
**FRIDA Escobedo** — dramáticos, precisos, con mucho espacio y tipografía que manda. Ese mismo
nivel de sofisticación aplicado a un dashboard SaaS. Referentes directos:

| Referente | Qué tomamos |
|-----------|-------------|
| **Spotify** | Gradientes oscuros, tarjetas con imagen, bold typography, sidebar con hover suave |
| **Apple** | Whitespace extremo, animaciones físicas (spring), producto como protagonista |
| **Linear.app** | Dashboard ultra-limpio, shortcuts visibles, data density sin ruido |
| **Are.na** | Estética editorial, sin florituras, contenido como diseño |
| **Notion** | Jerarquía tipográfica precisa, modularidad |

### Principios
1. **Arquitectónico, no tecnológico** — Concreto, piedra, acero cepillado. No gradientes de AI.
2. **Silencio antes que ruido** — Cada elemento justifica su espacio. Si no comunica, no existe.
3. **Datos como material** — Las tablas y cifras son el "material" de construcción de la UI.
4. **Movimiento con propósito** — Las animaciones revelan estructura, no decoran.
5. **Dual mode como decisión, no como feature** — Light y dark son dos experiencias distintas,
   no el mismo diseño invertido.

---

## 2. Sistema de Color

### Paleta Principal — "Obra"

```
╔══════════════════════════════════════════════════════════════╗
║  LIGHT MODE — "Concreto al Sol"                              ║
╠══════════════════════════════════════════════════════════════╣
║  Concrete White   #F5F4F0   bg-[#F5F4F0]   Fondo principal  ║
║  Warm Stone       #EAE7E0   bg-[#EAE7E0]   Fondo secundario ║
║  Travertine       #D6D0C4   bg-[#D6D0C4]   Bordes, dividers ║
║  Slate            #64748B   text-slate-500  Labels, meta     ║
║  Charcoal         #1C1917   text-[#1C1917]  Texto principal  ║
║  Iron             #292524   text-[#292524]  Headings         ║
╠══════════════════════════════════════════════════════════════╣
║  DARK MODE — "Obra de Noche"                                 ║
╠══════════════════════════════════════════════════════════════╣
║  Void             #0C0A09   bg-[#0C0A09]   Fondo OLED       ║
║  Iron             #1C1917   bg-[#1C1917]   Cards primarias  ║
║  Steel            #292524   bg-[#292524]   Cards elevadas   ║
║  Burnished        #44403C   bg-[#44403C]   Borders/dividers ║
║  Ash              #78716C   text-[#78716C]  Labels, meta    ║
║  Warm White       #FAF9F6   text-[#FAF9F6]  Texto principal ║
╚══════════════════════════════════════════════════════════════╝
```

### Colores de Acento

```
Verde Nomio      #16A34A   →  CTAs, éxito, estados activos (marca)
Verde Oscuro     #14532D   →  Hover de CTAs en dark mode
Cobre            #C2410C   →  Alertas importantes, acciones destructivas
Ámbar            #B45309   →  Advertencias, pendientes
Azul Plano       #1D4ED8   →  Links, información
```

### Tokens CSS (tailwind.config.js + globals.css)

```css
:root {
  /* Superficies */
  --surface-0: #F5F4F0;   /* página */
  --surface-1: #EAE7E0;   /* card base */
  --surface-2: #D6D0C4;   /* card elevada */
  --surface-border: #D6D0C4;

  /* Texto */
  --text-primary: #1C1917;
  --text-secondary: #44403C;
  --text-muted: #78716C;

  /* Acento */
  --accent: #16A34A;
  --accent-hover: #15803D;
  --accent-muted: #DCFCE7;
  --alert-copper: #C2410C;
  --alert-amber: #B45309;
}

.dark {
  --surface-0: #0C0A09;
  --surface-1: #1C1917;
  --surface-2: #292524;
  --surface-border: #44403C;
  --text-primary: #FAF9F6;
  --text-secondary: #D6D0C4;
  --text-muted: #78716C;
  --accent-muted: #14532D;
}
```

### Gradientes Arquitectónicos

```css
/* Landing hero — piedra cálida */
.gradient-hero-light {
  background: linear-gradient(135deg, #F5F4F0 0%, #EAE7E0 40%, #D6D0C4 100%);
}
.gradient-hero-dark {
  background: linear-gradient(135deg, #0C0A09 0%, #1C1917 50%, #292524 100%);
}

/* Cards con profundidad */
.gradient-card-dark {
  background: linear-gradient(145deg, rgba(28,25,23,0.9) 0%, rgba(41,37,36,0.6) 100%);
  backdrop-filter: blur(12px);
}

/* Acento verde sobre oscuro (tipo Spotify) */
.gradient-accent-dark {
  background: linear-gradient(135deg, #166534 0%, #16A34A 60%, #4ADE80 100%);
}

/* Sidebar gradiente vertical */
.gradient-sidebar {
  background: linear-gradient(180deg, #0C0A09 0%, #1C1917 60%, #1C1917 100%);
  border-right: 1px solid #292524;
}
```

---

## 3. Tipografía

### Stack Tipográfico

| Rol | Fuente | Peso | Uso |
|-----|--------|------|-----|
| **Display** | Cormorant | 700–900 | Hero titles, secciones de impacto |
| **Heading** | Josefin Sans | 600–700 | H2, H3, sidebar nav, cards titles |
| **Body** | Inter | 400–500 | Texto general, descripciones |
| **Data** | JetBrains Mono | 400–600 | Cifras en tablas, montos, números |
| **Label** | Josefin Sans | 400 light | Etiquetas, metadatos, nav items |

### Escala Tipográfica

```css
/* Display — para hero sections */
.text-display {
  font-family: 'Cormorant', serif;
  font-size: clamp(3.5rem, 8vw, 9rem);
  font-weight: 700;
  letter-spacing: -0.04em;
  line-height: 0.95;
}

/* H1 — page titles */
.text-h1 {
  font-family: 'Josefin Sans', sans-serif;
  font-size: clamp(2rem, 4vw, 3.5rem);
  font-weight: 700;
  letter-spacing: -0.025em;
  line-height: 1.1;
}

/* H2 — section headings */
.text-h2 {
  font-family: 'Josefin Sans', sans-serif;
  font-size: clamp(1.4rem, 2.5vw, 2rem);
  font-weight: 600;
  letter-spacing: -0.015em;
}

/* Body */
.text-body {
  font-family: 'Inter', sans-serif;
  font-size: 1rem;
  font-weight: 400;
  line-height: 1.65;
  letter-spacing: -0.01em;
}

/* Data / cifras */
.text-data {
  font-family: 'JetBrains Mono', monospace;
  font-size: 0.9rem;
  font-weight: 500;
  letter-spacing: 0.02em;
}
```

### Import en layout.tsx

```tsx
import { Josefin_Sans, Inter, Cormorant, JetBrains_Mono } from 'next/font/google'

const josefin = Josefin_Sans({
  subsets: ['latin'],
  weight: ['300', '400', '600', '700'],
  variable: '--font-josefin',
})
const inter = Inter({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-inter',
})
const cormorant = Cormorant({
  subsets: ['latin'],
  weight: ['400', '600', '700'],
  variable: '--font-cormorant',
})
const mono = JetBrains_Mono({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-mono',
})
```

---

## 4. Sistema de Animación

### Principios de Movimiento

**Regla de oro:** Las animaciones revelan *estructura*, no decoran. Un elemento que entra desde
abajo dice "vengo de abajo en la jerarquía". Un elemento que se expande dice "tengo contenido
interno". Nunca animar por animar.

### Curvas de Easing (Tipo Apple)

```css
/* Entradas — inician rápido, frenan suave */
--ease-enter: cubic-bezier(0.22, 0.61, 0.36, 1);

/* Salidas — inician suave, aceleran */
--ease-exit: cubic-bezier(0.55, 0.06, 0.68, 0.19);

/* Spring — sensación física, rebote leve */
--ease-spring: cubic-bezier(0.34, 1.56, 0.64, 1);

/* Datos — sin rebote, solo precisión */
--ease-data: cubic-bezier(0.25, 0.46, 0.45, 0.94);
```

### Catálogo de Animaciones

```css
/* 1. Reveal en scroll (landing) */
@keyframes revealUp {
  from { opacity: 0; transform: translateY(24px); }
  to   { opacity: 1; transform: translateY(0); }
}
.reveal-up {
  animation: revealUp 500ms var(--ease-enter) forwards;
  opacity: 0;
}

/* 2. Fade lateral (panels, modals) */
@keyframes slideInRight {
  from { opacity: 0; transform: translateX(20px); }
  to   { opacity: 1; transform: translateX(0); }
}

/* 3. Contador de números (KPIs) */
@keyframes countUp {
  from { opacity: 0; transform: translateY(8px) scale(0.95); }
  to   { opacity: 1; transform: translateY(0) scale(1); }
}

/* 4. Shimmer de carga (skeleton) */
@keyframes shimmer {
  from { background-position: -200% 0; }
  to   { background-position: 200% 0; }
}
.skeleton {
  background: linear-gradient(
    90deg,
    var(--surface-1) 25%,
    var(--surface-2) 50%,
    var(--surface-1) 75%
  );
  background-size: 200% 100%;
  animation: shimmer 1.5s ease infinite;
}

/* 5. Badge pop (notificaciones) */
@keyframes badgePop {
  0%   { transform: scale(0.7); }
  60%  { transform: scale(1.2); }
  100% { transform: scale(1); }
}

/* 6. Hover card lift */
.card-interactive {
  transition: transform 150ms var(--ease-enter),
              box-shadow 150ms var(--ease-enter);
}
.card-interactive:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 32px rgba(0,0,0,0.12);
}

/* Reducción de movimiento — OBLIGATORIO */
@media (prefers-reduced-motion: reduce) {
  *, ::before, ::after {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}
```

### Timing por Tipo de Elemento

| Tipo | Duración | Curva | Notas |
|------|----------|-------|-------|
| Micro (hover, focus) | 120–150ms | ease-enter | Botones, links |
| Componente (modal, dropdown) | 200–250ms | ease-enter / exit | Entrando/saliendo |
| Página (route transition) | 300ms | ease-enter | Fade + scale |
| Hero reveal (landing) | 500–600ms | ease-enter | Con stagger |
| Contadores numéricos | 800ms | ease-data | On scroll-into-view |

---

## 5. Componentes — Especificaciones de Rediseño

### 5.1 Navbar / Top Header

**Concepto:** Flotante, con blur en scroll, logo + wordmark arquitectónico.

```
┌─────────────────────────────────────────────────────────────┐
│  [N]  NOMIO        Funciones  Precios  Roadmap    [Entrar ▶] │
└─────────────────────────────────────────────────────────────┘
```

- Estado inicial: transparente, texto sobre hero
- Al hacer scroll 50px: `backdrop-blur-md bg-[#F5F4F0]/80 dark:bg-[#0C0A09]/80`
- Borde inferior: `border-b border-[#D6D0C4]/60` solo al hacer scroll
- Logo: lettermark "N" geométrico (sans-serif bold), no emoji ni icono genérico
- CTA Navbar: pill verde `bg-[#16A34A] text-white px-5 py-2 rounded-full`
- Transición de estado: 300ms ease-enter

### 5.2 Hero Section (Landing)

**Concepto:** Split layout. Izquierda = manifiesto tipográfico. Derecha = producto real.

```
┌─────────────────────────────────┬──────────────────────────┐
│                                 │                          │
│  Tu nómina,                     │   [Screenshot dashboard] │
│  lista antes                    │   [en mockup de MacBook] │
│  de salir                       │                          │
│  de la obra.                    │   Floating badge:        │
│                                 │   "Generada en 3 min"   │
│  [Comenzar gratis ▶]            │                          │
│  [Ver demo →]                   │                          │
│                                 │                          │
└─────────────────────────────────┴──────────────────────────┘
```

- Tipografía display: `Cormorant` 700, 7vw, kerning -0.04em
- "Tu nómina" en `text-[#1C1917]` / dark: `text-[#FAF9F6]`
- "lista antes de salir de la obra." — la última frase en verde `#16A34A`
- Fondo: textura concreto sutil `opacity-5` sobre `#F5F4F0`
- Animación hero: palabras entran con stagger 80ms cada una, `revealUp` 500ms
- Screenshot mockup: `drop-shadow-2xl` + leve rotación `rotate-1` + hover `rotate-0`

### 5.3 Sidebar Dashboard

**Concepto:** Colapsable. Dos estados: 64px (iconos) / 240px (completo).

```
Estado colapsado (64px)          Estado expandido (240px)
┌──────────┐                     ┌─────────────────────────┐
│    N     │                     │  [N]  Nomio             │
│ ─────── │                     │ ─────────────────────── │
│   [🏠]   │                     │  Inicio                 │
│   [📋]   │                     │  Nóminas                │
│   [👥]   │                     │  Trabajadores           │
│   [📊]   │                     │  Proyectos              │
│   [💬]   │                     │  Cotizaciones           │
│          │                     │  Red de Obra            │
│   [⚙️]   │                     │  Configuración          │
└──────────┘                     └─────────────────────────┘
```

- Fondo: `gradient-sidebar` (ver tokens)
- Item activo: borde izquierdo `border-l-2 border-[#16A34A]` + `bg-[#16A34A]/10`
- Item hover: `bg-[#292524]` 150ms ease
- Iconos: Lucide React, 20px, `text-[#78716C]` → activo `text-[#16A34A]`
- Transición expandir/colapsar: 250ms ease-spring en width + opacity de labels
- Tooltip en estado colapsado: aparece a la derecha del icono, 150ms delay

### 5.4 Cards de KPI / Dashboard

**Concepto:** Arquitectónicas — como samples de materiales en un despacho.

```
┌──────────────────────────────────────────┐
│  [icono]  NÓMINAS ESTE MES               │
│                                          │
│  $248,500                MXN             │
│  ────────────────────────────            │
│  +12% vs mes anterior  ↑                 │
└──────────────────────────────────────────┘
```

- Fondo: `gradient-card-dark` en dark / `bg-white` con `shadow-sm` en light
- Borde: `border border-[--surface-border]`
- Número KPI: `JetBrains Mono` 2.5rem 600, animación `countUp` al entrar en viewport
- Trend indicator: verde si positivo `text-[#16A34A]`, cobre si negativo `text-[#C2410C]`
- Hover: `card-interactive` lift -2px
- Radio: `rounded-2xl` (16px) — arquitectónico pero no infantil

### 5.5 Tablas de Datos

**Concepto:** Como un plano arquitectónico — líneas precisas, sin ruido.

- Header: `bg-[--surface-1]`, `Josefin Sans` 400, `text-[--text-muted]`, uppercase tracking
- Fila: zebra sutil `even:bg-[--surface-0] odd:bg-transparent`
- Fila hover: `hover:bg-[--accent-muted]` con transición 100ms
- Números: `JetBrains Mono`, right-aligned
- Borde: solo horizontal `border-b border-[--surface-border]`, nunca vertical
- Bordes externos: `rounded-xl` en el wrapper

### 5.6 Botones

```
Variante    Uso                    Estilo
─────────────────────────────────────────────────────
Primary     CTA principal          bg-[#16A34A] text-white rounded-full px-6 py-3
Secondary   Acciones secundarias   border border-[#16A34A] text-[#16A34A] rounded-full
Ghost       Terciario / cancel     text-[--text-secondary] hover:bg-[--surface-1]
Danger      Destructivo            bg-[#C2410C] text-white rounded-full
```

- Todos: `transition-all duration-150 ease-out cursor-pointer`
- Focus: `ring-2 ring-[#16A34A] ring-offset-2`
- Loading: spinner izquierda + texto cambia a "..."
- Hover primary: `bg-[#15803D]` + sombra `shadow-md shadow-green-900/30`

### 5.7 Notificaciones / Toast

```
┌──────────────────────────────────────────┐
│  ● Nómina generada · $248,500            │ ← verde
│  ● Anticipo pendiente · Juan L.          │ ← cobre
│  ● Cotización vence en 2 días            │ ← ámbar
└──────────────────────────────────────────┘
```

- Posición: bottom-right, stacked max 3
- Entrada: `slideInRight` 250ms ease-enter
- Salida: `opacity-0 translateX(16px)` 200ms ease-exit
- Auto-dismiss: 5s para info, 0 (manual) para errores
- Colores: dot de color según tipo, fondo `bg-[#1C1917]` siempre (dark-first)

### 5.8 Modales y Drawers

- Overlay: `bg-black/60 backdrop-blur-sm`
- Modal centrado: entry `scale(0.96) opacity(0)` → `scale(1) opacity(1)` 250ms ease-spring
- Drawer lateral (detalle trabajador, detalles nomina): entra desde la derecha 300ms
- `rounded-2xl` para modales, `rounded-l-2xl` para drawers
- Sombra: `shadow-2xl shadow-black/40`

---

## 6. Rediseño Landing Page — Sección por Sección

### Estructura Recomendada

```
1. NAVBAR (flotante, scroll-aware)
2. HERO (split: copy + mockup)
3. STRIP DE NÚMEROS (stats animados: "2,400+ trabajadores", "98% satisfacción")
4. BENTO FEATURES (grid Apple-style, 6 features principales)
5. HOW IT WORKS (timeline con iconografía de construcción)
6. TESTIMONIOS (cards con foto, empresa, ubicacion)
7. PRICING (3 planes, highlight en Pymes)
8. CTA FINAL (fullwidth oscuro, fondo concreto, texto grande)
9. FOOTER (minimal, cálido)
```

### Bento Grid de Features (Sección 4)

```
┌─────────────────┬──────────┬──────────┐
│                 │          │          │
│  Nóminas        │ Asist.   │ Excel    │
│  Flexibles      │ Offline  │ Import   │
│  (grande)       │ (med)    │ (small)  │
│                 │          │          │
├─────────────────┴──────────┤          │
│                            │          │
│  IA Cuantificadora         │          │
│  (ancho medio)             │          │
│                            ├──────────┤
├────────────┬───────────────┤          │
│            │               │  CRM     │
│  Proyectos │ Cotizaciones  │  Obra    │
│  (small)   │ (med)         │          │
└────────────┴───────────────┴──────────┘
```

- Cards con screenshot real del producto (no iconos)
- Hover en cada card: scale(1.02) + bordes verdes
- Cards alternados: oscuros y claros para crear ritmo visual
- La card de "IA" tiene animación especial: texto generándose

### Paleta Landing Light Mode

La landing usa light mode por defecto (mejor conversión) con el nuevo tono cálido:
- Hero bg: `#F5F4F0` (concreto cálido)
- Strip de números: `#1C1917` (oscuro, contrasta)
- Bento: alternado `#FFFFFF` y `#F5F4F0`
- CTA final: `#1C1917` con textura concreto y acento `#16A34A`

---

## 7. Rediseño Dashboard — Pantalla por Pantalla

### 7.1 Home / Resumen

**Above the fold (primera vista sin scroll):**
```
┌─ Sidebar (240px) ─┬─────────────────────────────────────────┐
│                   │  Buenos días, Ana     [Bell] [Avatar] │
│  N  Nomio         │  Lunes 24 Mayo · Semana 21              │
│ ───────────────── │ ─────────────────────────────────────── │
│  > Inicio         │                                         │
│  Nóminas          │  [KPI: Nóminas]  [KPI: Trabajadores]   │
│  Asistencias      │  [KPI: Proyectos] [KPI: Pendientes]    │
│  Trabajadores     │                                         │
│  Proyectos        │  ── Actividad reciente ──               │
│  Cotizaciones     │  [Timeline de últimas acciones]         │
│  Red de Obra      │                                         │
│  Recordatorios    │  ── Alertas ──                          │
│ ───────────────── │  [Recordatorios hoy]                    │
│  Configuración    │                                         │
└───────────────────┴─────────────────────────────────────────┘
```

- Greeting con hora del día
- KPIs: 4 cards con `countUp` animation al cargar
- Widget de alertas: colores por urgencia
- Gráfica de nóminas: sparkline con datos de 3 meses

### 7.2 Nóminas (lista)

- Header con breadcrumb + `[+ Nueva Nómina]` CTA verde
- Tabla con estado visual: badges tipo "plano arquitectónico" (bordes, no relleno)
  - En Progreso: `border border-amber-600 text-amber-600`
  - Generada: `border border-blue-600 text-blue-600`
  - Pagada: `border border-green-600 text-green-600`
- Click en fila abre drawer lateral con detalle (no nueva página)

### 7.3 Wizard de Nómina

- Steps visualizados como "planta arquitectónica": línea horizontal con nodos
- Cada step tiene una animación de entrada diferente (no todos igual)
- Step activo: nodo lleno verde, steps completados: check verde, futuros: círculo vacío
- El canvas del step ocupa el 100% con mucho espacio — no se siente apretado

### 7.4 Trabajadores

- Lista en cards con avatar inicial + datos clave (no tabla densa)
- Click → drawer lateral con historial de pagos integrado
- Filtros: por proyecto, modalidad, activo/inactivo — chips horizontales bajo el header
- Empty state: ilustración "plano de obra" con línea de acción

### 7.5 Cotizaciones

- Lista en cards tipo "portafolio de proyectos" con thumbnail de estado
- Vista detalle: limpia, tipo documento profesional
- Botones de compartir: WhatsApp y email con iconos de Simple Icons
- Preview PDF embebido (iframe) antes de exportar

---

## 8. Variables de Diseño para tailwind.config.js

```js
// tailwind.config.js — extensiones para Nomio V2
module.exports = {
  theme: {
    extend: {
      colors: {
        // Superficies
        'concrete': '#F5F4F0',
        'stone':    '#EAE7E0',
        'travertine': '#D6D0C4',
        'void':     '#0C0A09',
        'iron':     '#1C1917',
        'steel':    '#292524',
        'burnished': '#44403C',
        'ash':      '#78716C',
        // Acentos
        'nomio-green': '#16A34A',
        'nomio-copper': '#C2410C',
        'nomio-amber': '#B45309',
      },
      fontFamily: {
        'display': ['var(--font-cormorant)', 'serif'],
        'heading': ['var(--font-josefin)', 'sans-serif'],
        'body':    ['var(--font-inter)', 'sans-serif'],
        'mono':    ['var(--font-mono)', 'monospace'],
      },
      borderRadius: {
        'arch': '16px',    // componentes principales
        'arch-sm': '10px', // componentes pequeños
        'arch-lg': '24px', // modales, drawers
      },
      boxShadow: {
        'card': '0 2px 12px rgba(0,0,0,0.06), 0 1px 3px rgba(0,0,0,0.08)',
        'card-dark': '0 4px 24px rgba(0,0,0,0.4)',
        'elevated': '0 8px 32px rgba(0,0,0,0.12)',
        'green-glow': '0 4px 20px rgba(22,163,74,0.25)',
      },
      transitionTimingFunction: {
        'enter': 'cubic-bezier(0.22, 0.61, 0.36, 1)',
        'exit': 'cubic-bezier(0.55, 0.06, 0.68, 0.19)',
        'spring': 'cubic-bezier(0.34, 1.56, 0.64, 1)',
      },
    },
  },
}
```

---

## 9. Iconografía y Assets

### Sistema de Iconos
- **Librería principal:** Lucide React — consistente, 24x24, trazo 1.5px
- **Iconos de marca:** Simple Icons para logos (WhatsApp, Excel, Google, etc.)
- **Iconos de acción peligrosa:** siempre `text-[--alert-copper]`
- **Tamaños:** 16px (inline), 20px (botones), 24px (cards), 32px (vacíos)
- **NUNCA:** emojis como iconos UI

### Fotografía y Texturas
Las imágenes existentes en `public/images/` son un buen punto de partida:
- `hero-blueprint.png` — para fondos de sections oscuros (opacity 4–8%)
- `arch-doodles.png` — para empty states y fondos de secciones
- `construction-golden.png` — para sección de features/testimonios
- `hero-progression.png` — para timeline "cómo funciona"

Usar siempre con `object-cover` + opacidad reducida como textura, no como imagen principal.

---

## 10. Anti-Patrones — Lo Que NO Hacer

| Evitar | Por qué | Alternativa |
|--------|---------|-------------|
| Gradientes AI (lila/rosa/azul) | Genérico, se ve como ChatGPT | Gradientes cálidos concreto/acero |
| Emojis como iconos UI | Poco profesional | Lucide React SVG |
| Borders radius >24px | Se ve infantil | 16px max para cards |
| Sombras frías `rgba(0,0,255,0.2)` | Tecnológico, no arquitectónico | `rgba(0,0,0,0.08)` cálido |
| Animaciones >500ms en UI | Se siente lento | Máx 300ms para interacciones |
| Parallax agresivo | Mareos, accesibilidad | Reveal on scroll simple |
| Tipografía sans-serif genérica (Roboto, Open Sans) | Sin identidad | Cormorant + Josefin |
| Fondo blanco puro #FFFFFF en light | Frío, cansado | #F5F4F0 concreto cálido |
| Colores de acento múltiples | Ruido visual | Verde + cobre como únicos acentos |

---

## 11. Roadmap de Implementación

### Fase 1 — Tokens y Fundamentos (1–2 días)
- [ ] Actualizar `tailwind.config.js` con todos los tokens
- [ ] Actualizar `app/globals.css` con variables CSS y keyframes nuevos
- [ ] Actualizar `app/layout.tsx` con las nuevas fuentes (Next.js font)
- [ ] Crear `lib/design-tokens.ts` con los tokens como constantes TS

### Fase 2 — Componentes Base (2–3 días)
- [ ] Rediseñar `DashboardShell.tsx` — sidebar colapsable V2
- [ ] Rediseñar cards KPI del dashboard home
- [ ] Rediseñar tablas generales (nominas, trabajadores)
- [ ] Rediseñar botones con nuevas variantes

### Fase 3 — Landing Page (2–3 días)
- [ ] Hero section con split layout + animaciones de entrada
- [ ] Bento grid de features con screenshots reales
- [ ] Strip de números animados
- [ ] Sección "Cómo funciona" con timeline
- [ ] CTA final oscuro con textura concreto

### Fase 4 — Dashboard Pages (3–4 días)
- [ ] Home dashboard con KPIs, timeline, alertas
- [ ] Drawer lateral para detalle (nóminas, trabajadores)
- [ ] Wizard de nómina con steps arquitectónicos
- [ ] Empty states con ilustración

### Fase 5 — Mobile PWA (2 días)
- [ ] Bottom tab bar para mobile (Asistencias / Proyectos / Perfil)
- [ ] Touch targets 44px mínimo en toda la app
- [ ] Modo capataz con UI simplificada

---

## 12. Métricas de Éxito del Rediseño

| Métrica | Objetivo |
|---------|----------|
| Tiempo en pantalla home | +20% vs actual |
| Bounce rate landing | <40% |
| Conversión CTA "Comenzar gratis" | >4% |
| Accesibilidad WCAG | AA en todas las páginas |
| Lighthouse Performance | >90 |
| Lighthouse Accessibility | >95 |
| First Contentful Paint | <1.5s |

---

*Propuesta generada con UI/UX Pro Max Design Intelligence*
*Referentes: Zaha Hadid Architects (estética), Spotify (dashboard energy), Apple.com (product showcase), Linear.app (data density), Are.na (editorial restraint)*
