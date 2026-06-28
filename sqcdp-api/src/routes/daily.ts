import { Router } from 'express'
import { query } from '../db.js'
import { config } from '../config.js'
import { resolveEquipeId } from '../services/equipe.js'
import type { SqcdpRequest } from '../middleware/context.js'

const router = Router()

router.get('/daily_reports', async (req: SqcdpRequest, res) => {
  const equipe = (req.query.equipe as string) || req.sqcdpEquipe
  const limit = Math.min(parseInt(String(req.query.limit ?? '20'), 10), 100)

  const params: unknown[] = [limit]
  let sql = `
    SELECT d.id, d.date::text AS date, d.timer_sec, d.roulette, d.checklist,
           d.today_states, d.summary_text, d.created_at::text AS created_at,
           eq.name AS equipe
    FROM daily_reports d
    JOIN equipes eq ON eq.id = d.equipe_id
  `
  if (equipe) {
    params.unshift(equipe)
    sql += ` WHERE eq.name = $1`
    sql += ` ORDER BY d.date DESC LIMIT $2`
  } else {
    sql += ` ORDER BY d.date DESC LIMIT $1`
  }

  const result = await query(sql, params)
  res.json(result.rows)
})

router.post('/daily_reports', async (req: SqcdpRequest, res) => {
  const {
    date, equipe, site, timer_sec, roulette, checklist, today_states, summary_text,
  } = req.body

  if (!date || !summary_text) {
    return res.status(400).json({ error: 'date et summary_text requis' })
  }

  const equipeName = String(equipe ?? req.sqcdpEquipe ?? 'Ligne 1')
  const siteName = String(site ?? req.sqcdpSite ?? config.defaultSite)
  const equipeId = await resolveEquipeId(equipeName, siteName)

  const result = await query(
    `INSERT INTO daily_reports (
      equipe_id, date, timer_sec, roulette, checklist, today_states, summary_text, created_by
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    ON CONFLICT (equipe_id, date) DO UPDATE SET
      timer_sec = EXCLUDED.timer_sec,
      roulette = EXCLUDED.roulette,
      checklist = EXCLUDED.checklist,
      today_states = EXCLUDED.today_states,
      summary_text = EXCLUDED.summary_text,
      created_by = EXCLUDED.created_by
    RETURNING id, date::text AS date, timer_sec, roulette, checklist, today_states, summary_text`,
    [
      equipeId, date, timer_sec ?? 0,
      roulette ? JSON.stringify(roulette) : null,
      checklist ? JSON.stringify(checklist) : null,
      today_states ? JSON.stringify(today_states) : null,
      summary_text,
      req.user?.id ?? null,
    ],
  )

  res.status(201).json({ ...result.rows[0], equipe: equipeName, site: siteName })
})

router.post('/roulette_history', async (req: SqcdpRequest, res) => {
  const { equipe, site, results } = req.body
  if (!results) return res.status(400).json({ error: 'results requis' })

  const equipeName = String(equipe ?? req.sqcdpEquipe ?? 'Ligne 1')
  const siteName = String(site ?? req.sqcdpSite ?? config.defaultSite)
  const equipeId = await resolveEquipeId(equipeName, siteName)

  const result = await query(
    `INSERT INTO roulette_history (equipe_id, results) VALUES ($1, $2) RETURNING id, created_at`,
    [equipeId, JSON.stringify(results)],
  )

  res.status(201).json({ id: result.rows[0].id, equipe: equipeName })
})

export default router
