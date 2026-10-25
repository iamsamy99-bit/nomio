# Nomio

SaaS de nomina, asistencias y cotizaciones para constructoras y PYMES en Mexico.

> **Codigo publicado como muestra de portafolio.** Esta es una copia saneada del repositorio
> original: sin historial de commits previo, sin credenciales, sin datos de clientes y con la
> infraestructura (proyecto de Supabase, Vercel, Sentry) reemplazada por variables de entorno.
> Todos los derechos reservados; no se concede licencia de uso o redistribucion.

Clientes: **web** (Next.js), **Windows** (Electron, releases en
[nomio-releases](https://github.com/iamsamy99-bit/nomio-releases)) y **Android** (Capacitor).

---

## Stack

| Capa | Tecnologia |
|------|-----------|
| Framework | Next.js 15 (App Router) |
| Auth + DB | Supabase (SSR, RLS) |
| Pagos | Stripe (fetch directo, sin SDK) |
| IA | Anthropic API — `claude-sonnet-4-7` |
| Estilos | Tailwind CSS |
| Exportacion | jsPDF, xlsx, CSV manual |
| Offline | IndexedDB (asistencias) |
| Deploy | Vercel |

---

## Funcionalidades

- **Nomina**: generacion manual y automatica desde asistencias, exportacion PDF / Excel / CSV / WhatsApp
- **Asistencias**: registro diario por proyecto, modalidades por dia / hora / mixto / fijo, columnas festivas
- **Cotizaciones**: multi-estilo, impuestos configurables (IVA/ISR/IEPS), cuantificacion con IA (plan Premium)
- **Anticipos**: aprobacion y descuento automatico al generar nomina
- **Dias festivos**: calendario Mexico configurable por empresa, bonus automatico en nomina
- **Planes**: Basico $99 / Constructor Pro $299 / Maestro Premium $599 (Stripe + Supabase)
- **Offline**: asistencias funciona sin conexion con sync posterior

---

## Variables de entorno

Copia `.env.example` como `.env.local` y rellena los valores:

```bash
cp .env.example .env.local
```

Variables requeridas:

| Variable | Descripcion |
|----------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | URL del proyecto Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Anon key publica de Supabase |
| `STRIPE_SECRET_KEY` | Clave secreta de Stripe (live o test) |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Clave publicable de Stripe |
| `STRIPE_WEBHOOK_SECRET` | Secret del webhook de Stripe |
| `STRIPE_BASICO_PRICE_ID` | Price ID del plan Basico |
| `STRIPE_PRO_PRICE_ID` | Price ID del plan Constructor Pro |
| `STRIPE_PREMIUM_PRICE_ID` | Price ID del plan Maestro Premium |
| `ANTHROPIC_API_KEY` | API key de Anthropic (para cuantificaciones AI) |
| `NEXT_PUBLIC_APP_URL` | URL base del app en produccion |

---

## Desarrollo local

```bash
npm install
npm run dev
```

Requiere Node 20 (ver `.nvmrc`).

---

## Deploy

```bash
npx vercel deploy --prod
```


---

## Estructura del proyecto

```
app/
  api/
    cuantificar/        # AI cuantificacion (Premium)
    nomina/             # Generacion desde asistencias
    stripe/             # Checkout, portal, webhook
  auth/                 # Login, registro, reset
  dashboard/
    asistencias/
    anticipos/
    cotizaciones/
    nomina/
    perfil/
    planes/
    proyectos/
    trabajadores/
components/
  cuantificar/          # Modal AI
  layout/               # Shell del dashboard
lib/
  anthropic-client.ts   # Wrapper Anthropic API
  dias-festivos.ts      # Calendario Mexico
  export/               # PDF, Excel, CSV, WhatsApp
  plan-limits.ts        # Fuente de verdad de tiers
  supabase/             # Client y server clients
types/
  index.ts
```

---

## Planes de suscripcion

| Plan | Precio | Trabajadores | Proyectos | Cotizaciones | IA |
|------|--------|-------------|-----------|--------------|-----|
| Basico | $99/mes | 10 | 3 | 50/mes | - |
| Constructor Pro | $299/mes | 80 | 20 | Ilimitadas | - |
| Maestro Premium | $599/mes | Ilimitados | Ilimitados | Ilimitadas | Si |

14 dias de prueba gratis en cualquier plan.
