import { hoyISO } from '@/lib/utils'
/** Notificaciones del navegador (PWA / escritorio) para recordatorios de hoy. */

const STORAGE_KEY = 'nomio-notify-last'

export async function requestReminderNotificationPermission(): Promise<NotificationPermission | 'unsupported'> {
  if (typeof window === 'undefined' || !('Notification' in window)) return 'unsupported'
  if (Notification.permission === 'granted') return 'granted'
  if (Notification.permission === 'denied') return 'denied'
  return Notification.requestPermission()
}

export function notifyReminderToday(items: { titulo: string; subtitulo?: string }[]): void {
  if (typeof window === 'undefined' || !('Notification' in window)) return
  if (Notification.permission !== 'granted' || !items.length) return

  const today = hoyISO()
  try {
    if (localStorage.getItem(STORAGE_KEY) === today) return
  } catch {
    /* ignore */
  }

  const body = items.length === 1
    ? items[0].titulo
    : `${items.length} recordatorios para hoy. ${items[0].titulo}`

  try {
    new Notification('Nomiextra — Recordatorios', {
      body,
      icon: '/icon-192.png',
      tag: 'nomiextra-recordatorios-hoy',
    })
    localStorage.setItem(STORAGE_KEY, today)
  } catch {
    /* Safari / restricciones */
  }
}
