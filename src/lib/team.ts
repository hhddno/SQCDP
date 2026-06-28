const KEY = 'sqcdp_settings'

export interface AppSettings {
  equipe: string
  equipes: string[]
  site: string
}

const DEFAULT: AppSettings = {
  equipe: 'Ligne 1',
  equipes: ['Ligne 1', 'Ligne 2', 'Ligne 3'],
  site: 'Site principal',
}

export function getSettings(): AppSettings {
  try {
    return { ...DEFAULT, ...JSON.parse(localStorage.getItem(KEY) ?? '{}') }
  } catch {
    return DEFAULT
  }
}

export function saveSettings(s: Partial<AppSettings>) {
  const current = getSettings()
  localStorage.setItem(KEY, JSON.stringify({ ...current, ...s }))
}

export function getCurrentEquipe(): string {
  return getSettings().equipe
}

export function setEquipe(equipe: string) {
  const s = getSettings()
  const equipes = s.equipes.includes(equipe) ? s.equipes : [...s.equipes, equipe]
  saveSettings({ equipe, equipes })
  window.dispatchEvent(new CustomEvent('sqcdp-equipe-change', { detail: equipe }))
}
