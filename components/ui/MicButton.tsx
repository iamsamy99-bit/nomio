'use client'
import { Mic, MicOff } from 'lucide-react'
import { useSpeechToText } from '@/lib/hooks/useSpeechToText'

interface Props {
  /** Called with the live transcript while the user dictates. */
  onTranscript: (text: string) => void
  /** Disable the button (e.g. while a request is in flight). */
  disabled?: boolean
  /** Optional size in px for the icon. */
  size?: number
}

export default function MicButton({ onTranscript, disabled, size = 16 }: Props) {
  const { supported, listening, toggle, error } = useSpeechToText({ onTranscript })

  // Hide entirely on browsers without the Web Speech API (e.g. Firefox, some iOS)
  if (!supported) return null

  const title = listening
    ? 'Detener dictado'
    : error === 'not-allowed'
      ? 'Permiso de micrófono denegado'
      : 'Dictar por voz'

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={disabled}
      title={title}
      aria-label={title}
      className="p-2 rounded-lg transition-all shrink-0 disabled:opacity-40 relative"
      style={{
        background: listening ? 'rgba(220,38,38,0.12)' : 'transparent',
        color: listening ? '#DC2626' : 'var(--tinta-500)',
      }}
    >
      {listening ? <MicOff style={{ width: size, height: size }} /> : <Mic style={{ width: size, height: size }} />}
      {listening && (
        <span
          className="absolute inset-0 rounded-lg animate-ping pointer-events-none"
          style={{ background: 'rgba(220,38,38,0.18)' }}
        />
      )}
    </button>
  )
}
