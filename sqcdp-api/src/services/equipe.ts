import { query } from '../db.js'
import { config, DEFAULT_AXES } from '../config.js'

export async function ensureSite(siteName: string): Promise<string> {
  const existing = await query<{ id: string }>(
    'SELECT id FROM sites WHERE name = $1',
    [siteName],
  )
  if (existing.rows[0]) return existing.rows[0].id

  const inserted = await query<{ id: string }>(
    'INSERT INTO sites (name) VALUES ($1) RETURNING id',
    [siteName],
  )
  return inserted.rows[0].id
}

export async function resolveEquipeId(
  equipeName: string,
  siteName = config.defaultSite,
): Promise<string> {
  const siteId = await ensureSite(siteName)
  const existing = await query<{ id: string }>(
    'SELECT id FROM equipes WHERE site_id = $1 AND name = $2',
    [siteId, equipeName],
  )
  if (existing.rows[0]) return existing.rows[0].id

  const inserted = await query<{ id: string }>(
    'INSERT INTO equipes (site_id, name) VALUES ($1, $2) RETURNING id',
    [siteId, equipeName],
  )
  return inserted.rows[0].id
}

export async function getEquipeIdByName(
  equipeName: string,
  siteName?: string,
): Promise<string | null> {
  const params: string[] = [equipeName]
  let sql = `
    SELECT e.id FROM equipes e
    JOIN sites s ON s.id = e.site_id
    WHERE e.name = $1
  `
  if (siteName) {
    sql += ' AND s.name = $2'
    params.push(siteName)
  }
  const result = await query<{ id: string }>(sql, params)
  return result.rows[0]?.id ?? null
}

export async function seedIfEmpty() {
  const sites = await query('SELECT COUNT(*)::int AS n FROM sites')
  if (sites.rows[0].n > 0) return

  const siteId = await ensureSite(config.defaultSite)
  for (const name of ['Ligne 1', 'Ligne 2', 'Ligne 3']) {
    await query(
      'INSERT INTO equipes (site_id, name) VALUES ($1, $2) ON CONFLICT (site_id, name) DO NOTHING',
      [siteId, name],
    )
  }

  for (const [i, axe] of DEFAULT_AXES.entries()) {
    const exists = await query(
      'SELECT id FROM axes WHERE key = $1 AND site_id IS NULL LIMIT 1',
      [axe.key],
    )
    if (!exists.rows[0]) {
      await query(
        'INSERT INTO axes (key, label, sort_order) VALUES ($1, $2, $3)',
        [axe.key, axe.label, i + 1],
      )
    }
  }
}
