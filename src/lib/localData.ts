import type { Action, Comment, DayState } from '../types'
import { getCurrentEquipe } from './team'

const STORAGE_KEY = 'sqcdp_local_data'

interface LocalData {
  dayStates: DayState[]
  actions: Action[]
  comments: Comment[]
  deletedActionIds: number[]
  deletedCommentIds: number[]
}

function read(): LocalData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return { dayStates: [], actions: [], comments: [], deletedActionIds: [], deletedCommentIds: [] }
    const parsed = JSON.parse(raw) as Partial<LocalData>
    return {
      dayStates: parsed.dayStates ?? [],
      actions: parsed.actions ?? [],
      comments: parsed.comments ?? [],
      deletedActionIds: parsed.deletedActionIds ?? [],
      deletedCommentIds: parsed.deletedCommentIds ?? [],
    }
  } catch {
    return { dayStates: [], actions: [], comments: [], deletedActionIds: [], deletedCommentIds: [] }
  }
}

function write(data: LocalData) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
}

export function getLocalDayStates(axeId?: number, equipe = getCurrentEquipe()): DayState[] {
  let states = read().dayStates.filter((s) => !s.equipe || s.equipe === equipe)
  if (axeId == null) return states
  return states.filter((s) => Number(s.axe_id) === axeId)
}

export function upsertLocalDayState(state: DayState) {
  const data = read()
  const equipe = state.equipe ?? getCurrentEquipe()
  const date = state.date.slice(0, 10)
  const idx = data.dayStates.findIndex(
    (s) =>
      Number(s.axe_id) === Number(state.axe_id) &&
      s.date.slice(0, 10) === date &&
      (s.equipe ?? equipe) === equipe,
  )
  const entry = { ...state, date, equipe }
  if (idx >= 0) data.dayStates[idx] = entry
  else data.dayStates.push(entry)
  write(data)
}

export function getLocalActions(): Action[] {
  return read().actions
}

export function addLocalAction(action: Action) {
  const data = read()
  const id = action.id ?? Date.now() + Math.floor(Math.random() * 1000)
  data.actions.push({ ...action, id, equipe: action.equipe ?? getCurrentEquipe() })
  write(data)
}

export function updateLocalAction(action: Action) {
  const data = read()
  const idx = data.actions.findIndex((a) => a.id === action.id)
  if (idx >= 0) data.actions[idx] = action
  else data.actions.push(action)
  write(data)
}

export function removeLocalAction(id: number) {
  const data = read()
  data.actions = data.actions.filter((a) => a.id !== id)
  if (!data.deletedActionIds.includes(id)) data.deletedActionIds.push(id)
  write(data)
}

export function getLocalComments(): Comment[] {
  return read().comments
}

export function addLocalComment(comment: Comment) {
  const data = read()
  const equipe = comment.equipe ?? getCurrentEquipe()
  const date = comment.date.slice(0, 10)
  data.comments = data.comments.filter(
    (c) =>
      !(
        Number(c.axe_id) === Number(comment.axe_id) &&
        c.date.slice(0, 10) === date &&
        (c.equipe ?? equipe) === equipe
      ),
  )
  const id = comment.id ?? Date.now() + Math.floor(Math.random() * 1000)
  data.comments.push({ ...comment, id, date, equipe })
  write(data)
}

export function removeLocalComment(id: number) {
  const data = read()
  data.comments = data.comments.filter((c) => c.id !== id)
  if (!data.deletedCommentIds.includes(id)) data.deletedCommentIds.push(id)
  write(data)
}

export function clearLocalData() {
  localStorage.removeItem(STORAGE_KEY)
}

export function mergeDayStates(apiStates: DayState[], axeId: number, equipe = getCurrentEquipe()): DayState[] {
  const local = getLocalDayStates(axeId, equipe)
  const map = new Map<string, DayState>()
  apiStates
    .filter((s) => Number(s.axe_id) === axeId)
    .forEach((s) => map.set(s.date.slice(0, 10), s))
  local.forEach((s) => map.set(s.date.slice(0, 10), s))
  return Array.from(map.values())
}

export function mergeActions(apiActions: Action[], equipe = getCurrentEquipe()): Action[] {
  const data = read()
  const deleted = new Set(data.deletedActionIds)
  const merged = apiActions.filter((a) => !a.id || !deleted.has(a.id))
  const keys = new Set(merged.map((a) => `${a.axe_id}-${a.created_at}-${a.probleme}`))
  data.actions.forEach((a) => {
    if (a.equipe && a.equipe !== equipe) return
    const key = `${a.axe_id}-${a.created_at}-${a.probleme}`
    if (!keys.has(key) && (!a.id || !deleted.has(a.id))) merged.push(a)
  })
  return merged
}

export function mergeComments(apiComments: Comment[], equipe = getCurrentEquipe()): Comment[] {
  const data = read()
  const deleted = new Set(data.deletedCommentIds)
  const byAxeDate = new Map<string, Comment>()
  apiComments
    .filter((c) => !c.id || !deleted.has(c.id))
    .forEach((c) => {
      byAxeDate.set(`${c.axe_id}-${c.date.slice(0, 10)}`, c)
    })
  data.comments.forEach((c) => {
    if (c.equipe && c.equipe !== equipe) return
    if (c.id && deleted.has(c.id)) return
    byAxeDate.set(`${c.axe_id}-${c.date.slice(0, 10)}`, c)
  })
  return Array.from(byAxeDate.values())
}
