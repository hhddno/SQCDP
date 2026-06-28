import { useEffect, useState } from 'react'
import { Trash2, LayoutTemplate } from 'lucide-react'
import type { Action, Axe } from '../../types'
import { Modal } from '../ui/Modal'
import { Button } from '../ui/Button'
import { api } from '../../lib/api'
import { useApp } from '../../context/AppContext'
import { useToast } from '../../context/ToastContext'
import { useAuth } from '../../context/AuthContext'
import { getParisDateParts } from '../../lib/utils'
import { ACTION_TEMPLATES, applyTemplate } from '../../lib/templates'
import { logAudit } from '../../lib/auditLog'
import { getCurrentEquipe } from '../../lib/team'
import { ConfirmDialog } from '../ui/ConfirmDialog'

interface ActionDialogProps {
  open: boolean
  onClose: () => void
  axe: Axe | null
  actionId?: number | null
  defaultDate?: string
  onSaved: () => void
}

type Tab = 'general' | 'pdca' | '8d'

const emptyAction = (axeId: number, createdAt?: string): Action => ({
  axe_id: axeId,
  probleme: '',
  porteur: '',
  statut: 'ouverte',
  equipe: getCurrentEquipe(),
  created_at: createdAt ?? (() => {
    const { year, month, day } = getParisDateParts()
    return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
  })(),
})

export function ActionDialog({ open, onClose, axe, actionId, defaultDate, onSaved }: ActionDialogProps) {
  const { refresh } = useApp()
  const toast = useToast()
  const { user } = useAuth()
  const [action, setAction] = useState<Action | null>(null)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [tab, setTab] = useState<Tab>('general')
  const [confirmDelete, setConfirmDelete] = useState(false)

  useEffect(() => {
    if (!open || !axe) return
    setTab('general')
    if (actionId) {
      setLoading(true)
      api.getAction(actionId).then(setAction).catch(() => {
        api.loadActions().then((all) => {
          const found = all.find((a) => a.id === actionId)
          if (found) setAction(found)
        })
      }).finally(() => setLoading(false))
    } else {
      setAction(emptyAction(axe.id, defaultDate))
    }
  }, [open, axe, actionId, defaultDate])

  const update = (field: keyof Action, value: string) => {
    setAction((prev) => (prev ? { ...prev, [field]: value } : prev))
  }

  const applyTpl = (id: string) => {
    const t = ACTION_TEMPLATES.find((x) => x.id === id)
    if (!t || !axe) return
    setAction((prev) => ({ ...prev!, ...applyTemplate(t, axe.id) }))
    toast.success(`Modèle « ${t.label} » appliqué`)
  }

  const handleSave = async () => {
    if (!action || !action.probleme.trim() || !action.porteur.trim()) return
    setSaving(true)
    try {
      await api.saveAction(action)
      logAudit(actionId ? 'Modification action' : 'Création action', action.probleme, user?.email)
      await refresh()
      onSaved()
      onClose()
      toast.success('Action enregistrée')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!action?.id) return
    await api.deleteAction(action.id)
    logAudit('Suppression action', action.probleme, user?.email)
    await refresh()
    onSaved()
    onClose()
    toast.success('Action supprimée')
    setConfirmDelete(false)
  }

  if (!action) return null

  const tabs: { id: Tab; label: string }[] = [
    { id: 'general', label: 'Général' },
    { id: 'pdca', label: 'PDCA' },
    { id: '8d', label: '8D' },
  ]

  const generalFields: { key: keyof Action; label: string; required?: boolean; type?: string }[] = [
    { key: 'probleme', label: 'Problème', required: true },
    { key: 'porteur', label: 'Porteur', required: true },
    { key: 'categorie', label: 'Catégorie' },
    { key: 'criticite', label: 'Criticité' },
    { key: 'cause', label: 'Cause' },
    { key: 'echeance', label: 'Échéance', type: 'date' },
  ]

  const pdcaFields: { key: keyof Action; label: string }[] = [
    { key: 'pdca_plan', label: 'Plan' },
    { key: 'pdca_do', label: 'Do (Faire)' },
    { key: 'pdca_check', label: 'Check (Vérifier)' },
    { key: 'pdca_act', label: 'Act (Agir)' },
  ]

  const d8Fields: { key: keyof Action; label: string }[] = [
    { key: 'd1_equipe', label: 'D1 — Équipe' },
    { key: 'd2_probleme', label: 'D2 — Problème' },
    { key: 'd3_containment', label: 'D3 — Containment' },
    { key: 'd4_cause_racine', label: 'D4 — Cause racine' },
    { key: 'd5_actions_correctives', label: 'D5 — Actions correctives' },
    { key: 'd6_validation', label: 'D6 — Validation' },
    { key: 'd7_prevention', label: 'D7 — Prévention' },
    { key: 'd8_cloture', label: 'D8 — Clôture' },
  ]

  return (
    <>
    <Modal open={open} onClose={onClose} title={actionId ? 'Modifier l\'action' : 'Nouvelle action'} size="lg">
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary/20 border-t-primary" />
        </div>
      ) : (
        <div className="space-y-4">
          {!actionId && (
            <div className="flex flex-wrap gap-2">
              <span className="text-xs font-medium text-slate-500 flex items-center gap-1 w-full">
                <LayoutTemplate size={14} /> Modèles
              </span>
              {ACTION_TEMPLATES.map((t) => (
                <button
                  key={t.id}
                  onClick={() => applyTpl(t.id)}
                  className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs hover:border-primary hover:bg-primary/5"
                >
                  {t.label}
                </button>
              ))}
            </div>
          )}

          <div className="flex gap-2 border-b border-slate-100 pb-2">
            {tabs.map((t) => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`rounded-lg px-4 py-2 text-sm font-medium transition ${tab === t.id ? 'bg-primary text-white' : 'text-slate-600 hover:bg-slate-100'}`}
              >
                {t.label}
              </button>
            ))}
          </div>

          {tab === 'general' && (
            <div className="grid gap-4 sm:grid-cols-2">
              {generalFields.map((f) => (
                <div key={f.key} className={f.key === 'probleme' ? 'sm:col-span-2' : ''}>
                  <label className="mb-1 block text-sm font-medium text-slate-600">{f.label}{f.required && ' *'}</label>
                  <input
                    type={f.type ?? 'text'}
                    value={(action[f.key] as string) ?? ''}
                    onChange={(e) => update(f.key, e.target.value)}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-primary"
                  />
                </div>
              ))}
              <div className="sm:col-span-2">
                <label className="mb-1 block text-sm font-medium text-slate-600">Solution</label>
                <textarea value={action.solution ?? ''} onChange={(e) => update('solution', e.target.value)} className="w-full rounded-xl border border-slate-200 p-3 text-sm outline-none focus:border-primary" rows={3} />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-600">Statut</label>
                <select value={action.statut} onChange={(e) => update('statut', e.target.value)} className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm">
                  <option value="ouverte">Ouverte</option>
                  <option value="fermee">Fermée</option>
                </select>
              </div>
            </div>
          )}

          {tab === 'pdca' && (
            <div className="space-y-3">
              {pdcaFields.map((f) => (
                <div key={f.key}>
                  <label className="mb-1 block text-sm font-medium text-slate-600">{f.label}</label>
                  <textarea value={(action[f.key] as string) ?? ''} onChange={(e) => update(f.key, e.target.value)} className="w-full rounded-xl border border-slate-200 p-3 text-sm outline-none focus:border-primary" rows={2} />
                </div>
              ))}
            </div>
          )}

          {tab === '8d' && (
            <div className="space-y-3 max-h-[50vh] overflow-y-auto">
              {d8Fields.map((f) => (
                <div key={f.key}>
                  <label className="mb-1 block text-sm font-medium text-slate-600">{f.label}</label>
                  <textarea value={(action[f.key] as string) ?? ''} onChange={(e) => update(f.key, e.target.value)} className="w-full rounded-xl border border-slate-200 p-3 text-sm outline-none focus:border-primary" rows={2} />
                </div>
              ))}
            </div>
          )}

          <div className="flex flex-wrap justify-between gap-3 pt-4">
            {action.id && (
              <Button variant="danger" onClick={() => setConfirmDelete(true)}>
                <Trash2 size={16} />
                Supprimer
              </Button>
            )}
            <div className="ml-auto flex gap-3">
              <Button variant="ghost" onClick={onClose}>Annuler</Button>
              <Button onClick={handleSave} loading={saving} disabled={!action.probleme.trim() || !action.porteur.trim()}>
                Enregistrer
              </Button>
            </div>
          </div>
        </div>
      )}
    </Modal>
    <ConfirmDialog
      open={confirmDelete}
      title="Supprimer l'action"
      message="Cette action sera définitivement supprimée."
      confirmLabel="Supprimer"
      danger
      onConfirm={handleDelete}
      onCancel={() => setConfirmDelete(false)}
    />
    </>
  )
}
