import { useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'

interface ShortcutHandlers {
  r?: () => void
  i?: () => void
  s?: () => void
  b?: () => void
  n?: () => void
  d?: () => void
}

export function useGlobalKeyboardShortcuts(handlers: ShortcutHandlers) {
  const navigate = useNavigate()
  const location = useLocation()

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement || e.target instanceof HTMLSelectElement) return
      const key = e.key.toLowerCase()

      if (key === 'd' && !e.ctrlKey && !e.metaKey) {
        if (location.pathname !== '/daily') {
          e.preventDefault()
          navigate('/daily')
        }
        handlers.d?.()
        return
      }

      if (location.pathname !== '/' && location.pathname !== '/daily') return

      if (key === 'r' && handlers.r) { e.preventDefault(); handlers.r() }
      if (key === 'i' && handlers.i) { e.preventDefault(); handlers.i() }
      if (key === 's' && handlers.s) { e.preventDefault(); handlers.s() }
      if (key === 'b' && handlers.b) { e.preventDefault(); handlers.b() }
      if (key === 'n' && handlers.n) { e.preventDefault(); handlers.n() }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [handlers, navigate, location.pathname])
}
