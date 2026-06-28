import { useEffect, useState } from 'react'
import { getPendingSyncCount } from '../lib/syncQueue'

export function useSyncStatus() {
  const [online, setOnline] = useState(navigator.onLine)
  const [pending, setPending] = useState(getPendingSyncCount)

  useEffect(() => {
    const refresh = () => setPending(getPendingSyncCount())
    const onOnline = () => { setOnline(true); refresh() }
    const onOffline = () => setOnline(false)

    window.addEventListener('online', onOnline)
    window.addEventListener('offline', onOffline)
    window.addEventListener('sqcdp-sync-change', refresh)

    return () => {
      window.removeEventListener('online', onOnline)
      window.removeEventListener('offline', onOffline)
      window.removeEventListener('sqcdp-sync-change', refresh)
    }
  }, [])

  return { online, pending }
}
