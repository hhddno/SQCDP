import { useState } from 'react'
import { MessageSquare, Plus, Trash2 } from 'lucide-react'
import type { Axe, DayData, EtatKey } from '../../types'
import { Modal } from '../ui/Modal'
import { Button } from '../ui/Button'
import { useApp } from '../../context/AppContext'
import { api } from '../../lib/api'
import { saveDayEtat } from '../../hooks/useAxisData'
import { dateForDay, formatDateJJMMAA } from '../../lib/utils'
import { ConfirmDialog } from '../ui/ConfirmDialog'

interface DayDialogProps {
  open: boolean
  onClose: () => void
  axe: Axe | null
  dayIndex: number | null
  days: DayData[]
  monthKey: string
  onAddAction: (dateStr: string) => void
  onEditAction: (id: number) => void
  onRefresh: () => void
}

export function DayDialog({
  open,
  onClose,
  axe,
  dayIndex,
  days,
  monthKey,
  onAddAction,
  onEditAction,
  onRefresh,
}: DayDialogProps) {
  const { colors, labels, refresh } = useApp()
  const [saving, setSaving] = useState(false)
  const [commentText, setCommentText] = useState('')
  const [showCommentForm, setShowCommentForm] = useState(false)
  const [confirmDeleteComment, setConfirmDeleteComment] = useState<number | null>(null)

  if (!axe || dayIndex === null) return null

  const day = days[dayIndex]
  const dayNum = dayIndex + 1
  const dateStr = dateForDay(monthKey, dayNum)
  const isToday =
    dateStr ===
    new Date().toLocaleDateString('fr-CA', { timeZone: 'Europe/Paris' })

  const etatOptions: { key: EtatKey; label: string; color: string }[] = [
    { key: 'vert', label: labels.vert, color: colors.vert },
    { key: 'jaune', label: labels.jaune, color: colors.jaune },
    { key: 'rouge', label: labels.rouge, color: colors.rouge },
    { key: 'gris', label: labels.gris, color: colors.gris },
  ]

  const handleEtatChange = async (etat: EtatKey) => {
    setSaving(true)
    try {
      await saveDayEtat(axe.id, monthKey, dayNum, etat)
      await refresh()
      onRefresh()
    } finally {
      setSaving(false)
    }
  }

  const handleAddComment = async () => {
    if (!commentText.trim()) return
    await api.addComment({ axe_id: axe.id, date: dateStr, content: commentText.trim() })
    setCommentText('')
    setShowCommentForm(false)
    await refresh()
    onRefresh()
  }

  const handleDeleteComment = async (id: number) => {
    await api.deleteComment(id)
    await refresh()
    onRefresh()
    setConfirmDeleteComment(null)
  }

  return (
    <>
    <Modal
      open={open}
      onClose={onClose}
      title={`${axe.label} — Jour ${dayNum} (${formatDateJJMMAA(dateStr)})`}
      size="lg"
    >
      <div className="space-y-6">
        <div>
          <label className="mb-2 block text-sm font-semibold text-slate-600">État du jour</label>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {etatOptions.map((o) => (
              <button
                key={o.key}
                onClick={() => handleEtatChange(o.key)}
                disabled={saving}
                className={`flex items-center gap-2 rounded-xl border-2 p-3 text-sm font-medium transition ${
                  day.etat === o.key
                    ? 'border-primary bg-primary/5 shadow-md'
                    : 'border-slate-100 hover:border-slate-200'
                }`}
              >
                <span className="h-4 w-4 rounded-full" style={{ backgroundColor: o.color }} />
                {o.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <div className="mb-3 flex items-center justify-between">
            <h3 className="font-semibold text-slate-700">
              Actions ({day.actions.length})
            </h3>
            <Button variant="action" className="!py-2 !text-xs" onClick={() => onAddAction(dateStr)}>
              <Plus size={14} />
              Ajouter
            </Button>
          </div>
          {day.actions.length === 0 ? (
            <p className="text-sm italic text-slate-400">Aucune action ce jour</p>
          ) : (
            <div className="space-y-2">
              {day.actions.map((a) => (
                <button
                  key={a.id}
                  onClick={() => a.id && onEditAction(a.id)}
                  className="w-full rounded-xl border border-slate-100 p-3 text-left transition hover:border-primary/30 hover:bg-primary/5"
                >
                  <div className="font-medium">{a.probleme}</div>
                  <div className="mt-1 text-xs text-slate-500">
                    {a.porteur} · {a.statut}
                  </div>
                </button>
              ))}
            </div>
          )}
          {!isToday && day.actions.length === 0 && (
            <p className="mt-2 text-xs text-slate-400">
              Vous pouvez créer une action rattachée à ce jour.
            </p>
          )}
        </div>

        <div>
          <div className="mb-3 flex items-center justify-between">
            <h3 className="flex items-center gap-2 font-semibold text-slate-700">
              <MessageSquare size={16} />
              Commentaires ({day.commentaires.length})
            </h3>
            <Button variant="secondary" className="!py-2 !text-xs" onClick={() => setShowCommentForm(!showCommentForm)}>
              <Plus size={14} />
              Ajouter
            </Button>
          </div>
          {showCommentForm && (
            <div className="mb-3 space-y-2">
              <textarea
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                className="w-full rounded-xl border border-slate-200 p-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                rows={3}
                placeholder="Votre commentaire..."
              />
              <Button onClick={handleAddComment} disabled={!commentText.trim()}>
                Enregistrer
              </Button>
            </div>
          )}
          <div className="space-y-2">
            {day.commentaires.map((c) => (
              <div
                key={c.id}
                className="flex items-start justify-between gap-3 rounded-xl border border-[#c8ddf4] bg-[#eaf1fb] p-3"
              >
                <p className="text-sm text-slate-700">{c.content}</p>
                {c.id && (
                  <button
                    onClick={() => setConfirmDeleteComment(c.id!)}
                    className="shrink-0 text-delete hover:text-[#a21d1d]"
                  >
                    <Trash2 size={16} />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="flex justify-end">
          <Button variant="ghost" onClick={onClose}>Fermer</Button>
        </div>
      </div>
    </Modal>
    <ConfirmDialog
      open={confirmDeleteComment !== null}
      title="Supprimer le commentaire"
      message="Ce commentaire sera définitivement supprimé."
      confirmLabel="Supprimer"
      danger
      onConfirm={() => confirmDeleteComment && handleDeleteComment(confirmDeleteComment)}
      onCancel={() => setConfirmDeleteComment(null)}
    />
    </>
  )
}
