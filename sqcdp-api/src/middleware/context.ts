import type { Request, Response, NextFunction } from 'express'
import { createRemoteJWKSet, jwtVerify } from 'jose'
import { config } from '../config.js'

export interface AuthUser {
  id: string
  email?: string
}

export interface SqcdpRequest extends Request {
  user?: AuthUser | null
  sqcdpEquipe?: string
  sqcdpSite?: string
}

let jwks: ReturnType<typeof createRemoteJWKSet> | null = null

function getJwks() {
  if (!jwks && config.supabaseUrl) {
    jwks = createRemoteJWKSet(new URL(`${config.supabaseUrl}/auth/v1/.well-known/jwks.json`))
  }
  return jwks
}

export async function contextMiddleware(req: SqcdpRequest, _res: Response, next: NextFunction) {
  req.sqcdpEquipe =
    (req.query.equipe as string) ||
    (req.headers['x-sqcdp-equipe'] as string) ||
    undefined
  req.sqcdpSite =
    (req.query.site as string) ||
    (req.headers['x-sqcdp-site'] as string) ||
    config.defaultSite

  const auth = req.headers.authorization
  if (!auth?.startsWith('Bearer ')) {
    req.user = null
    return next()
  }

  const token = auth.slice(7)
  try {
    if (config.supabaseJwtSecret) {
      const secret = new TextEncoder().encode(config.supabaseJwtSecret)
      const { payload } = await jwtVerify(token, secret)
      req.user = {
        id: String(payload.sub ?? ''),
        email: typeof payload.email === 'string' ? payload.email : undefined,
      }
    } else if (getJwks()) {
      const { payload } = await jwtVerify(token, getJwks()!)
      req.user = {
        id: String(payload.sub ?? ''),
        email: typeof payload.email === 'string' ? payload.email : undefined,
      }
    }
  } catch {
    req.user = null
  }
  next()
}

export function requireAuth(req: SqcdpRequest, res: Response, next: NextFunction) {
  if (!config.supabaseJwtSecret && !config.supabaseUrl) return next()
  if (!req.user) return res.status(401).json({ error: 'Non authentifié' })
  next()
}
