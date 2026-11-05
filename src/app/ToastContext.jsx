import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react'
import { AlertTriangle, CheckCircle2, Info } from 'lucide-react'

const ToastContext = createContext(null)

const ICONS = {
  success: CheckCircle2,
  error: AlertTriangle,
  info: Info,
}

const TONES = {
  success: 'border-success/20 bg-success-soft text-success-ink',
  error: 'border-danger/20 bg-danger-soft text-danger-ink',
  info: 'border-line bg-surface text-ink',
}

export function ToastProvider({ children }) {
  const [items, setItems] = useState([])
  const counter = useRef(0)

  const dismiss = useCallback((id) => {
    setItems((list) => list.filter((item) => item.id !== id))
  }, [])

  const push = useCallback(
    (message, type = 'info') => {
      if (!message) return
      counter.current += 1
      const id = counter.current
      setItems((list) => [...list, { id, message, type }])
      window.setTimeout(() => dismiss(id), type === 'error' ? 6500 : 4000)
    },
    [dismiss],
  )

  const toast = useMemo(
    () => ({
      show: push,
      success: (message) => push(message, 'success'),
      error: (message) => push(message, 'error'),
      info: (message) => push(message, 'info'),
    }),
    [push],
  )

  return (
    <ToastContext.Provider value={toast}>
      {children}
      <div
        className="no-print pointer-events-none fixed inset-x-0 top-3 z-[90] flex flex-col items-center gap-2 px-4"
        role="status"
        aria-live="polite"
      >
        {items.map((item) => {
          const Icon = ICONS[item.type] || Info
          return (
            <div
              key={item.id}
              className={`pointer-events-auto flex w-full max-w-md items-start gap-2 rounded-xl border px-4 py-3 text-[15px] shadow-[0_8px_24px_-4px_rgba(0,0,0,0.12)] ${TONES[item.type] || TONES.info}`}
            >
              <Icon size={18} className="mt-0.5 shrink-0" aria-hidden="true" />
              <p className="flex-1 leading-6">{item.message}</p>
              <button
                type="button"
                onClick={() => dismiss(item.id)}
                className="-me-1 rounded-lg p-1 opacity-60 transition-opacity hover:opacity-100"
                aria-label="إغلاق التنبيه"
              >
                ✕
              </button>
            </div>
          )
        })}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  const context = useContext(ToastContext)
  if (!context) throw new Error('useToast must be used inside ToastProvider')
  return context
}
