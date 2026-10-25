import type { CapacitorConfig } from '@capacitor/cli'

/**
 * Configuración de Capacitor para el APK de Nomiextra.
 *
 * El APK es un contenedor nativo que carga la web de producción desplegada
 * en Vercel. Cualquier cambio en la web aparece automáticamente en el APK
 * al abrirlo — sin re-publicar en Play Store.
 *
 * Plugins nativos (cámara, GPS, push) se invocan desde la web vía
 * window.Capacitor.Plugins.* cuando corre en el APK; en navegador se usa
 * fallback a APIs web estándar.
 */
const config: CapacitorConfig = {
  appId: 'mx.nomiextra.app',
  appName: 'Nomiextra',
  webDir: 'out',
  server: {
    url: process.env.CAPACITOR_SERVER_URL || 'http://localhost:3000',
    allowNavigation: [
      'localhost',
      '*.nomiextra.mx',
      'checkout.stripe.com',
      'billing.stripe.com',
      'your-project.supabase.co',
      '*.supabase.co',
      'accounts.google.com',
      'login.microsoftonline.com',
    ],
    androidScheme: 'https',
    cleartext: false,
  },
  android: {
    allowMixedContent: false,
    captureInput: true,
    webContentsDebuggingEnabled: false,
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 1500,
      launchAutoHide: true,
      backgroundColor: '#0F3E6B',
      androidScaleType: 'CENTER_CROP',
      showSpinner: false,
    },
    StatusBar: {
      style: 'DARK',
      backgroundColor: '#0F3E6B',
    },
    Camera: {
      presentationStyle: 'fullscreen',
    },
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert'],
    },
    LocalNotifications: {
      iconColor: '#0F3E6B',
    },
  },
}

export default config
