const QUEUE_KEY = 'sqcdp_sync_queue'

export type SyncJobType =
  | 'dayState'
  | 'action'
  | 'actionDelete'
  | 'comment'
  | 'commentDelete'
  | 'params'
  | 'dailyReport'
  | 'equipe'

export interface SyncJob {
  id: string
  type: SyncJobType
  payload: Record<string, unknown>
  createdAt: string
}

function readQueue(): SyncJob[] {
  try {
    const raw = localStorage.getItem(QUEUE_KEY)
    return raw ? (JSON.parse(raw) as SyncJob[]) : []
  } catch {
    return []
  }
}

function writeQueue(jobs: SyncJob[]) {
  localStorage.setItem(QUEUE_KEY, JSON.stringify(jobs))
}

export function getPendingSyncCount(): number {
  return readQueue().length
}

export function enqueueSync(type: SyncJobType, payload: Record<string, unknown>) {
  const jobs = readQueue()
  const id = `${type}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
  jobs.push({ id, type, payload, createdAt: new Date().toISOString() })
  writeQueue(jobs)
  window.dispatchEvent(new CustomEvent('sqcdp-sync-change'))
  return id
}

export function clearSyncQueue() {
  writeQueue([])
  window.dispatchEvent(new CustomEvent('sqcdp-sync-change'))
}
