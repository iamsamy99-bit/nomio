/**
 * Registro del Service Worker + detección de entorno Capacitor.
 *
 * Uso en Next.js App Router:
 *   1. Copiar este archivo a `lib/register-sw.ts`
 *   2. Crear un Client Component `components/ServiceWorkerRegister.tsx`:
 *
 *      'use client';
 *      import { useEffect } from 'react';
 *      import { registerServiceWorker } from '@/lib/register-sw';
 *      export default function ServiceWorkerRegister() {
 *        useEffect(() => { registerServiceWorker(); }, []);
 *        return null;
 *      }
 *
 *   3. Importarlo desde app/layout.tsx (ver layout-patch.tsx).
 */

export function isCapacitorNative(): boolean {
  if (typeof window === 'undefined') return false;
  // @ts-ignore - Capacitor inyecta window.Capacitor en runtime nativo
  return !!(window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform());
}

export async function registerServiceWorker(): Promise<void> {
  if (typeof window === 'undefined') return;
  if (!('serviceWorker' in navigator)) return;

  // En desarrollo evitamos cachear
  if (process.env.NODE_ENV !== 'production') return;

  try {
    const reg = await navigator.serviceWorker.register('/sw.js', { scope: '/' });

    // Escuchar mensajes del SW (p.ej. flush de asistencias offline)
    navigator.serviceWorker.addEventListener('message', (event) => {
      if (event.data && event.data.type === 'FLUSH_ASISTENCIAS') {
        // Dispara el módulo que lee IndexedDB y hace POST a Supabase
        window.dispatchEvent(new CustomEvent('nomio:flush-asistencias'));
      }
    });

    // Verificar updates cada vez que la app vuelve a foreground
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') reg.update();
    });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn('[Nomio] SW registration failed', err);
  }
}

/**
 * Helper: invocar plugin nativo si estamos en APK, fallback web en navegador.
 */
export async function takePhoto(): Promise<string | null> {
  if (isCapacitorNative()) {
    // @ts-ignore
    const { Camera, CameraResultType } = await import('@capacitor/camera');
    const photo = await Camera.getPhoto({ quality: 70, resultType: CameraResultType.DataUrl });
    return photo.dataUrl ?? null;
  }
  // Fallback web: input file con capture
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.setAttribute('capture', 'environment');
    input.onchange = () => {
      const file = input.files?.[0];
      if (!file) return resolve(null);
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.readAsDataURL(file);
    };
    input.click();
  });
}

export async function getCurrentPosition(): Promise<GeolocationPosition | null> {
  if (isCapacitorNative()) {
    // @ts-ignore
    const { Geolocation } = await import('@capacitor/geolocation');
    const pos = await Geolocation.getCurrentPosition({ enableHighAccuracy: true });
    return pos as unknown as GeolocationPosition;
  }
  return new Promise((resolve) => {
    if (!('geolocation' in navigator)) return resolve(null);
    navigator.geolocation.getCurrentPosition(
      (p) => resolve(p),
      () => resolve(null),
      { enableHighAccuracy: true, timeout: 10000 }
    );
  });
}
