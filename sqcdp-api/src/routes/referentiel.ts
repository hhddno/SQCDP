import { Router } from 'express'
import { query } from '../db.js'
import { config, DEFAULT_COLORS, DEFAULT_LABELS } from '../config.js'
import { ensureSite, resolveEquipeId } from '../services/equipe.js'
import type { SqcdpRequest } from '../middleware/context.js'

const router = Router()

router.get('/axes', async (_req, res) => {
  const result = await query<{ id: number; key: string; label: string }>(
    'SELECT id, key, label FROM axes ORDER BY sort_order, id',
  )
  res.json(result.rows)
})

router.get('/sites', async (_req, res) => {
  const result = await query<{ id: string; name: string }>(
    'SELECT id, name FROM sites ORDER BY name',
  )
  res.json(result.rows)
})

router.get('/equipes', async (req: SqcdpRequest, res) => {
  const site = (req.query.site as string) || req.sqcdpSite || config.defaultSite
  const result = await query<{ id: string; name: string; site: string }>(
    `SELECT e.id, e.name, s.name AS site
     FROM equipes e
     JOIN sites s ON s.id = e.site_id
     WHERE s.name = $1 AND e.active = true
     ORDER BY e.name`,
    [site],
  )
  res.json(result.rows)
})

router.post('/equipes', async (req: SqcdpRequest, res) => {
  const name = String(req.body.name ?? '').trim()
  const site = String(req.body.site ?? req.sqcdpSite ?? config.defaultSite).trim()
  if (!name) return res.status(400).json({ error: 'name requis' })

  const id = await resolveEquipeId(name, site)
  res.status(201).json({ id, name, site })
})

router.get('/params', async (req: SqcdpRequest, res) => {
  const site = (req.query.site as string) || req.sqcdpSite || config.defaultSite
  const siteId = await ensureSite(site)

  const axes = await query<{ key: string; label: string }>(
    'SELECT key, label FROM axes ORDER BY sort_order',
  )

  const params = await query<{ colors: object; labels: object }>(
    'SELECT colors, labels FROM app_params WHERE site_id = $1',
    [siteId],
  )

  if (params.rows[0]) {
    return res.json({
      axes: axes.rows,
      colors: params.rows[0].colors,
      labels: params.rows[0].labels,
    })
  }

  res.json({
    axes: axes.rows,
    colors: DEFAULT_COLORS,
    labels: DEFAULT_LABELS,
  })
})

router.post('/params', async (req: SqcdpRequest, res) => {
  const site = String(req.body.site ?? req.sqcdpSite ?? config.defaultSite)
  const siteId = await ensureSite(site)
  const { colors, labels, axes } = req.body

  await query(
    `INSERT INTO app_params (site_id, colors, labels, axes_labels, updated_at)
     VALUES ($1, $2, $3, $4, now())
     ON CONFLICT (site_id) DO UPDATE SET
       colors = EXCLUDED.colors,
       labels = EXCLUDED.labels,
       axes_labels = EXCLUDED.axes_labels,
       updated_at = now()`,
    [siteId, JSON.stringify(colors), JSON.stringify(labels), axes ? JSON.stringify(axes) : null],
  )

  res.json({ ok: true })
})

export default router
