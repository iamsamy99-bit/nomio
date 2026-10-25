'use client'
import { useEffect } from 'react'
import { AlertCircle, RefreshCw } from 'lucide-react'

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('[dashboard error]', error)
  }, [error])

  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="max-w-md w-full mx-4 tile border-red-200 bg-red-50">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-semibold text-red-900">Algo salió mal</p>
            <p className="text-sm text-red-700 mt-1">
              {error.message || 'Ocurrió un error inesperado. Intenta de nuevo.'}
            </p>
            <button
              onClick={reset}
              className="mt-4 flex items-center gap-2 text-sm font-semibold text-red-700 hover:underline"
            >
              <RefreshCw className="w-4 h-4" /> Reintentar
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
