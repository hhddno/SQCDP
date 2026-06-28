import type { Action, Axe, EtatKey } from '../types'
import type { AppNotification } from './notifications'
import { ROULETTE_ROLES } from './constants'
import { getParisDateParts } from './utils'

export interface DailyReportData {
  date: string
  equipe: string
  timerSec: number
  rouletteResults: Record<string, string>
  todayStates: { axe: Axe; etat: EtatKey }[]
  openActions: Action[]
  notifications: AppNotification[]
  checklist: { id: string; label: string; done: boolean }[]
}

export function buildDailyReportText(data: DailyReportData): string {
  const lines: string[] = [
    `COMPTE-RENDU DAILY SQCDP`,
    `Date : ${data.date}`,
    `Équipe : ${data.equipe}`,
    `Durée : ${Math.floor(data.timerSec / 60)} min ${data.timerSec % 60} s`,
    '',
  ]

  if (Object.keys(data.rouletteResults).length > 0) {
    lines.push('--- Rôles ---')
    ROULETTE_ROLES.forEach((r) => {
      lines.push(`${r.label} : ${data.rouletteResults[r.id] ?? '—'}`)
    })
    lines.push('')
  }

  lines.push('--- États du jour ---')
  data.todayStates.forEach(({ axe, etat }) => {
    lines.push(`${axe.key} (${axe.label}) : ${etat}`)
  })
  lines.push('')

  if (data.notifications.length > 0) {
    lines.push('--- Alertes ---')
    data.notifications.forEach((n) => lines.push(`[${n.level}] ${n.title} — ${n.message}`))
    lines.push('')
  }

  if (data.openActions.length > 0) {
    lines.push('--- Actions ouvertes ---')
    data.openActions.forEach((a) => {
      lines.push(`• ${a.probleme} (${a.porteur})${a.echeance ? ` — échéance ${a.echeance}` : ''}`)
    })
    lines.push('')
  }

  const doneChecklist = data.checklist.filter((c) => c.done)
  if (doneChecklist.length > 0) {
    lines.push('--- Points abordés ---')
    doneChecklist.forEach((c) => lines.push(`✓ ${c.label}`))
  }

  return lines.join('\n')
}

export function downloadDailyReport(data: DailyReportData) {
  const text = buildDailyReportText(data)
  const blob = new Blob([text], { type: 'text/plain;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `daily_sqcdp_${data.date}_${data.equipe.replace(/\s+/g, '_')}.txt`
  a.click()
  URL.revokeObjectURL(url)
}

export const DAILY_CHECKLIST = [
  { id: 'safety', label: 'Revue sécurité (incidents, EPI)' },
  { id: 'quality', label: 'Points qualité & non-conformités' },
  { id: 'cost', label: 'Coût / gaspillage / surconsommation' },
  { id: 'delivery', label: 'Délais & livraisons' },
  { id: 'people', label: 'Personnel & organisation' },
  { id: 'actions', label: 'Revue des actions ouvertes' },
  { id: 'escalation', label: 'Points à escalader' },
] as const

export function getTodayDateStr(): string {
  const { year, month, day } = getParisDateParts()
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}
