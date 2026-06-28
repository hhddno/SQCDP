export type AxeKey = 'S' | 'Q' | 'C' | 'D' | 'P'

export type EtatApi = 'ok' | 'attention' | 'blocage' | 'non rempli'
export type EtatKey = 'vert' | 'jaune' | 'rouge' | 'gris'

export interface Axe {
  id: number
  key: AxeKey
  label: string
}

export interface DayState {
  axe_id: number
  date: string
  etat: EtatApi
  equipe?: string
}

export interface Comment {
  id?: number
  axe_id: number
  date: string
  content: string
  equipe?: string
}

export interface Action {
  id?: number
  axe_id: number
  probleme: string
  titre?: string
  categorie?: string
  criticite?: string
  cause?: string
  auteur?: string
  porteur: string
  solution?: string
  echeance?: string | null
  created_at?: string
  statut: 'ouverte' | 'fermee'
  code?: string
  equipe?: string
  pdca_plan?: string
  pdca_do?: string
  pdca_check?: string
  pdca_act?: string
  d1_equipe?: string
  d2_probleme?: string
  d3_containment?: string
  d4_cause_racine?: string
  d5_actions_correctives?: string
  d6_validation?: string
  d7_prevention?: string
  d8_cloture?: string
}

export interface DayData {
  etat: EtatKey
  commentaires: Comment[]
  actions: Action[]
}

export interface StateColors {
  vert: string
  jaune: string
  rouge: string
  gris: string
}

export interface StateLabels {
  vert: string
  jaune: string
  rouge: string
  gris: string
}

export interface AppParams {
  axes: { key: string; label: string }[]
  colors: StateColors
  labels: StateLabels
}

export interface AxisStats {
  counts: Record<EtatKey, number>
  toutesActions: (Action & { jour: number })[]
}

export type DayType = 'work' | 'weekend' | 'holiday'

export interface SiteRecord {
  id?: string
  name: string
}

export interface EquipeRecord {
  id?: string
  name: string
  site?: string
  active?: boolean
}

export interface Organisation {
  site: string
  equipes: EquipeRecord[]
}

export interface DailyReportRecord {
  id?: string
  date: string
  equipe: string
  site?: string
  timer_sec: number
  roulette?: Record<string, string>
  checklist?: { id: string; label: string; done: boolean }[]
  today_states?: { axe_key: string; etat: string }[]
  summary_text: string
  created_at?: string
}
