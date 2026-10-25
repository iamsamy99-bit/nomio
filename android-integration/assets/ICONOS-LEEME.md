# Iconos y splash para el APK

Coloca los siguientes archivos en `public/icons/` del proyecto Next.js
**antes** de correr `npx cap sync android`.

## Tamaños requeridos (PWA + Android)

| Archivo | Tamaño | Uso |
|---|---|---|
| `icon-192.png` | 192×192 | Manifest PWA (cualquier forma) |
| `icon-512.png` | 512×512 | Manifest PWA (cualquier forma, Play Store feature graphic) |
| `icon-maskable-192.png` | 192×192 | PWA adaptive icon |
| `icon-maskable-512.png` | 512×512 | PWA adaptive icon |
| `apple-touch-icon.png` | 180×180 | iOS standalone |
| `badge.png` | 96×96 monocromo | Push notification badge |
| `shortcut-asistencia.png` | 96×96 | Shortcut app drawer |
| `shortcut-nomina.png` | 96×96 | Shortcut app drawer |

## Iconos nativos Android (tras `cap add android`)

Capacitor genera carpetas `android/app/src/main/res/mipmap-*/` con iconos
por densidad. La forma más rápida de regenerarlos desde un solo SVG de
1024×1024 es con `@capacitor/assets`:

```bash
npm install --save-dev @capacitor/assets
# Colocar assets fuente:
#   resources/icon.png          (1024×1024, cuadrado sin padding)
#   resources/splash.png        (2732×2732, logo centrado con mucho padding)
#   resources/icon-foreground.png (para adaptive icon, logo pequeño)
#   resources/icon-background.png (color sólido)
npx capacitor-assets generate --android
```

## Splash
- Color de fondo: `#0A0A0A` (coincide con `capacitor.config.ts`)
- Logo de Nomio centrado, máx 40% del alto total
- El splash nativo se desvanece a los 1500ms (configurado en `capacitor.config.ts`)

## Recomendación de diseño
Usa el logo de Nomio sobre fondo negro con algo de margen (safe zone del 20%)
para que el maskable icon se vea bien recortado en círculo/cuadrado/etc.
