'use client'
import { useState, useEffect, useRef } from 'react'
import { Download, FileText, FileSpreadsheet, MessageCircle, ChevronDown } from 'lucide-react'

type ExportFormat = 'pdf' | 'xlsx' | 'csv' | 'whatsapp'

export default function NominaExportMenu({ exporting, onExport }: {
  exporting: boolean
  onExport: (format: ExportFormat) => void
}) {
  const [showMenu, setShowMenu] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!showMenu) return
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowMenu(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [showMenu])

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setShowMenu(v => !v)}
        disabled={exporting}
        className="btn-secondary flex items-center gap-1.5 py-2"
      >
        <Download className="w-4 h-4" />
        <span className="hidden sm:inline">{exporting ? 'Exportando...' : 'Exportar'}</span>
        <ChevronDown className="w-3.5 h-3.5" />
      </button>
      {showMenu && (
        <div className="absolute right-0 top-full mt-1 bg-surface border border-border rounded-xl shadow-lg z-30 py-1 w-44">
          <button onClick={() => { setShowMenu(false); onExport('pdf') }}
            className="w-full text-left flex items-center gap-2.5 px-3 py-2 text-sm hover:bg-bg transition-colors">
            <FileText className="w-4 h-4 text-red-500 shrink-0" /> PDF
          </button>
          <button onClick={() => { setShowMenu(false); onExport('xlsx') }}
            className="w-full text-left flex items-center gap-2.5 px-3 py-2 text-sm hover:bg-bg transition-colors">
            <FileSpreadsheet className="w-4 h-4 text-green-600 shrink-0" /> Excel (XLSX)
          </button>
          <button onClick={() => { setShowMenu(false); onExport('csv') }}
            className="w-full text-left flex items-center gap-2.5 px-3 py-2 text-sm hover:bg-bg transition-colors">
            <FileText className="w-4 h-4 text-ink-soft shrink-0" /> CSV
          </button>
          <div className="border-t border-border my-1" />
          <button onClick={() => { setShowMenu(false); onExport('whatsapp') }}
            className="w-full text-left flex items-center gap-2.5 px-3 py-2 text-sm hover:bg-bg transition-colors">
            <MessageCircle className="w-4 h-4 text-green-500 shrink-0" /> WhatsApp
          </button>
        </div>
      )}
    </div>
  )
}
