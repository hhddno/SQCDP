import { API_BASE_URL } from '../constants'
import { getCurrentEquipe, getSettings } from '../team'
import { getApiAccessToken } from './authBridge'

const SLOW_API_MS = 8000
let lastFetchSlow = false

export function wasLastApiSlow() {
  return lastFetchSlow
}

export function buildApiUrl(
  path: string,
  query?: Record<string, string | number | undefined>,
): string {
  const base = API_BASE_URL.replace(/\/$/, '')
  const normalized = path.startsWith('/') ? path : `/${path}`
  const url = new URL(`${base}${normalized}`)
  const equipe = query?.equipe ?? getCurrentEquipe()
  const site = query?.site ?? getSettings().site
  if (equipe) url.searchParams.set('equipe', String(equipe))
  if (site) url.searchParams.set('site', String(site))
  if (query) {
    Object.entries(query).forEach(([k, v]) => {
      if (k === 'equipe' || k === 'site') return
      if (v !== undefined && v !== '') url.searchParams.set(k, String(v))
    })
  }
  return url.toString()
}

export function getApiHeaders(extra?: HeadersInit): HeadersInit {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'X-SQCDP-Equipe': getCurrentEquipe(),
    'X-SQCDP-Site': getSettings().site,
  }
  const token = getApiAccessToken()
  if (token) headers.Authorization = `Bearer ${token}`

  if (extra) {
    const h = new Headers(extra)
    h.forEach((v, k) => { headers[k] = v })
  }
  return headers
}

export async function apiFetch<T>(
  path: string,
  init?: RequestInit & { query?: Record<string, string | number | undefined> },
): Promise<T> {
  const { query, ...rest } = init ?? {}
  const url = buildApiUrl(path, query)
  const start = performance.now()
  const res = await fetch(url, {
    ...rest,
    headers: getApiHeaders(rest.headers),
  })
  lastFetchSlow = performance.now() - start > SLOW_API_MS
  if (!res.ok) throw new Error(`API error: ${res.status}`)
  if (res.status === 204) return undefined as T
  return res.json() as Promise<T>
}

export async function apiFetchVoid(
  path: string,
  init?: RequestInit & { query?: Record<string, string | number | undefined> },
): Promise<void> {
  const { query, ...rest } = init ?? {}
  const url = buildApiUrl(path, query)
  const res = await fetch(url, {
    ...rest,
    headers: getApiHeaders(rest.headers),
  })
  if (!res.ok) throw new Error(`API error: ${res.status}`)
}
