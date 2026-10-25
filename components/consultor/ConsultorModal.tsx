'use client'
import { useState, useRef, useEffect } from 'react'
import { X, HardHat, Send, ChevronDown, ChevronUp, AlertCircle, RotateCcw } from 'lucide-react'
import MicButton from '@/components/ui/MicButton'
import { MAX_TURNS_CONSULTOR as MAX_TURNS } from '@/lib/constants'

interface Message {
  role: 'user' | 'assistant'
  content: string
}

interface Props {
  onClose: () => void
  tier?: string
}

const SUGERENCIAS = [
  '¿Qué alternativa más ligera tengo al block para un muro de contención?',
  '¿Cuánta varilla necesito para una losa de 6x8m?',
  '¿Qué tipo de cimiento recomiendas para suelo arcilloso?',
  '¿Cuál es la diferencia entre concreto fc=150 y fc=200?',
]

export default function ConsultorModal({ onClose, tier = 'gratuito' }: Props) {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [contexto, setContexto] = useState('')
  const [contextoOpen, setContextoOpen] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  const turnsUsed = messages.filter(m => m.role === 'user').length
  const maxTurns = MAX_TURNS[tier] ?? 4

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  const handleSend = async () => {
    const text = input.trim()
    if (!text || loading || turnsUsed >= maxTurns) return

    const newMessages: Message[] = [...messages, { role: 'user', content: text }]
    setMessages(newMessages)
    setInput('')
    setLoading(true)
    setError('')

    try {
      const res = await fetch('/api/consultor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: newMessages,
          contexto: contexto.trim() || undefined,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? 'Error al consultar. Intenta de nuevo.')
        setMessages(prev => prev.slice(0, -1))
        return
      }
      setMessages(prev => [...prev, { role: 'assistant', content: data.respuesta }])
    } catch {
      setError('Error de conexión. Intenta de nuevo.')
      setMessages(prev => prev.slice(0, -1))
    } finally {
      setLoading(false)
      setTimeout(() => inputRef.current?.focus(), 100)
    }
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
    setContexto('')
    setContextoOpen(false)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/40 backdrop-blur-sm">
      <div
        className="rounded-t-2xl sm:rounded-2xl shadow-2xl w-full sm:max-w-lg flex flex-col"
        style={{ background: 'var(--surface)', height: '85dvh', maxHeight: '680px' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 shrink-0" style={{ borderBottom: '1px solid var(--border)' }}>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0" style={{ background: 'var(--bosque-100)' }}>
              <HardHat className="w-4 h-4" style={{ color: 'var(--bosque-600)' }} />
            </div>
            <div>
              <h2 className="font-display font-semibold text-sm leading-none" style={{ color: 'var(--tinta)' }}>
                Consultor de Obra
              </h2>
              <p className="text-[0.65rem] mt-0.5" style={{ color: 'var(--tinta-500)' }}>
                {turnsUsed}/{maxTurns} consultas en esta sesión
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            {messages.length > 0 && (
              <button onClick={handleReset} title="Nueva sesión" className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors" style={{ color: 'var(--tinta-500)' }}>
                <RotateCcw className="w-4 h-4" />
              </button>
            )}
            <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors" style={{ color: 'var(--tinta-500)' }}>
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Context toggle */}
        <div className="px-4 py-2 shrink-0" style={{ borderBottom: '1px solid var(--border)' }}>
          <button
            onClick={() => setContextoOpen(v => !v)}
            className="flex items-center gap-1.5 text-xs transition-colors"
            style={{ color: contexto.trim() ? 'var(--bosque-600)' : 'var(--tinta-500)' }}
          >
            {contextoOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            {contexto.trim() ? 'Contexto del proyecto activo' : 'Agregar contexto del proyecto (opcional)'}
          </button>
          {contextoOpen && (
            <textarea
              value={contexto}
              onChange={e => setContexto(e.target.value.slice(0, 400))}
              placeholder="Ej: Proyecto en Monterrey, suelo arcilloso, muro de contención 10x12m, presupuesto limitado..."
              className="input mt-2 text-xs resize-none"
              rows={3}
              maxLength={400}
            />
          )}
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
          {messages.length === 0 && (
            <div className="space-y-3">
              <p className="text-xs text-center py-2" style={{ color: 'var(--tinta-500)' }}>
                Pregúntame sobre materiales, estructuras, técnicas o normativa de construcción.
              </p>
              <div className="space-y-2">
                {SUGERENCIAS.map((s, i) => (
                  <button
                    key={i}
                    onClick={() => { setInput(s); setTimeout(() => inputRef.current?.focus(), 50) }}
                    className="w-full text-left text-xs px-3 py-2.5 rounded-xl transition-colors border"
                    style={{ background: 'var(--bosque-50)', borderColor: 'var(--bosque-100)', color: 'var(--bosque-700)' }}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((m, i) => (
            <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div
                className="max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed whitespace-pre-wrap"
                style={m.role === 'user' ? {
                  background: 'var(--bosque-600)',
                  color: '#FAF6EF',
                  borderBottomRightRadius: 4,
                } : {
                  background: 'var(--bosque-50)',
                  color: 'var(--tinta)',
                  border: '1px solid var(--bosque-100)',
                  borderBottomLeftRadius: 4,
                }}
              >
                {m.content}
              </div>
            </div>
          ))}

          {loading && (
            <div className="flex justify-start">
              <div className="px-4 py-3 rounded-2xl flex items-center gap-1.5" style={{ background: 'var(--bosque-50)', border: '1px solid var(--bosque-100)', borderBottomLeftRadius: 4 }}>
                {[0, 1, 2].map(i => (
                  <span key={i} className="w-1.5 h-1.5 rounded-full animate-bounce" style={{ background: 'var(--bosque-400)', animationDelay: `${i * 0.15}s` }} />
                ))}
              </div>
            </div>
          )}

          {turnsUsed >= maxTurns && !loading && (
            <div className="text-center py-2">
              <p className="text-xs" style={{ color: 'var(--tinta-500)' }}>
                Límite de {maxTurns} consultas alcanzado.{' '}
                <button onClick={handleReset} className="underline" style={{ color: 'var(--bosque-600)' }}>
                  Nueva sesión
                </button>
              </p>
            </div>
          )}

          <div ref={bottomRef} />
        </div>

        {/* Error */}
        {error && (
          <div className="px-4 pb-2 shrink-0">
            <div className="flex items-center gap-2 text-xs text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
              {error}
            </div>
          </div>
        )}

        {/* Input */}
        <div className="px-4 pb-4 pt-2 shrink-0" style={{ borderTop: '1px solid var(--border)' }}>
          <div className="flex items-end gap-2 rounded-xl px-3 py-2" style={{ background: 'var(--bosque-50)', border: '1px solid var(--bosque-200)' }}>
            <textarea
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={turnsUsed >= maxTurns ? 'Límite alcanzado' : 'Escribe tu consulta... (Enter para enviar)'}
              disabled={loading || turnsUsed >= maxTurns}
              rows={1}
              className="flex-1 bg-transparent text-sm outline-none resize-none leading-relaxed"
              style={{ color: 'var(--tinta)', maxHeight: 96 }}
              maxLength={1000}
            />
            <MicButton
              onTranscript={t => setInput(t.slice(0, 1000))}
              disabled={loading || turnsUsed >= maxTurns}
            />
            <button
              onClick={handleSend}
              disabled={!input.trim() || loading || turnsUsed >= maxTurns}
              className="p-2 rounded-lg transition-all shrink-0 disabled:opacity-40"
              style={{ background: 'var(--bosque-600)', color: '#FAF6EF' }}
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
          <p className="text-[0.6rem] mt-1.5 text-center" style={{ color: 'var(--tinta-500)' }}>
            Respuestas generadas por IA. Verifica con un ingeniero para decisiones estructurales críticas.
          </p>
        </div>
      </div>
    </div>
  )
}
