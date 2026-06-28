import type { DailyReportRecord, Organisation } from '../types'
import { getSettings, saveSettings } from './team'

const REPORTS_KEY = 'sqcdp_daily_reports_local'
const ORG_KEY = 'sqcdp_organisation_local'

export function getLocalDailyReports(equipe?: string): DailyReportRecord[] {
  try {
    const raw = localStorage.getItem(REPORTS_KEY)
    const all = raw ? (JSON.parse(raw) as DailyReportRecord[]) : []
    if (!equipe) return all
    return all.filter((r) => r.equipe === equipe)
  } catch {
    return []
  }
}

export function addLocalDailyReport(report: DailyReportRecord) {
  const all = getLocalDailyReports()
  const without = all.filter((r) => !(r.date === report.date && r.equipe === report.equipe))
  const entry: DailyReportRecord = {
    ...report,
    id: report.id ?? `local-${Date.now()}`,
    created_at: report.created_at ?? new Date().toISOString(),
  }
  without.unshift(entry)
  localStorage.setItem(REPORTS_KEY, JSON.stringify(without.slice(0, 100)))
}

export function getLocalOrganisation(): Organisation | null {
  try {
    const raw = localStorage.getItem(ORG_KEY)
    return raw ? (JSON.parse(raw) as Organisation) : null
  } catch {
    return null
  }
}

export function saveLocalOrganisation(org: Organisation) {
  localStorage.setItem(ORG_KEY, JSON.stringify(org))
  saveSettings({
    site: org.site,
    equipes: org.equipes.map((e) => e.name),
    equipe: getSettings().equipe,
  })
}

export function mergeOrganisation(apiOrg: Organisation | null): Organisation {
  const local = getLocalOrganisation()
  const settings = getSettings()
  if (apiOrg?.equipes?.length) {
    saveLocalOrganisation(apiOrg)
    return apiOrg
  }
  if (local?.equipes?.length) return local
  return {
    site: settings.site,
    equipes: settings.equipes.map((name) => ({ name, site: settings.site })),
  }
}
