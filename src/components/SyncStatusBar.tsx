import { Cloud, CloudOff, Loader2, RefreshCw } from 'lucide-react'
import { useSyncStatus } from '../hooks/useSyncStatus'

interface SyncStatusBarProps {
  apiSlow?: boolean
  onRetrySync?: () => void
  syncing?: boolean
}

export function SyncStatusBar({ apiSlow, onRetrySync, syncing }: SyncStatusBarProps) {
  const { online, pending } = useSyncStatus()

  if (online && pending === 0 && !apiSlow && !syncing) return null

  return (
    <div
      className={`flex flex-wrap items-center justify-center gap-2 border-b px-4 py-2 text-xs ${
        !online ? 'border-amber-200 bg-amber-50 text-amber-900' :
        apiSlow ? 'border-blue-200 bg-blue-50 text-blue-900' :
        'border-orange-200 bg-orange-50 text-orange-900'
      }`}
    >
      {!online ? (
        <>
          <CloudOff size={14} />
          <span>Mode hors ligne — les modifications sont enregistrées localement</span>
        </>
      ) : apiSlow ? (
        <>
          <Loader2 size={14} className="animate-spin" />
          <span>Réveil du serveur en cours (première connexion)…</span>
        </>
      ) : syncing ? (
        <>
          <RefreshCw size={14} className="animate-spin" />
          <span>Synchronisation en cours…</span>
        </>
      ) : (
        <>
          <Cloud size={14} />
          <span>{pending} modification(s) en attente de synchronisation</span>
          {onRetrySync && (
            <button type="button" onClick={onRetrySync} className="font-semibold underline">
              Synchroniser
            </button>
          )}
        </>
      )}
    </div>
  )
}
