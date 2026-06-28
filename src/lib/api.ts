import type {
  Action,
  Axe,
  Comment,
  DayState,
  AppParams,
  DailyReportRecord,
  EquipeRecord,
  Organisation,
  SiteRecord,
} from '../types'
import {
  DEFAULT_AXES,
  DEFAULT_COLORS,
  DEFAULT_LABELS,
} from './constants'
import {
  addLocalAction,
  addLocalComment,
  mergeActions,
  mergeComments,
  mergeDayStates,
  removeLocalAction,
  removeLocalComment,
  updateLocalAction,
  upsertLocalDayState,
} from './localData'
import {
  addLocalDailyReport,
  getLocalDailyReports,
  mergeOrganisation,
  saveLocalOrganisation,
} from './organisation'
import { enqueueSync, type SyncJob } from './syncQueue'
import { getCurrentEquipe, getSettings } from './team'
import { apiFetch, apiFetchVoid, buildApiUrl, getApiHeaders } from './api/http'

export { wasLastApiSlow } from './api/http'

class ApiCache {
  private cache = new Map<string, unknown>()
  get<T>(key: string): T | undefined {
    return this.cache.get(key) as T | undefined
  }
  set(key: string, value: unknown) {
    this.cache.set(key, value)
  }
  invalidate(...keys: string[]) {
    keys.forEach((k) => this.cache.delete(k))
  }
  clear() {
    this.cache.clear()
  }
}

const cache = new ApiCache()

function withEquipe<T extends { equipe?: string }>(items: T[]): T[] {
  const eq = getCurrentEquipe()
  return items.filter((i) => !i.equipe || i.equipe === eq)
}

async function executeSyncJob(job: SyncJob): Promise<void> {
  const p = job.payload
  switch (job.type) {
    case 'dayState':
      await apiFetch('/jour_etats', { method: 'POST', body: JSON.stringify(p) })
      break
    case 'action': {
      const action = p as unknown as Action
      const isUpdate = !!action.id
      await apiFetch(isUpdate ? `/actions/${action.id}` : '/actions', {
        method: isUpdate ? 'PUT' : 'POST',
        body: JSON.stringify(action),
      })
      break
    }
    case 'actionDelete':
      await apiFetchVoid(`/actions/${p.id}`, { method: 'DELETE' })
      break
    case 'comment':
      await apiFetch('/commentaires', { method: 'POST', body: JSON.stringify(p) })
      break
    case 'commentDelete':
      await apiFetchVoid(`/commentaires/${p.id}`, { method: 'DELETE' })
      break
    case 'params':
      await apiFetch('/params', { method: 'POST', body: JSON.stringify(p) })
      break
    case 'dailyReport':
      await apiFetch('/daily_reports', { method: 'POST', body: JSON.stringify(p) })
      break
    case 'equipe':
      await apiFetch('/equipes', { method: 'POST', body: JSON.stringify(p) })
      break
  }
}

export async function processSyncQueue(): Promise<number> {
  const raw = localStorage.getItem('sqcdp_sync_queue')
  if (!raw) return 0
  const jobs = JSON.parse(raw) as SyncJob[]
  if (jobs.length === 0) return 0

  const remaining: SyncJob[] = []
  let processed = 0
  for (const job of jobs) {
    try {
      await executeSyncJob(job)
      processed++
    } catch {
      remaining.push(job)
    }
  }
  localStorage.setItem('sqcdp_sync_queue', JSON.stringify(remaining))
  window.dispatchEvent(new CustomEvent('sqcdp-sync-change'))
  if (processed > 0) cache.clear()
  return processed
}

export const api = {
  invalidate(...keys: string[]) {
    cache.invalidate(...keys)
  },

  clearCache() {
    cache.clear()
  },

  async loadOrganisation(): Promise<Organisation> {
    const cached = cache.get<Organisation>('organisation')
    if (cached) return cached
    try {
      const site = getSettings().site
      const [sites, equipes] = await Promise.all([
        apiFetch<SiteRecord[]>('/sites').catch(() => [] as SiteRecord[]),
        apiFetch<EquipeRecord[]>('/equipes', { query: { site } }).catch(() => [] as EquipeRecord[]),
      ])
      const siteName = sites[0]?.name ?? site
      const org: Organisation = {
        site: siteName,
        equipes: equipes.length
          ? equipes.map((e) => ({ ...e, site: e.site ?? siteName }))
          : getSettings().equipes.map((name) => ({ name, site: siteName })),
      }
      const merged = mergeOrganisation(org)
      cache.set('organisation', merged)
      return merged
    } catch {
      const merged = mergeOrganisation(null)
      cache.set('organisation', merged)
      return merged
    }
  },

  async saveEquipe(name: string): Promise<EquipeRecord> {
    const site = getSettings().site
    const payload = { name, site }
    try {
      const result = await apiFetch<EquipeRecord>('/equipes', {
        method: 'POST',
        body: JSON.stringify(payload),
      })
      cache.invalidate('organisation')
      const org = await this.loadOrganisation()
      if (!org.equipes.some((e) => e.name === name)) {
        saveLocalOrganisation({
          site: org.site,
          equipes: [...org.equipes, { name, site }],
        })
      }
      return result
    } catch {
      enqueueSync('equipe', payload)
      const org = mergeOrganisation(null)
      const next = { site: org.site, equipes: [...org.equipes, { name, site }] }
      saveLocalOrganisation(next)
      cache.invalidate('organisation')
      return { name, site }
    }
  },

  async loadDailyReports(limit = 20): Promise<DailyReportRecord[]> {
    const equipe = getCurrentEquipe()
    const key = `daily_reports_${equipe}`
    const cached = cache.get<DailyReportRecord[]>(key)
    if (cached) return cached
    try {
      const reports = await apiFetch<DailyReportRecord[]>('/daily_reports', {
        query: { equipe, limit },
      })
      const merged = [...reports, ...getLocalDailyReports(equipe)]
        .filter((r, i, arr) => arr.findIndex((x) => x.date === r.date && x.equipe === r.equipe) === i)
        .sort((a, b) => b.date.localeCompare(a.date))
        .slice(0, limit)
      cache.set(key, merged)
      return merged
    } catch {
      const local = getLocalDailyReports(equipe).slice(0, limit)
      cache.set(key, local)
      return local
    }
  },

  async saveDailyReport(report: DailyReportRecord): Promise<DailyReportRecord> {
    const equipe = report.equipe || getCurrentEquipe()
    const payload: DailyReportRecord = {
      ...report,
      equipe,
      site: report.site ?? getSettings().site,
    }
    try {
      const result = await apiFetch<DailyReportRecord>('/daily_reports', {
        method: 'POST',
        body: JSON.stringify(payload),
      })
      addLocalDailyReport(result)
      cache.invalidate(`daily_reports_${equipe}`)
      return result
    } catch {
      enqueueSync('dailyReport', payload as unknown as Record<string, unknown>)
      addLocalDailyReport(payload)
      cache.invalidate(`daily_reports_${equipe}`)
      return payload
    }
  },

  async loadAxes(): Promise<Axe[]> {
    const cached = cache.get<Axe[]>('axes')
    if (cached) return cached
    try {
      const axes = await apiFetch<Axe[]>('/axes')
      if (Array.isArray(axes) && axes.length > 0) {
        const filtered = axes.filter((a) => (a.key as string) !== 'DCP')
        cache.set('axes', filtered)
        return filtered
      }
    } catch {
      /* fallback */
    }
    cache.set('axes', DEFAULT_AXES)
    return DEFAULT_AXES
  },

  async loadParams(): Promise<AppParams | null> {
    const cached = cache.get<AppParams>('params')
    if (cached) return cached
    try {
      const params = await apiFetch<AppParams>('/params')
      if (params?.colors && params?.labels) {
        cache.set('params', params)
        cache.set('colors', params.colors)
        cache.set('labels', params.labels)
        return params
      }
    } catch {
      /* fallback local */
    }
    try {
      const stored = localStorage.getItem('sqcdp_params_local')
      if (stored) {
        const params = JSON.parse(stored) as AppParams
        cache.set('params', params)
        cache.set('colors', params.colors)
        cache.set('labels', params.labels)
        return params
      }
    } catch { /* ignore */ }
    return null
  },

  async loadDayStates(axeId?: number): Promise<DayState[]> {
    const equipe = getCurrentEquipe()
    const key = axeId ? `jour_etats_${axeId}_${equipe}` : `jour_etats_${equipe}`
    const cached = cache.get<DayState[]>(key)
    if (cached) return cached
    let apiStates: DayState[] = []
    try {
      apiStates = withEquipe(await apiFetch<DayState[]>('/jour_etats'))
      if (axeId) apiStates = apiStates.filter((s) => Number(s.axe_id) === axeId)
    } catch {
      apiStates = []
    }
    const merged = axeId ? mergeDayStates(apiStates, axeId, equipe) : apiStates
    cache.set(key, merged)
    return merged
  },

  async saveDayState(jour: number, axe_id: number, etat: string, date?: string): Promise<void> {
    const equipe = getCurrentEquipe()
    const site = getSettings().site
    const payload: Record<string, unknown> = { jour, axe_id, etat, equipe, site }
    if (date) payload.date = date

    const dateStr =
      date ??
      (() => {
        const now = new Date()
        const p = { timeZone: 'Europe/Paris' as const }
        const y = now.toLocaleString('fr-FR', { ...p, year: 'numeric' })
        const m = now.toLocaleString('fr-FR', { ...p, month: '2-digit' })
        return `${y}-${m}-${String(jour).padStart(2, '0')}`
      })()

    try {
      await apiFetch('/jour_etats', { method: 'POST', body: JSON.stringify(payload) })
    } catch {
      enqueueSync('dayState', payload)
    }

    upsertLocalDayState({ axe_id, date: dateStr, etat: etat as DayState['etat'], equipe })
    cache.invalidate('jour_etats', `jour_etats_${axe_id}`, `jour_etats_${axe_id}_${equipe}`, 'monthlyData')
  },

  async loadActions(): Promise<Action[]> {
    const equipe = getCurrentEquipe()
    const key = `actions_${equipe}`
    const cached = cache.get<Action[]>(key)
    if (cached) return cached
    let apiActions: Action[] = []
    try {
      apiActions = withEquipe(await apiFetch<Action[]>('/actions'))
    } catch {
      apiActions = []
    }
    const merged = mergeActions(apiActions, equipe)
    cache.set(key, merged)
    return merged
  },

  async getAction(id: number): Promise<Action> {
    return apiFetch<Action>(`/actions/${id}`)
  },

  async saveAction(action: Action): Promise<Action> {
    const equipe = action.equipe ?? getCurrentEquipe()
    const withEquipe: Action = { ...action, equipe }
    const isUpdate = !!withEquipe.id
    let result = withEquipe
    try {
      result = await apiFetch<Action>(isUpdate ? `/actions/${withEquipe.id}` : '/actions', {
        method: isUpdate ? 'PUT' : 'POST',
        body: JSON.stringify(withEquipe),
      })
    } catch {
      enqueueSync('action', withEquipe as unknown as Record<string, unknown>)
      if (isUpdate) updateLocalAction(withEquipe)
      else addLocalAction(withEquipe)
    }
    cache.invalidate('actions', `actions_${equipe}`, 'monthlyData')
    return result
  },

  async deleteAction(id: number): Promise<void> {
    const equipe = getCurrentEquipe()
    try {
      await apiFetchVoid(`/actions/${id}`, { method: 'DELETE' })
    } catch {
      enqueueSync('actionDelete', { id })
      removeLocalAction(id)
    }
    cache.invalidate('actions', `actions_${equipe}`, 'monthlyData')
  },

  async loadCommentaires(): Promise<Comment[]> {
    const equipe = getCurrentEquipe()
    const key = `commentaires_${equipe}`
    const cached = cache.get<Comment[]>(key)
    if (cached) return cached
    let apiComments: Comment[] = []
    try {
      apiComments = withEquipe(await apiFetch<Comment[]>('/commentaires'))
    } catch {
      apiComments = []
    }
    const merged = mergeComments(apiComments, equipe)
    cache.set(key, merged)
    return merged
  },

  async addComment(comment: Omit<Comment, 'id'>): Promise<Comment> {
    const equipe = comment.equipe ?? getCurrentEquipe()
    const withEquipe = { ...comment, equipe }
    let result: Comment
    try {
      result = await apiFetch<Comment>('/commentaires', {
        method: 'POST',
        body: JSON.stringify(withEquipe),
      })
    } catch {
      enqueueSync('comment', withEquipe as unknown as Record<string, unknown>)
      result = { ...withEquipe, id: Date.now() }
      addLocalComment(result)
    }
    cache.invalidate('commentaires', `commentaires_${equipe}`, 'monthlyData')
    return result
  },

  async deleteComment(id: number): Promise<void> {
    const equipe = getCurrentEquipe()
    try {
      await apiFetchVoid(`/commentaires/${id}`, { method: 'DELETE' })
    } catch {
      enqueueSync('commentDelete', { id })
      removeLocalComment(id)
    }
    cache.invalidate('commentaires', `commentaires_${equipe}`, 'monthlyData')
  },

  async saveParams(params: AppParams): Promise<void> {
    try {
      await apiFetch('/params', { method: 'POST', body: JSON.stringify(params) })
    } catch {
      enqueueSync('params', params as unknown as Record<string, unknown>)
    }
    localStorage.setItem('sqcdp_params_local', JSON.stringify(params))
    cache.set('params', params)
    cache.set('colors', params.colors)
    cache.set('labels', params.labels)
  },

  getColors() {
    return cache.get('colors') ?? DEFAULT_COLORS
  },

  getLabels() {
    return cache.get('labels') ?? DEFAULT_LABELS
  },

  setLocalParams(colors: typeof DEFAULT_COLORS, labels: typeof DEFAULT_LABELS) {
    cache.set('colors', colors)
    cache.set('labels', labels)
  },
}

// Compat tests / imports directs
export { buildApiUrl, getApiHeaders }
