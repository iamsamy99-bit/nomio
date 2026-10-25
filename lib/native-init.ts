import { isCapacitorNative } from './register-sw'

/**
 * One-time native shell initialization for the Capacitor APK. No-op in the
 * browser, so it is safe to mount unconditionally. Handles the things that make
 * a WebView feel like a real app: hardware back button, splash hide, status bar,
 * and scrolling focused inputs above the keyboard. All plugins are dynamically
 * imported and wrapped in try/catch so a missing plugin never breaks the web.
 */
let initialized = false

export async function initNative(): Promise<void> {
  if (initialized) return
  if (!isCapacitorNative()) return
  initialized = true

  // Flag the document so native-only CSS (safe-area insets, no text selection)
  // applies only inside the APK, never on the desktop web.
  document.documentElement.classList.add('capacitor-native')

  // Status bar: solid dark bar matching the brand (config also sets this, but we
  // re-assert in case the plugin loaded after the initial config pass).
  try {
    const { StatusBar, Style } = await import('@capacitor/status-bar')
    await StatusBar.setStyle({ style: Style.Dark })
  } catch { /* plugin unavailable — ignore */ }

  // Hide the splash once the web app is interactive (avoids a white flash).
  try {
    const { SplashScreen } = await import('@capacitor/splash-screen')
    await SplashScreen.hide()
  } catch { /* ignore */ }

  // Hardware back button: navigate back within the app; minimize at the root
  // instead of abruptly killing the process.
  try {
    const { App } = await import('@capacitor/app')
    App.addListener('backButton', ({ canGoBack }) => {
      if (canGoBack || window.history.length > 1) {
        window.history.back()
      } else {
        App.minimizeApp()
      }
    })
  } catch { /* ignore */ }

  // Keyboard: lift the focused field into view so it is never hidden behind the
  // on-screen keyboard (handled without the @capacitor/keyboard plugin).
  document.addEventListener('focusin', (e) => {
    const t = e.target as HTMLElement | null
    if (!t) return
    if (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable) {
      setTimeout(() => t.scrollIntoView({ block: 'center', behavior: 'smooth' }), 300)
    }
  })
}
