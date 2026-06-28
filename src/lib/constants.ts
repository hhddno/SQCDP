import type { Axe, StateColors, StateLabels } from '../types'

export const API_BASE_URL =
  (import.meta.env.VITE_API_BASE_URL as string | undefined)?.replace(/\/$/, '') ||
  'https://sqcdp-api.onrender.com'

export const DEFAULT_AXES: Axe[] = [
  { id: 1, key: 'S', label: 'Sécurité' },
  { id: 2, key: 'Q', label: 'Qualité' },
  { id: 3, key: 'C', label: 'Coût' },
  { id: 4, key: 'D', label: 'Délai' },
  { id: 5, key: 'P', label: 'Personnel' },
]

export const DEFAULT_COLORS: StateColors = {
  vert: '#53c15e',
  jaune: '#ffe066',
  rouge: '#ec5353',
  gris: '#e0e0e0',
}

export const DEFAULT_LABELS: StateLabels = {
  vert: 'OK',
  jaune: 'Attention',
  rouge: 'Blocage',
  gris: 'Non rempli',
}

export const ETAT_API_TO_KEY = {
  ok: 'vert',
  attention: 'jaune',
  blocage: 'rouge',
  'non rempli': 'gris',
} as const

export const ETAT_KEY_TO_API = {
  vert: 'ok',
  jaune: 'attention',
  rouge: 'blocage',
  gris: 'non rempli',
} as const

export const ROULETTE_ROLES = [
  { id: 'scribe', label: 'Scribe', emoji: '📝' },
  { id: 'animateur', label: 'Animateur', emoji: '🎤' },
  { id: 'leader', label: 'Leader Éveilleur', emoji: '💡' },
  { id: 'meta', label: 'Meta', emoji: '🔄' },
  { id: 'timekeeper', label: 'Time Keeper', emoji: '⏱️' },
] as const

export const WHEEL_COLORS = [
  '#ff6b6b', '#4ecdc4', '#45b7b8', '#f9ca24', '#f0932b',
  '#eb4d4b', '#6c5ce7', '#a29bfe', '#fd79a8', '#fdcb6e',
  '#e17055', '#00b894', '#00cec9', '#0984e3',
]
