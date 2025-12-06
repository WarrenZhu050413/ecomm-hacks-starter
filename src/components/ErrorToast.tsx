/**
 * ErrorToast - Toast notifications for showing errors to users
 *
 * Usage:
 *   const { showError } = useErrorToast()
 *   showError('Something went wrong')
 *
 * Or with context:
 *   <ErrorToastProvider>
 *     <App />
 *   </ErrorToastProvider>
 */

import {
  createContext,
  useContext,
  useState,
  useCallback,
  type ReactNode,
} from 'react'
import './ErrorToast.css'

interface Toast {
  id: number
  message: string
  type: 'error' | 'warning' | 'info'
}

interface ErrorToastContextValue {
  showError: (message: string) => void
  showWarning: (message: string) => void
  showInfo: (message: string) => void
  clearAll: () => void
}

const ErrorToastContext = createContext<ErrorToastContextValue | null>(null)

let toastId = 0

export function ErrorToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const addToast = useCallback((message: string, type: Toast['type']) => {
    const id = ++toastId
    setToasts((prev) => [...prev, { id, message, type }])

    // Auto-dismiss after 5 seconds
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id))
    }, 5000)
  }, [])

  const showError = useCallback(
    (message: string) => addToast(message, 'error'),
    [addToast]
  )
  const showWarning = useCallback(
    (message: string) => addToast(message, 'warning'),
    [addToast]
  )
  const showInfo = useCallback(
    (message: string) => addToast(message, 'info'),
    [addToast]
  )

  const clearAll = useCallback(() => setToasts([]), [])

  const dismiss = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  return (
    <ErrorToastContext.Provider
      value={{ showError, showWarning, showInfo, clearAll }}
    >
      {children}
      <div className="toast-container">
        {toasts.map((toast) => (
          <div key={toast.id} className={`toast toast-${toast.type}`}>
            <span className="toast-icon">
              {toast.type === 'error' && '✕'}
              {toast.type === 'warning' && '⚠'}
              {toast.type === 'info' && 'ℹ'}
            </span>
            <span className="toast-message">{toast.message}</span>
            <button
              className="toast-dismiss"
              onClick={() => dismiss(toast.id)}
              aria-label="Dismiss"
            >
              ×
            </button>
          </div>
        ))}
      </div>
    </ErrorToastContext.Provider>
  )
}

export function useErrorToast(): ErrorToastContextValue {
  const context = useContext(ErrorToastContext)
  if (!context) {
    throw new Error('useErrorToast must be used within ErrorToastProvider')
  }
  return context
}
