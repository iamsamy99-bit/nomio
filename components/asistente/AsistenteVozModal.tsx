'use client'
import { useState, useRef, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  X, Mic, Send, AlertCircle, RotateCcw, Sparkles, Lightbulb, Keyboard,
  Copy, Check, Volume2, VolumeX, Square, Share2, RefreshCw,
} from 'lucide-react'
import { useSpeechToText } from '@/lib/hooks/useSpeechToText'
import { useTextToSpeech } from '@/lib/hooks/useTextToSpeech'
import AssistantMarkdown from './AssistantMarkdown'
import VoiceWaveform from './VoiceWaveform'
import { MAX_TURNS_CONSULTOR as MAX_TURNS } from '@/lib/constants'

interface Message {
  role: 'user' | 'assistant'
  content: string
}

const LS_MSGS = 'nomiextra-asistente-msgs'
const LS_AUTOREAD = 'nomiextra-asistente-autoread'

const RECOMENDACIONES = [
  'Toca el microfono y habla claro. Vuelve a tocarlo para terminar.',
  'Permite el acceso al microfono cuando el navegador lo pida.',
  'Puedes copiar, escuchar o compartir cada respuesta.',
  'Funciona mejor en Chrome o Edge, en un lugar con poco ruido.',
]

const SUGERENCIAS = [
  { icon: '🧱', text: 'Cuanta varilla necesito para una losa de 6x8m' },
  { icon: '🏗️', text: 'Que cimiento recomiendas para suelo arcilloso' },
  { icon: '⚖️', text: 'Alternativa mas ligera al block para un muro' },
  { icon: '🧪', text: 'Diferencia entre concreto fc=150 y fc=200' },
]

interface Props {
  onClose: () => void
  tier?: string
}

function loadMessages(): Message[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = window.localStorage.getItem(LS_MSGS)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    if (Array.isArray(parsed)) return parsed.slice(-40)
  } catch { /* ignore */ }
  return []
}

export default function AsistenteVozModal({ onClose, tier = 'gratuito' }: Props) {
  const [messages, setMessages] = useState<Message[]>(loadMessages)
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null)
  const [autoRead, setAutoRead] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const lastSpokenRef = useRef<number>(-1)

  const turnsUsed = messages.filter(m => m.role === 'user').length
  const maxTurns = MAX_TURNS[tier] ?? 4
  const limitReached = turnsUsed >= maxTurns

  const stt = useSpeechToText({ onTranscript: t => setInput(t.slice(0, 1000)) })
  const tts = useTextToSpeech()

  // Cargar preferencia de auto-lectura
  useEffect(() => {
    if (typeof window !== 'undefined') {
      setAutoRead(window.localStorage.getItem(LS_AUTOREAD) === '1')
    }
  }, [])

  // Persistir conversacion
  useEffect(() => {
    if (typeof window === 'undefined') return
    try {
      if (messages.length) window.localStorage.setItem(LS_MSGS, JSON.stringify(messages.slice(-40)))
      else window.localStorage.removeItem(LS_MSGS)
    } catch { /* ignore quota */ }
  }, [messages])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  // Cerrar con Escape
  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [onClose])

  // Auto-lectura de la ultima respuesta del asistente
  useEffect(() => {
    if (!autoRead || !tts.supported) return
    const lastIdx = messages.length - 1
    const last = messages[lastIdx]
    if (last && last.role === 'assistant' && lastIdx !== lastSpokenRef.current) {
      lastSpokenRef.current = lastIdx
      tts.speak(lastIdx, last.content)
    }
  }, [messages, autoRead, tts])

  const send = useCallback(async (text: string, history: Message[]) => {
    if (stt.listening) stt.toggle()
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/consultor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: history }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? 'Error al consultar. Intenta de nuevo.')
        setMessages(prev => prev.slice(0, -1))
        return
      }
      setMessages(prev => [...prev, { role: 'assistant', content: data.respuesta }])
    } catch {
      setError('Error de conexion. Intenta de nuevo.')
      setMessages(prev => prev.slice(0, -1))
    } finally {
      setLoading(false)
      setTimeout(() => inputRef.current?.focus(), 100)
    }
  }, [stt])

  const handleSend = () => {
    const text = input.trim()
    if (!text || loading || limitReached) return
    const next: Message[] = [...messages, { role: 'user', content: text }]
    setMessages(next)
    setInput('')
    send(text, next)
  }

  const handleRegenerate = () => {
    if (loading) return
    // Quita la ultima respuesta del asistente y reenvia con el historial previo
    let history = messages
    if (history[history.length - 1]?.role === 'assistant') {
      history = history.slice(0, -1)
      setMessages(history)
    }
    if (!history.length) return
    send(history[history.length - 1].content, history)
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const handleReset = () => {
    setMessages([])
    setError('')
    setInput('')
    tts.stop()
    lastSpokenRef.current = -1
    if (stt.listening) stt.toggle()
  }

  const toggleAutoRead = () => {
    setAutoRead(v => {
      const nv = !v
      if (typeof window !== 'undefined') window.localStorage.setItem(LS_AUTOREAD, nv ? '1' : '0')
      if (!nv) tts.stop()
      return nv
    })
  }

  const handleCopy = async (idx: number, text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopiedIdx(idx)
      setTimeout(() => setCopiedIdx(c => (c === idx ? null : c)), 1800)
    } catch {
      setError('No se pudo copiar. Selecciona el texto manualmente.')
    }
  }

  const handleShare = async (text: string) => {
    try {
      if (typeof navigator !== 'undefined' && navigator.share) {
        await navigator.share({ text })
        return
      }
    } catch { return /* usuario cancelo */ }
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank', 'noopener')
  }

  const micHint = !stt.supported
    ? 'Tu navegador no soporta dictado. Escribe tu pregunta o usa Chrome o Edge.'
    : stt.error === 'not-allowed'
      ? 'Microfono bloqueado. Permite el microfono en el candado de la barra.'
      : stt.error === 'no-speech'
        ? 'No se escucho nada. Acercate al microfono e intenta de nuevo.'
        : stt.listening
          ? 'Escuchando... habla ahora'
          : 'Toca para hablar'

  const lastAssistantIdx = (() => {
    for (let i = messages.length - 1; i >= 0; i--) if (messages[i].role === 'assistant') return i
    return -1
  })()

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
      style={{ background: 'rgba(8,14,18,0.55)', backdropFilter: 'blur(6px)' }}
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Asistente de voz"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
    >
      <motion.div
        className="rounded-t-3xl sm:rounded-3xl shadow-2xl w-full sm:max-w-lg flex flex-col overflow-hidden"
        style={{ background: 'var(--surface)', height: '90dvh', maxHeight: '720px' }}
        onClick={e => e.stopPropagation()}
        initial={{ y: 40, scale: 0.98, opacity: 0 }}
        animate={{ y: 0, scale: 1, opacity: 1 }}
        exit={{ y: 40, scale: 0.98, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 320, damping: 30 }}
      >
        {/* Header con gradiente */}
        <div
          className="relative flex items-center justify-between px-5 py-4 shrink-0 overflow-hidden"
          style={{ background: 'linear-gradient(120deg, #1A2E37 0%, #2c4a3a 60%, #3a4f2e 100%)' }}
        >
          <motion.div
            aria-hidden="true"
            className="absolute -top-10 -right-8 w-40 h-40 rounded-full"
            style={{ background: 'radial-gradient(circle, rgba(168,181,160,0.35), transparent 70%)' }}
            animate={{ scale: [1, 1.15, 1], opacity: [0.5, 0.8, 0.5] }}
            transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}
          />
          <div className="flex items-center gap-3 relative">
            <div className="w-9 h-9 rounded-2xl flex items-center justify-center shrink-0" style={{ background: 'rgba(255,254,251,0.14)', border: '1px solid rgba(255,254,251,0.18)' }}>
              <Sparkles className="w-4.5 h-4.5" style={{ width: 18, height: 18, color: '#EAF2E6' }} />
            </div>
            <div>
              <h2 className="font-display font-semibold text-sm leading-none" style={{ color: '#FAF6EF' }}>
                Asistente de obra
              </h2>
              <p className="text-[0.65rem] mt-1" style={{ color: 'rgba(250,246,239,0.65)' }}>
                Habla o escribe · {turnsUsed}/{maxTurns} consultas
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1 relative">
            {tts.supported && (
              <button
                onClick={toggleAutoRead}
                title={autoRead ? 'Auto-lectura activada' : 'Auto-lectura desactivada'}
                aria-label="Alternar lectura automatica"
                className="p-2 rounded-xl transition-colors"
                style={{ background: autoRead ? 'rgba(168,181,160,0.28)' : 'transparent', color: '#FAF6EF' }}
              >
                {autoRead ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" style={{ opacity: 0.7 }} />}
              </button>
            )}
            {messages.length > 0 && (
              <button onClick={handleReset} title="Nueva sesion" aria-label="Nueva sesion" className="p-2 rounded-xl transition-colors hover:bg-white/10" style={{ color: '#FAF6EF' }}>
                <RotateCcw className="w-4 h-4" />
              </button>
            )}
            <button onClick={onClose} aria-label="Cerrar" className="p-2 rounded-xl transition-colors hover:bg-white/10" style={{ color: '#FAF6EF' }}>
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Mensajes */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
          {messages.length === 0 && (
            <motion.div
              className="space-y-4"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
            >
              <div className="flex flex-col items-center text-center pt-2 pb-1">
                <motion.div
                  className="w-14 h-14 rounded-3xl flex items-center justify-center mb-3"
                  style={{ background: 'linear-gradient(135deg, var(--bosque-100), var(--bosque-50))', border: '1px solid var(--bosque-200)' }}
                  animate={{ y: [0, -5, 0] }}
                  transition={{ duration: 3.5, repeat: Infinity, ease: 'easeInOut' }}
                >
                  <Sparkles className="w-6 h-6" style={{ color: 'var(--bosque-600)' }} />
                </motion.div>
                <p className="text-sm font-semibold" style={{ color: 'var(--tinta)' }}>Pregunta lo que sea de tu obra</p>
                <p className="text-xs mt-1" style={{ color: 'var(--tinta-500)' }}>Materiales, estructuras, costos, normativa.</p>
              </div>

              <div className="rounded-2xl px-4 py-3.5 border" style={{ background: 'var(--bosque-50)', borderColor: 'var(--bosque-100)' }}>
                <div className="flex items-center gap-1.5 mb-2">
                  <Lightbulb className="w-3.5 h-3.5 shrink-0" style={{ color: 'var(--bosque-600)' }} />
                  <p className="text-[0.7rem] font-bold uppercase tracking-wider" style={{ color: 'var(--bosque-700)' }}>Como usarlo</p>
                </div>
                <ul className="space-y-1.5">
                  {RECOMENDACIONES.map((r, i) => (
                    <li key={i} className="flex items-start gap-2 text-xs leading-relaxed" style={{ color: 'var(--tinta-700)' }}>
                      <span className="mt-1.5 w-1 h-1 rounded-full shrink-0" style={{ background: 'var(--bosque-400)' }} />
                      {r}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="grid grid-cols-1 gap-2">
                {SUGERENCIAS.map((s, i) => (
                  <motion.button
                    key={i}
                    onClick={() => { setInput(s.text); setTimeout(() => inputRef.current?.focus(), 50) }}
                    className="w-full text-left text-xs px-3 py-2.5 rounded-xl transition-colors border flex items-center gap-2.5"
                    style={{ background: 'var(--surface-2)', borderColor: 'var(--border)', color: 'var(--tinta-700)' }}
                    whileHover={{ x: 3 }}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 + i * 0.06 }}
                  >
                    <span style={{ fontSize: 16 }}>{s.icon}</span>
                    {s.text}
                  </motion.button>
                ))}
              </div>
            </motion.div>
          )}

          {messages.map((m, i) => {
            const isUser = m.role === 'user'
            const speaking = tts.speakingId === i
            return (
              <motion.div
                key={i}
                className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}
                initial={{ opacity: 0, y: 10, filter: 'blur(6px)' }}
                animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
              >
                <div className={`flex flex-col gap-1 ${isUser ? 'items-end' : 'items-start'}`} style={{ maxWidth: '88%' }}>
                  <div
                    className="rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed"
                    style={isUser ? {
                      background: 'var(--bosque-600)', color: '#FAF6EF', borderBottomRightRadius: 4,
                    } : {
                      background: 'var(--bosque-50)', color: 'var(--tinta)',
                      border: speaking ? '1px solid var(--bosque-400)' : '1px solid var(--bosque-100)',
                      borderBottomLeftRadius: 4,
                      boxShadow: speaking ? '0 0 0 3px rgba(85,107,69,0.15)' : 'none',
                      transition: 'box-shadow 0.2s, border-color 0.2s',
                    }}
                  >
                    {isUser
                      ? <span className="whitespace-pre-wrap">{m.content}</span>
                      : <AssistantMarkdown text={m.content} />}
                  </div>

                  {!isUser && (
                    <div className="flex items-center gap-0.5 pl-1 flex-wrap">
                      <ActionBtn onClick={() => handleCopy(i, m.content)} active={copiedIdx === i}>
                        {copiedIdx === i ? <><Check className="w-3.5 h-3.5" /> Copiado</> : <><Copy className="w-3.5 h-3.5" /> Copiar</>}
                      </ActionBtn>
                      {tts.supported && (
                        <ActionBtn onClick={() => tts.toggle(i, m.content)} active={speaking} danger={speaking}>
                          {speaking ? <><Square className="w-3.5 h-3.5" /> Detener</> : <><Volume2 className="w-3.5 h-3.5" /> Escuchar</>}
                        </ActionBtn>
                      )}
                      <ActionBtn onClick={() => handleShare(m.content)}>
                        <Share2 className="w-3.5 h-3.5" /> Compartir
                      </ActionBtn>
                      {i === lastAssistantIdx && !loading && (
                        <ActionBtn onClick={handleRegenerate}>
                          <RefreshCw className="w-3.5 h-3.5" /> Regenerar
                        </ActionBtn>
                      )}
                    </div>
                  )}
                </div>
              </motion.div>
            )
          })}

          {loading && (
            <motion.div className="flex justify-start" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <div className="px-4 py-3 rounded-2xl flex items-center gap-2" style={{ background: 'var(--bosque-50)', border: '1px solid var(--bosque-100)', borderBottomLeftRadius: 4 }}>
                {[0, 1, 2].map(i => (
                  <motion.span
                    key={i}
                    className="w-1.5 h-1.5 rounded-full"
                    style={{ background: 'var(--bosque-500)' }}
                    animate={{ y: [0, -4, 0], opacity: [0.4, 1, 0.4] }}
                    transition={{ duration: 0.9, repeat: Infinity, delay: i * 0.15 }}
                  />
                ))}
                <span className="text-[0.7rem] ml-1" style={{ color: 'var(--tinta-500)' }}>Pensando...</span>
              </div>
            </motion.div>
          )}

          {limitReached && !loading && (
            <div className="text-center py-2">
              <p className="text-xs" style={{ color: 'var(--tinta-500)' }}>
                Limite de {maxTurns} consultas alcanzado.{' '}
                <button onClick={handleReset} className="underline" style={{ color: 'var(--bosque-600)' }}>Nueva sesion</button>
              </p>
            </div>
          )}

          <div ref={bottomRef} />
        </div>

        {/* Error */}
        <AnimatePresence>
          {error && (
            <motion.div
              className="px-4 pb-2 shrink-0"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
            >
              <div className="flex items-center gap-2 text-xs text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                {error}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Dock de entrada */}
        <div className="px-4 pb-4 pt-3 shrink-0" style={{ borderTop: '1px solid var(--border)' }}>
          {/* Estado de escucha: waveform + transcripcion en vivo */}
          <AnimatePresence>
            {stt.listening && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="mb-3 overflow-hidden"
              >
                <div className="rounded-2xl px-4 py-3" style={{ background: 'rgba(220,38,38,0.06)', border: '1px solid rgba(220,38,38,0.18)' }}>
                  <VoiceWaveform active color="#DC2626" height={34} />
                  <p className="text-[0.72rem] text-center mt-1.5 min-h-[1rem]" style={{ color: input ? 'var(--tinta)' : '#DC2626' }}>
                    {input || 'Escuchando... habla ahora'}
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="flex items-end gap-2">
            {/* Boton de microfono con anillos reactivos */}
            <div className="relative shrink-0">
              {stt.listening && (
                <>
                  {[0, 1].map(r => (
                    <motion.span
                      key={r}
                      className="absolute inset-0 rounded-2xl pointer-events-none"
                      style={{ background: 'rgba(220,38,38,0.25)' }}
                      animate={{ scale: [1, 1.8], opacity: [0.5, 0] }}
                      transition={{ duration: 1.4, repeat: Infinity, delay: r * 0.7, ease: 'easeOut' }}
                    />
                  ))}
                </>
              )}
              <motion.button
                onClick={() => { if (stt.supported && !limitReached) stt.toggle() }}
                disabled={!stt.supported || loading || limitReached}
                aria-label={stt.listening ? 'Detener dictado' : 'Hablar'}
                title={micHint}
                className="relative w-12 h-12 rounded-2xl flex items-center justify-center disabled:opacity-40"
                style={{
                  background: stt.listening
                    ? 'linear-gradient(135deg, #DC2626, #b91c1c)'
                    : 'linear-gradient(135deg, #556B45, #3a4f2e)',
                  color: '#FAF6EF',
                  boxShadow: stt.listening ? '0 4px 16px rgba(220,38,38,0.45)' : '0 4px 14px rgba(85,107,69,0.4)',
                }}
                whileTap={{ scale: 0.92 }}
              >
                <Mic className="w-5 h-5" />
              </motion.button>
            </div>

            {/* Caja de texto */}
            <div className="flex-1 flex items-end gap-2 rounded-2xl px-3 py-2" style={{ background: 'var(--bosque-50)', border: '1px solid var(--bosque-200)' }}>
              <Keyboard className="w-4 h-4 shrink-0 mb-1.5" style={{ color: 'var(--tinta-500)' }} />
              <textarea
                ref={inputRef}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={limitReached ? 'Limite alcanzado' : 'Escribe o dicta...'}
                disabled={loading || limitReached}
                rows={1}
                className="flex-1 bg-transparent text-sm outline-none resize-none leading-relaxed"
                style={{ color: 'var(--tinta)', maxHeight: 96 }}
                maxLength={1000}
              />
              <motion.button
                onClick={handleSend}
                disabled={!input.trim() || loading || limitReached}
                aria-label="Enviar"
                className="p-2 rounded-xl transition-all shrink-0 disabled:opacity-40"
                style={{ background: 'var(--bosque-600)', color: '#FAF6EF' }}
                whileTap={{ scale: 0.9 }}
              >
                <Send className="w-4 h-4" />
              </motion.button>
            </div>
          </div>

          <p className="text-[0.6rem] mt-2 text-center" style={{ color: 'var(--tinta-500)' }}>
            {micHint === 'Toca para hablar'
              ? 'Respuestas de IA. Verifica con un ingeniero decisiones estructurales criticas.'
              : micHint}
          </p>
        </div>
      </motion.div>
    </motion.div>
  )
}

function ActionBtn({
  children, onClick, active, danger,
}: {
  children: React.ReactNode
  onClick: () => void
  active?: boolean
  danger?: boolean
}) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-1 px-2 py-1 rounded-lg text-[0.7rem] font-medium transition-colors hover:bg-gray-100"
      style={{ color: danger ? '#DC2626' : active ? 'var(--bosque-600)' : 'var(--tinta-500)' }}
    >
      {children}
    </button>
  )
}
