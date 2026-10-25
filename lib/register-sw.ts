/**
 * Registro del Service Worker + detección de entorno Capacitor.
 * Detecta si la app corre en APK (Capacitor) o en navegador web.
 */

export function isCapacitorNative(): boolean {
  if (typeof window === 'undefined') return false
  const w = window as unknown as {
    Capacitor?: { isNativePlatform?: () => boolean }
  }
  return !!(w.Capacitor && w.Capacitor.isNativePlatform && w.Capacitor.isNativePlatform())
}

export async function registerServiceWorker(): Promise<void> {
  if (typeof window === 'undefined') return
  if (!('serviceWorker' in navigator)) return
  if (process.env.NODE_ENV !== 'production') return

  try {
    const reg = await navigator.serviceWorker.register('/sw.js', { scope: '/' })

    navigator.serviceWorker.addEventListener('message', (event) => {
      if (event.data && event.data.type === 'FLUSH_ASISTENCIAS') {
        window.dispatchEvent(new CustomEvent('nomio:flush-asistencias'))
      }
    })

    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') reg.update()
    })
  } catch (err) {
    console.warn('[Nomio] SW registration failed', err)
  }
}

/**
 * Toma una foto. Usa plugin nativo en APK, input[type=file] con capture en web.
 */
export async function takePhoto(): Promise<string | null> {
  if (isCapacitorNative()) {
    const mod = await import('@capacitor/camera').catch(() => null)
    if (!mod) return null
    const { Camera, CameraResultType } = mod
    const photo = await Camera.getPhoto({ quality: 70, resultType: CameraResultType.DataUrl })
    return photo.dataUrl ?? null
  }
  return new Promise((resolve) => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = 'image/*'
    input.setAttribute('capture', 'environment')
    input.onchange = () => {
      const file = input.files?.[0]
      if (!file) return resolve(null)
      const reader = new FileReader()
      reader.onload = () => resolve(reader.result as string)
      reader.readAsDataURL(file)
    }
    input.click()
  })
}

/**
 * Obtiene ubicación actual. Nativo en APK, Geolocation API en web.
 */
export async function getCurrentPosition(): Promise<GeolocationPosition | null> {
  if (isCapacitorNative()) {
    const mod = await import('@capacitor/geolocation').catch(() => null)
    if (!mod) return null
    const { Geolocation } = mod
    const pos = await Geolocation.getCurrentPosition({ enableHighAccuracy: true })
    return pos as unknown as GeolocationPosition
  }
  return new Promise((resolve) => {
    if (!('geolocation' in navigator)) return resolve(null)
    navigator.geolocation.getCurrentPosition(
      (p) => resolve(p),
      () => resolve(null),
      { enableHighAccuracy: true, timeout: 10000 }
    )
  })
}
