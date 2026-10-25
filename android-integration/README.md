# Integración Nomio Android — Guía de setup

Este folder contiene todo lo necesario para generar un APK de Nomio que
envuelve la web de producción (`your-domain.vercel.app`) y permite aprovechar
capacidades nativas (cámara, GPS, push, offline) sin duplicar codebase.

## Arquitectura

```
┌─────────────────────────────────────────┐
│   Web Next.js 15 (Vercel)               │  ← único codebase de UI
│   ├── PWA manifest                      │
│   ├── Service Worker (offline)          │
│   └── Supabase + Stripe                 │
└──────────────────▲──────────────────────┘
                   │ https://your-domain.vercel.app
                   │
┌──────────────────┴──────────────────────┐
│   APK Android (Capacitor)               │
│   ├── WebView carga la URL de prod      │
│   ├── Plugins nativos: camera, geo, push│
│   └── Detección runtime Capacitor/web   │
└─────────────────────────────────────────┘
```

**Consecuencia:** cualquier feature nuevo en la web se refleja automáticamente
en el APK la próxima vez que el usuario la abra. No hay que re-publicar en
Play Store para actualizar UI/lógica — solo para cambios nativos (permisos,
plugins nuevos, icon, splash).

## Setup paso a paso

### 1. Aplicar parches al código web existente

```bash
# 1a. Actualizar next.config.js con los headers de Permissions-Policy y SW
#     (ver android-integration/web-additions/next.config.patch.js)
# 1b. Actualizar app/layout.tsx con manifest + viewport + SW register
#     (ver android-integration/web-additions/layout-patch.tsx)
# 1c. Copiar archivos al proyecto Next.js:
cp android-integration/web-additions/manifest.json   public/manifest.json
cp android-integration/web-additions/sw.js           public/sw.js
cp android-integration/web-additions/offline.html    public/offline.html
cp android-integration/web-additions/register-sw.ts  lib/register-sw.ts
cp android-integration/web-additions/asistencias-offline-store.ts  lib/asistencias-offline-store.ts

# 1d. Crear el Client Component que registra el SW:
mkdir -p components
cat > components/ServiceWorkerRegister.tsx <<'EOF'
'use client';
import { useEffect } from 'react';
import { registerServiceWorker } from '@/lib/register-sw';
export default function ServiceWorkerRegister() {
  useEffect(() => { registerServiceWorker(); }, []);
  return null;
}
EOF

# 1e. Generar iconos (ver assets/ICONOS-LEEME.md)
mkdir -p public/icons
# ... colocar icon-192.png, icon-512.png, icon-maskable-*, etc.

# 1f. Deploy a Vercel para que la PWA quede activa en producción
git add . && git commit -m "chore: pwa scaffolding + sw" && git push
```

Verificar en Chrome Desktop (DevTools → Application → Manifest) que la PWA
ya es instalable. Eso confirma que lo web está listo.

### 2. Instalar Capacitor

```bash
# Desde la raíz del repo nomiextra:
npm install @capacitor/core@^6 @capacitor/android@^6 \
            @capacitor/app @capacitor/browser @capacitor/camera \
            @capacitor/device @capacitor/filesystem @capacitor/geolocation \
            @capacitor/haptics @capacitor/local-notifications \
            @capacitor/network @capacitor/preferences \
            @capacitor/push-notifications @capacitor/share \
            @capacitor/splash-screen @capacitor/status-bar @capacitor/toast
npm install --save-dev @capacitor/cli@^6

# Copiar el capacitor.config.ts a la raíz
cp android-integration/capacitor.config.ts ./capacitor.config.ts

# Inicializar plataforma Android
npx cap add android

# Abrir en Android Studio para validar (opcional, no obligatorio con CI)
npx cap open android
```

### 3. Parchar `android/app/build.gradle` para firma

Aplicar el bloque de `android-signing-build.gradle.patch` al archivo generado
por Capacitor. Esto permite que el CI inyecte el keystore vía propiedades.

### 4. Configurar secrets de GitHub

Ver `SECRETS-GITHUB.md`. Resumen:
- Generar keystore con `keytool`
- Subir base64 + passwords como secrets
- Configurar `CAPACITOR_SERVER_URL` como variable pública

### 5. Primer build

```bash
# Debug local (rápido, sin firma):
npm run android:build:debug
# APK queda en: android/app/build/outputs/apk/debug/app-debug.apk

# O via CI empujando a main:
git push origin main
# → Descarga el APK desde Actions → Artifacts
```

### 6. Primer release firmado

```bash
# Crear tag:
git tag v1.2.0
git push origin v1.2.0
# → CI genera app-release.apk + app-release.aab + GitHub Release
# → El .aab es lo que se sube a Play Console
```

## Archivos en este folder

| Archivo | Para qué sirve |
|---|---|
| `capacitor.config.ts` | Config principal de Capacitor. Copiar a raíz. |
| `package-additions.json` | Lista de dependencias a agregar al `package.json`. |
| `web-additions/manifest.json` | PWA manifest → `public/manifest.json` |
| `web-additions/sw.js` | Service Worker → `public/sw.js` |
| `web-additions/offline.html` | Pantalla offline → `public/offline.html` |
| `web-additions/register-sw.ts` | Helpers JS para SW + detección Capacitor |
| `web-additions/layout-patch.tsx` | Diff a aplicar a `app/layout.tsx` |
| `web-additions/next.config.patch.js` | Diff a aplicar a `next.config.js` |
| `web-additions/asistencias-offline-store.ts` | Módulo IndexedDB para asistencias offline |
| `android-signing-build.gradle.patch` | Diff a aplicar a `android/app/build.gradle` |
| `assets/ICONOS-LEEME.md` | Especificación de iconos/splash |
| `SECRETS-GITHUB.md` | Setup de secrets en GitHub |
| `ROADMAP.md` | Features a priorizar y cómo mantener web+APK sincronizadas |

## Preguntas frecuentes

**¿Esto es TWA o Capacitor?**
Capacitor. Decidimos Capacitor sobre TWA puro porque necesitas plugins nativos
(cámara, GPS, push) y porque la app ya no es un PWA puro (usa API routes para
Stripe webhook, etc.). Capacitor da TWA cuando quieres (simple WebView) y se
"sube" a nativo cuando hace falta.

**¿Cómo actualizo el APK cuando deployo la web?**
No tienes que hacer nada — el APK carga la URL en cada arranque, así que
cualquier cambio en Vercel ya está en el APK. Solo necesitas un release nuevo
del APK si: (a) cambias el icon/splash, (b) agregas un plugin Capacitor nuevo,
(c) cambias permisos de Android, (d) Play Store exige nueva target SDK.

**¿Y cuando la app debería actualizarse por seguridad?**
Usa `@capacitor/app` + un endpoint `/api/app-version` que devuelva la mínima
soportada. Si el APK detecta que es menor, muestra un diálogo "actualiza".

**¿Funciona 100% offline?**
Las rutas pre-cacheadas por el SW sí. Nuevos datos dependen de haber sido
visitados al menos una vez online. La prioridad en Fase 1 del roadmap es
que asistencias **funcione al 100% offline** porque es el caso crítico.
