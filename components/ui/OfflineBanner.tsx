'use client'
import { useEffect, useState } from 'react'
import { WifiOff } from 'lucide-react'

export default function OfflineBanner() {
  const [offline, setOffline] = useState(false)

  useEffect(() => {
    setOffline(!navigator.onLine)
    const on  = () => setOffline(false)
    const off = () => setOffline(true)
    window.addEventListener('online', on)
    window.addEventListener('offline', off)
    return () => { window.removeEventListener('online', on); window.removeEventListener('offline', off) }
  }, [])

  if (!offline) return null

  return (
    <div
      className="fixed top-14 inset-x-0 z-40 flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium"
      style={{ background: '#92400e', color: '#fef3c7' }}
    >
      <WifiOff className="w-4 h-4 shrink-0" />
      Sin conexion a internet — tus cambios no se guardan hasta recuperar la senal.
    </div>
  )
}
