# Roadmap Nomio — Web + Android (Q2 2026 → 2027)

Plan priorizado para desarrollar features que se apliquen **una vez** en la web
y se reflejen automáticamente en el APK. Organizado por fases del documento
`ESTRATEGIA_NOMIO_COMO_SO.md` y marcado con qué capacidades nativas requiere
cada uno del lado del APK.

**Leyenda:**
- `WEB` — 100% web, el APK lo hereda sin cambios
- `APK+` — requiere plugin Capacitor para aprovechar funcionalidad nativa (foto, GPS, push)
- `SYNC` — implica datos offline + cola de sincronización

---

## Fase 0 — Infraestructura del APK (antes de todo lo demás)

Estimado: 2-3 días de trabajo enfocado.

| # | Feature | Tipo | Qué implica |
|---|---|---|---|
| 0.1 | Capacitor + PWA setup | `APK+` | Aplicar todo lo de `android-integration/` (config, manifest, SW). Primer APK debug compilable. |
| 0.2 | Iconos y splash | `APK+` | Generar con `@capacitor/assets` desde logo de Nomio. |
| 0.3 | Keystore + CI firma | `APK+` | Crear keystore, subir secrets a GitHub, validar que tag `v1.2.0` produce APK firmado. |
| 0.4 | Detección `isCapacitorNative()` | `WEB` | Helper ya entregado en `register-sw.ts`. Se usa en todos los features siguientes. |
| 0.5 | Deep links para Stripe return + Supabase auth | `APK+` | Configurar `allowNavigation` + intent filters en `AndroidManifest.xml` para que el OAuth callback regrese a la app, no al browser. |

---

## Fase 1 — Asistencias offline (Q2 2026)

El feature más importante según la estrategia. Es la **puerta de entrada** a todo lo demás.

| # | Feature | Tipo | Notas de implementación |
|---|---|---|---|
| 1.1 | Lista diaria de trabajadores (desde plantilla) | `WEB` | Query a Supabase: trabajadores asignados al proyecto activo hoy. |
| 1.2 | Registro rápido swipe presente/ausente | `WEB` | UI optimista en React; guarda en IndexedDB + Supabase. |
| 1.3 | Cola offline (IndexedDB) | `SYNC` | Módulo `asistencias-offline-store.ts` ya entregado. |
| 1.4 | Sync automática al recuperar conexión | `SYNC` | Listener `window.online` + SW background sync. |
| 1.5 | Foto de validación opcional | `APK+` | Plugin `@capacitor/camera` en APK, `<input capture>` fallback en web. |
| 1.6 | Geo-tag de la obra | `APK+` | Plugin `@capacitor/geolocation`, fallback `navigator.geolocation`. |
| 1.7 | Registro de retardos / medio día | `WEB` | Estados extra en el enum. |
| 1.8 | Vista de historial (por trabajador / por día) | `WEB` | Lectura pura. |

**Hito:** un arquitecto puede abrir la app en modo avión, registrar asistencia de 15 trabajadores con foto + geo, cerrar la app, y al volver a tener señal todo se sube solo.

---

## Fase 2 — Órdenes de trabajo (Q3 2026)

Convierte asistencia en *qué hizo cada uno*.

| # | Feature | Tipo | Notas |
|---|---|---|---|
| 2.1 | Modelo de datos "tarea" | `WEB` | Migración Supabase: `ordenes_trabajo(id, proyecto_id, trabajador_id, descripcion, pago, status, due_at, ...)` |
| 2.2 | Asignar tarea desde dashboard | `WEB` | Drag-drop o formulario. |
| 2.3 | Notificar a trabajador | `APK+` | Push notification FCM (plugin `@capacitor/push-notifications`). Fallback email si no tiene APK. |
| 2.4 | Aceptar/rechazar desde el APK | `APK+` | Notification action. |
| 2.5 | Marcar "iniciada" / "terminada" | `WEB` | Timestamp + status. |
| 2.6 | Pago automático al completar | `WEB` | Trigger Supabase: status=completada → genera línea de pago en nómina. |

---

## Fase 3 — Validación con foto (Q3 2026)

| # | Feature | Tipo | Notas |
|---|---|---|---|
| 3.1 | Foto antes/durante/después | `APK+` | `@capacitor/camera` con `saveToGallery: true`. |
| 3.2 | Subida a Supabase Storage | `SYNC` | Upload en background, retry si falla, cola offline para subidas. |
| 3.3 | UI de revisión "Aprobar / Rechazar / Comentar" | `WEB` | Swipe lateral en móvil, botones en desktop. |
| 3.4 | Pago procesado al aprobar | `WEB` | Edge function que marca la tarea como pagada y actualiza deuda. |
| 3.5 | Comentarios con voz-a-texto | `APK+` | `@capacitor/speech-recognition` (opcional). |

---

## Fase 4 — Portal del cliente (Q4 2026)

**Este no requiere APK** — es puramente web, acceso por token sin login.

| # | Feature | Tipo | Notas |
|---|---|---|---|
| 4.1 | Ruta pública `/p/[token]` | `WEB` | Supabase RLS por token. |
| 4.2 | Timeline de tareas con fotos | `WEB` | Feed vertical cronológico. |
| 4.3 | Gastado vs presupuesto (gauge) | `WEB` | Cálculo en server action. |
| 4.4 | Exportar PDF de avance | `WEB` | `jspdf` ya está en el proyecto — aprovecharlo. |
| 4.5 | Compartir link por WhatsApp | `APK+` | `@capacitor/share` en APK, `navigator.share` en web. |

---

## Fase 5 — Inteligencia financiera (Q4 2026 → Q1 2027)

| # | Feature | Tipo | Notas |
|---|---|---|---|
| 5.1 | Presupuesto por proyecto | `WEB` | Formulario inicial + breakdown. |
| 5.2 | Dashboard "real vs estimado" | `WEB` | Recharts (ya disponible en el web stack si lo agregan). |
| 5.3 | Alertas de sobre-presupuesto | `APK+` | Local notification cuando %gastado > 80%. |
| 5.4 | Cash flow en tiempo real | `WEB` | Suma de: dinero banco + cuentas por cobrar − nómina pendiente. |
| 5.5 | Simulador "¿puedo pagar hoy?" | `WEB` | Pantalla pre-nómina. |
| 5.6 | Proyección de rentabilidad | `WEB` | ML sencillo: promedio de velocidad de avance vs. gasto. |

---

## Fase 6 — Crecimiento (2027+)

Ideas para cuando el producto tenga tracción:

- Marketplace de trabajadores (red social interna)
- Integración con contador (export a sistemas fiscales)
- Formalización asistida (ISR/IMSS)
- Multi-empresa / franquicia
- Widget Android de asistencia rápida (sin abrir la app)
- Wear OS companion (asistencia con el reloj)

---

## Cómo priorizar nuevos pedidos entrantes

Antes de aceptar un feature nuevo, preguntar:

1. ¿Aumenta el **control operacional** del dueño del negocio?
   (Si no, probablemente no es Nomio.)
2. ¿Requiere algo del APK que no se pueda hacer en la web?
   (Si no, hazlo primero en web y se hereda al APK gratis.)
3. ¿Se integra al flujo de **asistencia → tarea → validación → pago**?
   (Ese es el core loop. Features fuera de ese loop son extras.)
4. ¿Ayuda al usuario a **no perder dinero**?
   (Cash flow, presupuesto, deuda: todo lo que evita que el arquitecto quiebre.)

## Principio guía para APK vs Web

> **Regla de oro:** escribe el feature en la web primero. Solo migra al APK
> lo que genuinamente requiere capacidad nativa (cámara de alta calidad,
> push en background, geo continuo, biometría, widget). Todo lo demás
> "viene gratis" por estar el APK apuntado a la URL de producción.

Esto minimiza costo de mantenimiento y evita el problema clásico de "la app
se quedó atrás de la web".
