import type { CapacitorConfig } from '@capacitor/cli';

/**
 * Configuración de Capacitor para el APK de Nomio.
 *
 * Estrategia: el APK es un contenedor nativo que carga la web de producción
 * desplegada en Vercel (server.url). Esto garantiza que CUALQUIER cambio
 * o feature nuevo desplegado a la web aparece automáticamente en el APK
 * la próxima vez que el usuario lo abra, sin necesidad de re-publicar.
 *
 * Para offline (asistencias sin internet) se usa el Service Worker de la
 * web (android-integration/web-additions/sw.js) + IndexedDB.
 *
 * Plugins nativos (cámara, push, geolocalización, biometría) se invocan
 * desde la web vía `window.Capacitor.Plugins.*` cuando está en APK, y se
 * hace fallback a APIs web estándar cuando es navegador normal.
 */
const config: CapacitorConfig = {
  appId: 'mx.nomio.app',
  appName: 'Nomio',
  // `webDir` solo se usa si quisiéramos bundlear assets; al tener `server.url`
  // Capacitor ignora este dir en runtime, pero sigue siendo requerido por la CLI.
  webDir: 'out',
  server: {
    // URL de producción. Cámbiala si tu dominio final no es el Vercel por default.
    url: process.env.CAPACITOR_SERVER_URL || 'http://localhost:3000',
    // allowNavigation: si Nomio integra dominios externos (p.ej. Stripe Checkout
    // o Supabase auth redirects), agrégalos aquí para que no abran browser externo.
    allowNavigation: [
      'localhost',
      '*.nomio.mx',
      'checkout.stripe.com',
      'billing.stripe.com',
      'your-project.supabase.co',
      '*.supabase.co',
    ],
    androidScheme: 'https',
    cleartext: false,
  },
  android: {
    // Para que Android considere la app "instalada" y no pida permisos extra
    // al usar sesiones de Supabase (localStorage persistente).
    allowMixedContent: false,
    captureInput: true,
    // Permitir deep links para confirmación de email (Supabase auth callback)
    // y retorno de Stripe Checkout.
    webContentsDebuggingEnabled: false,
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 1500,
      launchAutoHide: true,
      backgroundColor: '#0A0A0A',
      androidSplashResourceName: 'splash',
      androidScaleType: 'CENTER_CROP',
      showSpinner: false,
    },
    StatusBar: {
      style: 'DARK',
      backgroundColor: '#0A0A0A',
    },
    Camera: {
      // Presentación nativa en lugar de la web-cam
      presentationStyle: 'fullscreen',
    },
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert'],
    },
    LocalNotifications: {
      smallIcon: 'ic_stat_icon_config_sample',
      iconColor: '#0A0A0A',
      sound: 'beep.wav',
    },
    Geolocation: {
      // Para confirmar que asistencia se tomó en la obra correcta
      permissions: ['location'],
    },
  },
};

export default config;
