import type { Action, Axe, DayData, EtatKey } from '../types'
import { daysUntil } from './utils'

export type NotificationLevel = 'info' | 'warning' | 'danger'

export type NotificationKind = 'action-late' | 'action-due' | 'escalation' | 'blocage' | 'empty'

export interface AppNotification {
  id: string
  level: NotificationLevel
  kind: NotificationKind
  title: string
  message: string
  axeKey?: string
  axeId?: number
  actionId?: number
  dayIndex?: number
  date?: string
}

export function computeNotifications(
  axes: Axe[],
  actions: Action[],
  allDaysByAxe: Map<number, DayData[]>,
  monthKey: string,
): AppNotification[] {
  const notifs: AppNotification[] = []

  actions.filter((a) => a.statut === 'ouverte').forEach((a) => {
    const days = daysUntil(a.echeance)
    const axe = axes.find((x) => x.id === a.axe_id)
    if (days !== null && days < 0) {
      notifs.push({
        id: `late-${a.id}`,
        kind: 'action-late',
        level: 'danger',
        title: 'Action en retard',
        message: `${a.probleme} (${a.porteur}) — échéance dépassée`,
        axeKey: axe?.key,
        axeId: axe?.id,
        actionId: a.id,
      })
    } else if (days !== null && days <= 3) {
      notifs.push({
        id: `due-${a.id}`,
        kind: 'action-due',
        level: 'warning',
        title: 'Échéance proche',
        message: `${a.probleme} — J-${days}`,
        axeKey: axe?.key,
        axeId: axe?.id,
        actionId: a.id,
      })
    }
  })

  axes.forEach((axe) => {
    const days = allDaysByAxe.get(axe.id) ?? []
    let consecutiveJaune = 0
    let lastJauneIndex = -1
    for (let i = days.length - 1; i >= 0; i--) {
      const d = days[i]
      if (d.etat === 'jaune') {
        consecutiveJaune++
        if (lastJauneIndex < 0) lastJauneIndex = i
      } else if (d.etat !== 'gris') break
    }
    if (consecutiveJaune >= 3) {
      notifs.push({
        id: `esc-${axe.id}`,
        kind: 'escalation',
        level: 'warning',
        title: 'Escalade — Attention récurrente',
        message: `${axe.label} : ${consecutiveJaune} jours consécutifs en Attention`,
        axeKey: axe.key,
        axeId: axe.id,
        dayIndex: lastJauneIndex >= 0 ? lastJauneIndex : undefined,
      })
    }

    const blocages = days.filter((d) => d.etat === 'rouge').length
    if (blocages >= 2) {
      notifs.push({
        id: `bloc-${axe.id}-${monthKey}`,
        kind: 'blocage',
        level: 'danger',
        title: 'Blocages multiples',
        message: `${axe.label} : ${blocages} jour(s) en blocage ce mois`,
        axeKey: axe.key,
        axeId: axe.id,
      })
    }
  })

  const emptyDays = axes.reduce((acc, axe) => {
    const days = allDaysByAxe.get(axe.id) ?? []
    return acc + days.filter((d) => d.etat === 'gris').length
  }, 0)
  if (emptyDays > 50) {
    notifs.push({
      id: 'empty-many',
      kind: 'empty',
      level: 'info',
      title: 'Saisie incomplète',
      message: `${emptyDays} jours non renseignés sur le mois`,
    })
  }

  return notifs
}

export function checkEscalation(dayHistory: EtatKey[]): boolean {
  const recent = dayHistory.slice(-3)
  return recent.length === 3 && recent.every((e) => e === 'jaune')
}
