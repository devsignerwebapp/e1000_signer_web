import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { useT } from '../i18n/index.jsx'

const ToastContext = createContext(null)

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])
  const t = useT()
  const tRef = useRef(t)
  useEffect(() => { tRef.current = t }, [t]) // stable toast API; always translates with the current language
  const push = useCallback((message, kind = 'info') => {
    const id = Math.random().toString(36).slice(2)
    setToasts((l) => [...l, { id, message, kind }])
    setTimeout(() => setToasts((l) => l.filter((x) => x.id !== id)), 4200)
  }, [])
  // Strings passed to success/info are translated here; errors already arrive localised.
  const value = useMemo(
    () => ({ info: (m, v) => push(tRef.current(m, v), 'info'), success: (m, v) => push(tRef.current(m, v), 'success'), error: (m) => push(m?.message || tRef.current(m), 'error') }),
    [push],
  )
  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="toasts" role="status" aria-live="polite">
        {toasts.map((x) => (
          <div key={x.id} className={`toast toast-${x.kind}`}>
            <span className="toast-dot" aria-hidden />
            {x.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

// eslint-disable-next-line react/only-export-components
export const useToast = () => useContext(ToastContext)
