'use client'
import { useState, useEffect } from 'react'
import { Download, X } from 'lucide-react'

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

export default function PwaInstallBanner() {
  const [prompt, setPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined') return
    if (sessionStorage.getItem('pwa-install-dismissed')) { setDismissed(true); return }

    const handler = (e: Event) => {
      e.preventDefault()
      setPrompt(e as BeforeInstallPromptEvent)
    }
    window.addEventListener('beforeinstallprompt', handler)
    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  const handleInstall = async () => {
    if (!prompt) return
    await prompt.prompt()
    const { outcome } = await prompt.userChoice
    if (outcome === 'accepted') setPrompt(null)
  }

  const handleDismiss = () => {
    sessionStorage.setItem('pwa-install-dismissed', '1')
    setDismissed(true)
  }

  if (dismissed || !prompt) return null

  return (
    <div className="flex items-center justify-between gap-3 rounded-2xl px-4 py-3 mb-4 border"
      style={{ background: 'rgba(6,182,212,0.06)', borderColor: 'rgba(6,182,212,0.20)' }}>
      <div className="flex items-center gap-3 min-w-0">
        <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
          style={{ background: 'rgba(6,182,212,0.12)', border: '1px solid rgba(6,182,212,0.25)' }}>
          <Download className="w-4 h-4" style={{ color: 'var(--primary)' }} />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-semibold" style={{ color: 'var(--text)' }}>Instalar Nomiextra en este dispositivo</p>
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Accede sin abrir el navegador, funciona offline</p>
        </div>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <button onClick={handleInstall} className="btn-primary text-xs py-1.5 px-3">
          Instalar
        </button>
        <button onClick={handleDismiss} className="p-1.5 rounded-lg hover:bg-surface/10 transition-colors">
          <X className="w-3.5 h-3.5 text-white/40" />
        </button>
      </div>
    </div>
  )
}
