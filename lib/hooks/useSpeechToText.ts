'use client'
import { useState, useRef, useCallback, useEffect } from 'react'

// Minimal typings for the Web Speech API (not in lib.dom for all TS configs)
interface SpeechRecognitionResultItem { transcript: string }
interface SpeechRecognitionResult { 0: SpeechRecognitionResultItem; isFinal: boolean; length: number }
interface SpeechRecognitionEventLike {
  resultIndex: number
  results: { length: number; [i: number]: SpeechRecognitionResult }
}
interface SpeechRecognitionErrorEventLike { error: string }
interface SpeechRecognitionInstance {
  lang: string
  continuous: boolean
  interimResults: boolean
  start: () => void
  stop: () => void
  abort: () => void
  onresult: ((e: SpeechRecognitionEventLike) => void) | null
  onerror: ((e: SpeechRecognitionErrorEventLike) => void) | null
  onend: (() => void) | null
}
type SpeechRecognitionCtor = new () => SpeechRecognitionInstance

function getRecognitionCtor(): SpeechRecognitionCtor | null {
  if (typeof window === 'undefined') return null
  const w = window as unknown as {
    SpeechRecognition?: SpeechRecognitionCtor
    webkitSpeechRecognition?: SpeechRecognitionCtor
  }
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null
}

interface UseSpeechToTextOptions {
  /** BCP-47 language tag. Defaults to Mexican Spanish. */
  lang?: string
  /** Called with the full transcript (committed + interim) on each update. */
  onTranscript: (text: string) => void
}

interface UseSpeechToText {
  /** Whether the browser supports the Web Speech API at all. */
  supported: boolean
  /** Whether we are currently capturing audio. */
  listening: boolean
  /** Toggle listening on/off. */
  toggle: () => void
  /** Last error code, if any (e.g. "not-allowed", "no-speech"). */
  error: string
}

export function useSpeechToText({ lang = 'es-MX', onTranscript }: UseSpeechToTextOptions): UseSpeechToText {
  const [supported, setSupported] = useState(false)
  const [listening, setListening] = useState(false)
  const [error, setError] = useState('')
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null)
  const finalRef = useRef('')
  const onTranscriptRef = useRef(onTranscript)

  // Keep the callback fresh without re-creating the recognition instance
  useEffect(() => { onTranscriptRef.current = onTranscript }, [onTranscript])

  useEffect(() => {
    setSupported(getRecognitionCtor() !== null)
    return () => {
      recognitionRef.current?.abort()
      recognitionRef.current = null
    }
  }, [])

  const stop = useCallback(() => {
    recognitionRef.current?.stop()
    setListening(false)
  }, [])

  const start = useCallback(() => {
    const Ctor = getRecognitionCtor()
    if (!Ctor) return

    const rec = new Ctor()
    rec.lang = lang
    rec.continuous = true
    rec.interimResults = true
    finalRef.current = ''

    rec.onresult = (e) => {
      let interim = ''
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const res = e.results[i]
        const chunk = res[0].transcript
        if (res.isFinal) finalRef.current += chunk
        else interim += chunk
      }
      onTranscriptRef.current((finalRef.current + interim).trim())
    }
    rec.onerror = (e) => {
      setError(e.error)
      setListening(false)
    }
    rec.onend = () => setListening(false)

    recognitionRef.current = rec
    setError('')
    try {
      rec.start()
      setListening(true)
    } catch {
      setListening(false)
    }
  }, [lang])

  const toggle = useCallback(() => {
    if (listening) stop()
    else start()
  }, [listening, start, stop])

  return { supported, listening, toggle, error }
}
