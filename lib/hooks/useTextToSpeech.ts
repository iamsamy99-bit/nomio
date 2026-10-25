'use client'
import { useCallback, useEffect, useRef, useState } from 'react'

interface UseTextToSpeechOptions {
  /** BCP-47 tag. Default Mexican Spanish. */
  lang?: string
}

interface UseTextToSpeech {
  supported: boolean
  /** id of the utterance currently being spoken, or null. */
  speakingId: string | number | null
  paused: boolean
  speak: (id: string | number, text: string) => void
  stop: () => void
  pause: () => void
  resume: () => void
  /** Speak if idle, stop if the same id is already speaking. */
  toggle: (id: string | number, text: string) => void
}

/**
 * Lectura en voz alta (Web Speech Synthesis). Elige una voz en español
 * cuando esta disponible. Funciona en navegadores moviles modernos.
 */
export function useTextToSpeech({ lang = 'es-MX' }: UseTextToSpeechOptions = {}): UseTextToSpeech {
  const [supported, setSupported] = useState(false)
  const [speakingId, setSpeakingId] = useState<string | number | null>(null)
  const [paused, setPaused] = useState(false)
  const voiceRef = useRef<SpeechSynthesisVoice | null>(null)

  useEffect(() => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return
    setSupported(true)

    const pickVoice = () => {
      const voices = window.speechSynthesis.getVoices()
      voiceRef.current =
        voices.find(v => v.lang === lang) ??
        voices.find(v => v.lang?.toLowerCase().startsWith('es')) ??
        null
    }
    pickVoice()
    window.speechSynthesis.addEventListener('voiceschanged', pickVoice)

    return () => {
      window.speechSynthesis.removeEventListener('voiceschanged', pickVoice)
      window.speechSynthesis.cancel()
    }
  }, [lang])

  const stop = useCallback(() => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) window.speechSynthesis.cancel()
    setSpeakingId(null)
    setPaused(false)
  }, [])

  const speak = useCallback((id: string | number, text: string) => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return
    window.speechSynthesis.cancel()
    const u = new SpeechSynthesisUtterance(text)
    u.lang = lang
    if (voiceRef.current) u.voice = voiceRef.current
    u.rate = 1.02
    u.pitch = 1
    u.onend = () => { setSpeakingId(null); setPaused(false) }
    u.onerror = () => { setSpeakingId(null); setPaused(false) }
    setSpeakingId(id)
    setPaused(false)
    window.speechSynthesis.speak(u)
  }, [lang])

  const pause = useCallback(() => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window && window.speechSynthesis.speaking) {
      window.speechSynthesis.pause()
      setPaused(true)
    }
  }, [])

  const resume = useCallback(() => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.resume()
      setPaused(false)
    }
  }, [])

  const toggle = useCallback((id: string | number, text: string) => {
    if (speakingId === id) stop()
    else speak(id, text)
  }, [speakingId, stop, speak])

  return { supported, speakingId, paused, speak, stop, pause, resume, toggle }
}
