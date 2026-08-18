'use client'

import { createContext, useCallback, useContext, useEffect, useState } from 'react'

type ToastVariant = 'success' | 'error'

interface Toast {
  id: number
  message: string
  variant: ToastVariant
}

interface ToastContextValue {
  showToast: (message: string, variant?: ToastVariant) => void
}

const ToastContext = createContext<ToastContextValue | null>(null)

/**
 * App-weite Toast-Benachrichtigung — lebt im (admin)-Layout statt auf einer einzelnen Seite,
 * damit sie Seitenwechsel überlebt. Gedacht für Hintergrund-Aktionen wie den Akquise-Sheet-Sync:
 * Klick auf "Synchronisieren", währenddessen frei weiter durch die App klicken, und trotzdem
 * kurz benachrichtigt werden, egal auf welcher Seite man inzwischen gelandet ist.
 */
export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast() muss innerhalb von <ToastProvider> aufgerufen werden.')
  return ctx
}

let nextToastId = 1

function ToastItem({ toast, onDismiss }: { toast: Toast; onDismiss: () => void }) {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const raf = requestAnimationFrame(() => setVisible(true))
    return () => cancelAnimationFrame(raf)
  }, [])

  return (
    <div
      role="status"
      className={`pointer-events-auto flex items-start gap-2.5 max-w-sm px-4 py-3 rounded-xl shadow-lg shadow-black/15 border text-sm font-medium transition-all duration-300 ${
        visible ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-2'
      } ${toast.variant === 'error' ? 'bg-red-600 border-red-500 text-white' : 'bg-gray-900 border-gray-800 text-white'}`}
      style={{ fontFamily: 'var(--font-dm-sans)' }}
    >
      {toast.variant === 'error' ? (
        <svg className="w-4.5 h-4.5 shrink-0 mt-0.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-1.5a9 9 0 11-18 0 9 9 0 0118 0zM12 15.75h.007" />
        </svg>
      ) : (
        <svg className="w-4.5 h-4.5 shrink-0 mt-0.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75l1.94 1.94a1 1 0 001.5-.09L15.75 9M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      )}
      <span className="flex-1">{toast.message}</span>
      <button onClick={onDismiss} className="shrink-0 text-white/50 hover:text-white transition-colors" aria-label="Schließen">
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  )
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const dismiss = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const showToast = useCallback(
    (message: string, variant: ToastVariant = 'success') => {
      const id = nextToastId++
      setToasts((prev) => [...prev, { id, message, variant }])
      setTimeout(() => dismiss(id), 5000)
    },
    [dismiss]
  )

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div className="fixed top-4 inset-x-0 sm:inset-x-auto sm:right-4 z-[60] flex flex-col items-center sm:items-end gap-2 px-4 sm:px-0 pointer-events-none">
        {toasts.map((toast) => (
          <ToastItem key={toast.id} toast={toast} onDismiss={() => dismiss(toast.id)} />
        ))}
      </div>
    </ToastContext.Provider>
  )
}
