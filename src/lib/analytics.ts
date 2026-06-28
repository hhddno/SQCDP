import type { Axe } from '../types'
import { buildMonthDays, computeStats } from '../hooks/useAxisData'
import type { Action, Comment } from '../types'
import { generateMonthOptions, getCurrentMonthYearKey } from './utils'

export interface MonthTrend {
  monthKey: string
  label: string
  vert: number
  jaune: number
  rouge: number
  gris: number
  pctOk: number
}

export interface TeamBenchmark {
  equipe: string
  pctOk: number
  actionsOuvertes: number
  actionsRetard: number
}

export async function computeTrends(  axes: Axe[],
  actions: Action[],
  comments: Comment[],
  monthsBack = 6,
): Promise<MonthTrend[]> {
  const options = generateMonthOptions()
  const currentKey = getCurrentMonthYearKey()
  const endIdx = options.findIndex((o) => o.value === currentKey)
  const end = endIdx >= 0 ? endIdx : options.length - 1
  const slice = options.slice(Math.max(0, end - monthsBack + 1), end + 1)

  const trends: MonthTrend[] = []
  for (const opt of slice) {
    let vert = 0, jaune = 0, rouge = 0, gris = 0
    for (const axe of axes) {
      const days = await buildMonthDays(axe, opt.value, actions, comments)
      const s = computeStats(days)
      vert += s.counts.vert
      jaune += s.counts.jaune
      rouge += s.counts.rouge
      gris += s.counts.gris
    }
    const total = vert + jaune + rouge + gris
    trends.push({
      monthKey: opt.value,
      label: opt.label.split(' ')[0].slice(0, 3),
      vert,
      jaune,
      rouge,
      gris,
      pctOk: total ? Math.round((vert / total) * 100) : 0,
    })
  }
  return trends
}

export function computeKPIs(actions: Action[]) {
  const open = actions.filter((a) => a.statut === 'ouverte')
  const now = new Date()
  now.setHours(0, 0, 0, 0)
  const late = open.filter((a) => {
    if (!a.echeance) return false
    const d = new Date(a.echeance)
    d.setHours(0, 0, 0, 0)
    return d < now
  })
  const closed = actions.filter((a) => a.statut === 'fermee')
  const closureRate = actions.length
    ? Math.round((closed.length / actions.length) * 100)
    : 0
  return {
    totalActions: actions.length,
    openActions: open.length,
    lateActions: late.length,
    closureRate,
  }
}

export function getTeamBenchmarks(): TeamBenchmark[] {
  try {
    const raw = localStorage.getItem('sqcdp_team_stats')
    if (!raw) return []
    return JSON.parse(raw)
  } catch {
    return []
  }
}

export function saveTeamBenchmark(b: TeamBenchmark) {
  const all = getTeamBenchmarks().filter((x) => x.equipe !== b.equipe)
  all.push(b)
  localStorage.setItem('sqcdp_team_stats', JSON.stringify(all))
}

export function getWeekDays(weekOffset = 0): { date: string; dayNum: number; label: string }[] {
  const { year, month, day } = (() => {
    const now = new Date()
    const p = { timeZone: 'Europe/Paris' as const }
    return {
      year: parseInt(now.toLocaleString('fr-FR', { ...p, year: 'numeric' }), 10),
      month: parseInt(now.toLocaleString('fr-FR', { ...p, month: 'numeric' }), 10),
      day: parseInt(now.toLocaleString('fr-FR', { ...p, day: 'numeric' }), 10),
    }
  })()
  const today = new Date(year, month - 1, day)
  const dayOfWeek = today.getDay() || 7
  const monday = new Date(today)
  monday.setDate(today.getDate() - (dayOfWeek - 1) + weekOffset * 7)

  const days: { date: string; dayNum: number; label: string }[] = []
  for (let i = 0; i < 7; i++) {
    const d = new Date(monday)
    d.setDate(monday.getDate() + i)
    const date = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    days.push({
      date,
      dayNum: d.getDate(),
      label: d.toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' }),
    })
  }
  return days
}
