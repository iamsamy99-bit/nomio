/**
 * Service Worker de Nomio
 *
 * Estrategia:
 * - App shell (HTML/CSS/JS): stale-while-revalidate → funciona offline, se
 *   actualiza en background.
 * - Assets estáticos (imágenes, fuentes): cache-first con expiración.
 * - Llamadas a Supabase / API: network-first con fallback a cola offline
 *   (IndexedDB vía helper aparte); NO cacheamos respuestas sensibles.
 *
 * Copiar este archivo a `public/sw.js` del proyecto Next.js y registrarlo
 * desde app/layout.tsx con el snippet de register-sw.ts.
 */

const SW_VERSION = 'nomio-v1.2.0';
const STATIC_CACHE = `nomio-static-${SW_VERSION}`;
const RUNTIME_CACHE = `nomio-runtime-${SW_VERSION}`;

const PRECACHE_URLS = [
  '/',
  '/dashboard',
  '/dashboard/asistencias',
  '/offline.html',
  '/manifest.json',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
];

// Rutas que NUNCA deben cachearse (siempre red)
const NEVER_CACHE_PATTERNS = [
  /\/api\/stripe\//,
  /\/auth\//,
  /supabase\.co\/auth\//,
];

// Rutas de API que vale la pena cachear con network-first
const API_PATTERNS = [
  /supabase\.co\/rest\/v1\//,
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => ![STATIC_CACHE, RUNTIME_CACHE].includes(key))
          .map((key) => caches.delete(key))
      )
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;

  if (request.method !== 'GET') return;

  const url = new URL(request.url);

  if (NEVER_CACHE_PATTERNS.some((p) => p.test(url.href))) return;

  // Navegación: stale-while-revalidate con fallback offline
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((resp) => {
          const clone = resp.clone();
          caches.open(RUNTIME_CACHE).then((c) => c.put(request, clone));
          return resp;
        })
        .catch(() => caches.match(request).then((cached) => cached || caches.match('/offline.html')))
    );
    return;
  }

  // API Supabase: network-first
  if (API_PATTERNS.some((p) => p.test(url.href))) {
    event.respondWith(
      fetch(request)
        .then((resp) => {
          const clone = resp.clone();
          caches.open(RUNTIME_CACHE).then((c) => c.put(request, clone));
          return resp;
        })
        .catch(() => caches.match(request))
    );
    return;
  }

  // Static assets: cache-first
  event.respondWith(
    caches.match(request).then((cached) =>
      cached || fetch(request).then((resp) => {
        if (resp.ok && resp.type === 'basic') {
          const clone = resp.clone();
          caches.open(STATIC_CACHE).then((c) => c.put(request, clone));
        }
        return resp;
      })
    )
  );
});

// Background sync: procesar cola de asistencias cuando regrese internet
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-asistencias') {
    event.waitUntil(syncAsistenciasPendientes());
  }
});

async function syncAsistenciasPendientes() {
  // El cliente envía `postMessage({ type: 'FLUSH_ASISTENCIAS' })` para que
  // la app lea IndexedDB y haga POST a Supabase. El SW solo despierta a
  // los clientes.
  const clients = await self.clients.matchAll({ includeUncontrolled: true });
  clients.forEach((client) => client.postMessage({ type: 'FLUSH_ASISTENCIAS' }));
}

// Push notifications (Firebase/FCM via Capacitor o web push nativo)
self.addEventListener('push', (event) => {
  if (!event.data) return;
  const payload = event.data.json();
  event.waitUntil(
    self.registration.showNotification(payload.title || 'Nomio', {
      body: payload.body,
      icon: '/icons/icon-192.png',
      badge: '/icons/badge.png',
      data: payload.data,
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = (event.notification.data && event.notification.data.url) || '/dashboard';
  event.waitUntil(self.clients.openWindow(targetUrl));
});
