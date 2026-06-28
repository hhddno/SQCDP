import { AlertTriangle, XCircle, Info, ChevronRight } from 'lucide-react'
import type { AppNotification } from '../lib/notifications'
import { Modal } from './ui/Modal'
import { Button } from './ui/Button'

interface Props {
  open: boolean
  onClose: () => void
  notifications: AppNotification[]
  onNotificationClick?: (n: AppNotification) => void
}

const levelIcon = {
  info: Info,
  warning: AlertTriangle,
  danger: XCircle,
}

const levelColor = {
  info: 'border-primary/30 bg-primary/5',
  warning: 'border-state-attention/50 bg-state-attention/10',
  danger: 'border-delete/30 bg-delete/10',
}

export function NotificationsPanel({ open, onClose, notifications, onNotificationClick }: Props) {
  return (
    <Modal open={open} onClose={onClose} title="Alertes & notifications" size="md">
      {notifications.length === 0 ? (
        <p className="text-center text-slate-500 py-8">Aucune alerte active</p>
      ) : (
        <div className="space-y-3">
          {notifications.map((n) => {
            const Icon = levelIcon[n.level]
            const clickable = !!onNotificationClick && (n.actionId || n.axeId)
            return (
              <button
                key={n.id}
                type="button"
                disabled={!clickable}
                onClick={() => clickable && onNotificationClick?.(n)}
                className={`flex w-full gap-3 rounded-xl border p-4 text-left transition ${levelColor[n.level]} ${
                  clickable ? 'hover:shadow-md cursor-pointer' : 'cursor-default'
                }`}
              >
                <Icon size={20} className="shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-slate-800">
                    {n.axeKey && <span className="text-primary mr-2">[{n.axeKey}]</span>}
                    {n.title}
                  </div>
                  <p className="text-sm text-slate-600 mt-1">{n.message}</p>
                </div>
                {clickable && <ChevronRight size={18} className="shrink-0 text-slate-400 self-center" />}
              </button>
            )
          })}
        </div>
      )}
      <div className="mt-6 flex justify-end">
        <Button variant="ghost" onClick={onClose}>Fermer</Button>
      </div>
    </Modal>
  )
}
