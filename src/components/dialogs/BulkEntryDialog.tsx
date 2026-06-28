import { useEffect, useState } from 'react'
import type { Axe, EtatKey } from '../../types'
import { Modal } from '../ui/Modal'
import { Button } from '../ui/Button'
import { useApp } from '../../context/AppContext'
import { saveDayEtat } from '../../hooks/useAxisData'
import { api } from '../../lib/api'
import { getParisDateParts } from '../../lib/utils'

interface BulkEntryDialogProps {
  open: boolean
  onClose: () => void
  onSaved: () => void
}

export function BulkEntryDialog({ open, onClose, onSaved }: BulkEntryDialogProps) {
  const { axes, labels, colors, refresh } = useApp()
  const { day } = getParisDateParts()
  const monthKey = `${getParisDateParts().year}-${String(getParisDateParts().month).padStart(2, '0')}`
  const [etats, setEtats] = useState<Record<number, EtatKey>>({})
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!open) return
    let cancelled = false
    async function prefill() {
      setLoading(true)
      const initial: Record<number, EtatKey> = {}
      for (const axe of axes) {
        const states = await api.loadDayStates(axe.id)
        const dateStr = `${monthKey}-${String(day).padStart(2, '0')}`
        const match = states.find(
          (s) => Number(s.axe_id) === axe.id && s.date?.slice(0, 10) === dateStr,
        )
        if (match?.etat) {
          const map: Record<string, EtatKey> = {
            ok: 'vert',
            attention: 'jaune',
            blocage: 'rouge',
            'non rempli': 'gris',
          }
          initial[axe.id] = map[match.etat.trim().toLowerCase()] ?? 'gris'
        }
      }
      if (!cancelled) {
        setEtats(initial)
        setLoading(false)
      }
    }
    if (axes.length) prefill()
    return () => { cancelled = true }
  }, [open, axes, monthKey, day])

  const etatOptions: EtatKey[] = ['vert', 'jaune', 'rouge', 'gris']
  const etatLabel = (k: EtatKey) => labels[k]

  const handleSave = async () => {
    setSaving(true)
    try {
      await Promise.all(
        Object.entries(etats).map(([axeId, etat]) =>
          saveDayEtat(Number(axeId), monthKey, day, etat),
        ),
      )
      await refresh()
      onSaved()
      onClose()
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal open={open} onClose={onClose} title={`Saisie rapide — Jour ${day}`} size="md">
      <p className="mb-4 text-sm text-slate-500">
        États pré-remplis avec les valeurs actuelles. Modifiez puis enregistrez.
      </p>
      {loading ? (
        <div className="flex justify-center py-8">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary/20 border-t-primary" />
        </div>
      ) : (
        <div className="space-y-4">
          {axes.map((axe: Axe) => (
            <div key={axe.id} className="rounded-xl border border-slate-100 p-4">
              <div className="mb-2 font-semibold text-primary">
                {axe.key} — {axe.label}
              </div>
              <div className="flex flex-wrap gap-2">
                {etatOptions.map((e) => (
                  <button
                    key={e}
                    type="button"
                    onClick={() => setEtats({ ...etats, [axe.id]: e })}
                    className={`flex items-center gap-2 rounded-lg border-2 px-3 py-2 text-sm transition ${
                      etats[axe.id] === e
                        ? 'border-primary bg-primary/5'
                        : 'border-transparent bg-slate-50 hover:bg-slate-100'
                    }`}
                  >
                    <span className="h-3 w-3 rounded-full" style={{ backgroundColor: colors[e] }} />
                    {etatLabel(e)}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
      <div className="mt-6 flex justify-end gap-3">
        <Button variant="ghost" onClick={onClose}>Annuler</Button>
        <Button
          onClick={handleSave}
          loading={saving}
          disabled={Object.keys(etats).length === 0 || loading}
        >
          Enregistrer tout
        </Button>
      </div>
    </Modal>
  )
}
