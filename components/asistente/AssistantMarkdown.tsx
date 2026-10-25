'use client'
import React from 'react'

/**
 * Render de markdown ligero y seguro (sin dependencias ni dangerouslySetInnerHTML).
 * Soporta: **negrita**, *cursiva*, `codigo`, encabezados (#, ##, ###),
 * listas con - o *, listas numeradas, y parrafos. Pensado para respuestas de IA.
 */

// Procesa inline: **bold**, *italic*, `code`
function renderInline(text: string, keyPrefix: string): React.ReactNode[] {
  const nodes: React.ReactNode[] = []
  const regex = /(\*\*[^*]+\*\*|`[^`]+`|\*[^*]+\*)/g
  let lastIndex = 0
  let match: RegExpExecArray | null
  let k = 0
  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      nodes.push(text.slice(lastIndex, match.index))
    }
    const token = match[0]
    if (token.startsWith('**')) {
      nodes.push(<strong key={`${keyPrefix}-b${k}`} style={{ fontWeight: 700 }}>{token.slice(2, -2)}</strong>)
    } else if (token.startsWith('`')) {
      nodes.push(
        <code key={`${keyPrefix}-c${k}`} style={{
          fontFamily: 'JetBrains Mono, ui-monospace, monospace',
          fontSize: '0.85em', background: 'var(--surface-3)',
          padding: '1px 5px', borderRadius: 5,
        }}>{token.slice(1, -1)}</code>,
      )
    } else {
      nodes.push(<em key={`${keyPrefix}-i${k}`}>{token.slice(1, -1)}</em>)
    }
    lastIndex = regex.lastIndex
    k++
  }
  if (lastIndex < text.length) nodes.push(text.slice(lastIndex))
  return nodes
}

interface Block {
  type: 'p' | 'h1' | 'h2' | 'h3' | 'ul' | 'ol'
  lines: string[]
}

function parseBlocks(src: string): Block[] {
  const lines = src.replace(/\r\n/g, '\n').split('\n')
  const blocks: Block[] = []
  let current: Block | null = null

  const flush = () => { if (current) { blocks.push(current); current = null } }

  for (const raw of lines) {
    const line = raw.trimEnd()
    if (!line.trim()) { flush(); continue }

    const bullet = /^\s*[-*]\s+(.*)$/.exec(line)
    const numbered = /^\s*\d+[.)]\s+(.*)$/.exec(line)
    const h3 = /^###\s+(.*)$/.exec(line)
    const h2 = /^##\s+(.*)$/.exec(line)
    const h1 = /^#\s+(.*)$/.exec(line)

    if (bullet) {
      if (!current || current.type !== 'ul') { flush(); current = { type: 'ul', lines: [] } }
      current.lines.push(bullet[1])
    } else if (numbered) {
      if (!current || current.type !== 'ol') { flush(); current = { type: 'ol', lines: [] } }
      current.lines.push(numbered[1])
    } else if (h1) { flush(); blocks.push({ type: 'h1', lines: [h1[1]] }) }
    else if (h2) { flush(); blocks.push({ type: 'h2', lines: [h2[1]] }) }
    else if (h3) { flush(); blocks.push({ type: 'h3', lines: [h3[1]] }) }
    else {
      if (!current || current.type !== 'p') { flush(); current = { type: 'p', lines: [] } }
      current.lines.push(line)
    }
  }
  flush()
  return blocks
}

export default function AssistantMarkdown({ text }: { text: string }) {
  const blocks = parseBlocks(text)
  return (
    <div className="space-y-2">
      {blocks.map((b, i) => {
        if (b.type === 'h1') return <h3 key={i} style={{ fontWeight: 700, fontSize: '1.02rem', color: 'var(--tinta)' }}>{renderInline(b.lines[0], `h${i}`)}</h3>
        if (b.type === 'h2') return <h4 key={i} style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--tinta)' }}>{renderInline(b.lines[0], `h${i}`)}</h4>
        if (b.type === 'h3') return <h5 key={i} style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--tinta)' }}>{renderInline(b.lines[0], `h${i}`)}</h5>
        if (b.type === 'ul') return (
          <ul key={i} className="space-y-1" style={{ paddingLeft: 2 }}>
            {b.lines.map((l, j) => (
              <li key={j} className="flex items-start gap-2">
                <span style={{ marginTop: 8, width: 5, height: 5, borderRadius: '50%', background: 'var(--bosque-500)', flexShrink: 0 }} />
                <span>{renderInline(l, `u${i}-${j}`)}</span>
              </li>
            ))}
          </ul>
        )
        if (b.type === 'ol') return (
          <ol key={i} className="space-y-1" style={{ paddingLeft: 2 }}>
            {b.lines.map((l, j) => (
              <li key={j} className="flex items-start gap-2">
                <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '0.8em', fontWeight: 700, color: 'var(--bosque-600)', flexShrink: 0, minWidth: 16 }}>{j + 1}.</span>
                <span>{renderInline(l, `o${i}-${j}`)}</span>
              </li>
            ))}
          </ol>
        )
        return <p key={i}>{renderInline(b.lines.join(' '), `p${i}`)}</p>
      })}
    </div>
  )
}
