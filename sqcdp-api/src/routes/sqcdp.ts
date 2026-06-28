import { Router } from 'express'
import { query } from '../db.js'
import { config } from '../config.js'
import { getEquipeIdByName, resolveEquipeId } from '../services/equipe.js'
import type { SqcdpRequest } from '../middleware/context.js'

const router = Router()

const ACTION_FIELDS = `
  a.id, a.axe_id, a.probleme, a.titre, a.categorie, a.criticite, a.cause, a.auteur,
  a.porteur, a.solution, a.echeance, a.created_at, a.statut, a.code,
  a.pdca_plan, a.pdca_do, a.pdca_check, a.pdca_act,
  a.d1_equipe, a.d2_probleme, a.d3_containment, a.d4_cause_racine,
  a.d5_actions_correctives, a.d6_validation, a.d7_prevention, a.d8_cloture,
  eq.name AS equipe
`

function formatAction(row: Record<string, unknown>) {
  return {
    ...row,
    echeance: row.echeance ? String(row.echeance).slice(0, 10) : null,
    created_at: row.created_at ? String(row.created_at).slice(0, 10) : undefined,
  }
}

// --- jour_etats ---

router.get('/jour_etats', async (req: SqcdpRequest, res) => {
  const equipe = (req.query.equipe as string) || req.sqcdpEquipe
  const from = req.query.from as string | undefined
  const to = req.query.to as string | undefined

  const params: unknown[] = []
  let sql = `
    SELECT j.axe_id, j.date::text, j.etat, eq.name AS equipe
    FROM jour_etats j
    JOIN equipes eq ON eq.id = j.equipe_id
    WHERE 1=1
  `
  if (equipe) {
    params.push(equipe)
    sql += ` AND eq.name = $${params.length}`
  }
  if (from) {
    params.push(from)
    sql += ` AND j.date >= $${params.length}`
  }
  if (to) {
    params.push(to)
    sql += ` AND j.date <= $${params.length}`
  }
  sql += ' ORDER BY j.date'

  const result = await query(sql, params)
  res.json(result.rows)
})

router.post('/jour_etats', async (req: SqcdpRequest, res) => {
  const { axe_id, etat, equipe, site, jour } = req.body
  let date = req.body.date as string | undefined

  if (!axe_id || !etat) {
    return res.status(400).json({ error: 'axe_id et etat requis' })
  }

  const equipeName = String(equipe ?? req.sqcdpEquipe ?? 'Ligne 1')
  const siteName = String(site ?? req.sqcdpSite ?? config.defaultSite)
  const equipeId = await resolveEquipeId(equipeName, siteName)

  if (!date && jour) {
    const now = new Date()
    const y = now.getFullYear()
    const m = String(now.getMonth() + 1).padStart(2, '0')
    date = `${y}-${m}-${String(jour).padStart(2, '0')}`
  }
  if (!date) return res.status(400).json({ error: 'date ou jour requis' })

  await query(
    `INSERT INTO jour_etats (axe_id, equipe_id, date, etat, updated_by, updated_at)
     VALUES ($1, $2, $3, $4, $5, now())
     ON CONFLICT (axe_id, equipe_id, date) DO UPDATE SET
       etat = EXCLUDED.etat,
       updated_by = EXCLUDED.updated_by,
       updated_at = now()`,
    [axe_id, equipeId, date, etat, req.user?.id ?? null],
  )

  res.status(201).json({ axe_id, date, etat, equipe: equipeName })
})

// --- actions ---

router.get('/actions', async (req: SqcdpRequest, res) => {
  const equipe = (req.query.equipe as string) || req.sqcdpEquipe
  const params: unknown[] = []
  let sql = `SELECT ${ACTION_FIELDS} FROM actions a JOIN equipes eq ON eq.id = a.equipe_id WHERE 1=1`
  if (equipe) {
    params.push(equipe)
    sql += ` AND eq.name = $${params.length}`
  }
  sql += ' ORDER BY a.created_at DESC, a.id DESC'

  const result = await query(sql, params)
  res.json(result.rows.map((r) => formatAction(r as Record<string, unknown>)))
})

router.get('/actions/:id', async (req, res) => {
  const result = await query(
    `SELECT ${ACTION_FIELDS} FROM actions a JOIN equipes eq ON eq.id = a.equipe_id WHERE a.id = $1`,
    [req.params.id],
  )
  if (!result.rows[0]) return res.status(404).json({ error: 'Action introuvable' })
  res.json(formatAction(result.rows[0] as Record<string, unknown>))
})

router.post('/actions', async (req: SqcdpRequest, res) => {
  const body = req.body
  const equipeName = String(body.equipe ?? req.sqcdpEquipe ?? 'Ligne 1')
  const siteName = String(body.site ?? req.sqcdpSite ?? config.defaultSite)
  const equipeId = await resolveEquipeId(equipeName, siteName)

  const result = await query(
    `INSERT INTO actions (
      axe_id, equipe_id, probleme, titre, categorie, criticite, cause, auteur, porteur,
      solution, echeance, created_at, statut, code,
      pdca_plan, pdca_do, pdca_check, pdca_act,
      d1_equipe, d2_probleme, d3_containment, d4_cause_racine,
      d5_actions_correctives, d6_validation, d7_prevention, d8_cloture
    ) VALUES (
      $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,
      $15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25,$26
    ) RETURNING id`,
    [
      body.axe_id, equipeId, body.probleme, body.titre ?? null, body.categorie ?? null,
      body.criticite ?? null, body.cause ?? null, body.auteur ?? null, body.porteur,
      body.solution ?? null, body.echeance || null, body.created_at || new Date().toISOString().slice(0, 10),
      body.statut ?? 'ouverte', body.code ?? null,
      body.pdca_plan ?? null, body.pdca_do ?? null, body.pdca_check ?? null, body.pdca_act ?? null,
      body.d1_equipe ?? null, body.d2_probleme ?? null, body.d3_containment ?? null,
      body.d4_cause_racine ?? null, body.d5_actions_correctives ?? null,
      body.d6_validation ?? null, body.d7_prevention ?? null, body.d8_cloture ?? null,
    ],
  )

  const id = result.rows[0].id
  const full = await query(
    `SELECT ${ACTION_FIELDS} FROM actions a JOIN equipes eq ON eq.id = a.equipe_id WHERE a.id = $1`,
    [id],
  )
  res.status(201).json(formatAction(full.rows[0] as Record<string, unknown>))
})

router.put('/actions/:id', async (req: SqcdpRequest, res) => {
  const body = req.body
  const id = req.params.id

  let equipeId: string | null = null
  if (body.equipe) {
    equipeId = await getEquipeIdByName(body.equipe, body.site ?? req.sqcdpSite)
  }

  await query(
    `UPDATE actions SET
      axe_id = COALESCE($2, axe_id),
      equipe_id = COALESCE($3, equipe_id),
      probleme = COALESCE($4, probleme),
      titre = COALESCE($5, titre),
      categorie = COALESCE($6, categorie),
      criticite = COALESCE($7, criticite),
      cause = COALESCE($8, cause),
      auteur = COALESCE($9, auteur),
      porteur = COALESCE($10, porteur),
      solution = COALESCE($11, solution),
      echeance = COALESCE($12, echeance),
      created_at = COALESCE($13, created_at),
      statut = COALESCE($14, statut),
      code = COALESCE($15, code),
      pdca_plan = COALESCE($16, pdca_plan),
      pdca_do = COALESCE($17, pdca_do),
      pdca_check = COALESCE($18, pdca_check),
      pdca_act = COALESCE($19, pdca_act),
      d1_equipe = COALESCE($20, d1_equipe),
      d2_probleme = COALESCE($21, d2_probleme),
      d3_containment = COALESCE($22, d3_containment),
      d4_cause_racine = COALESCE($23, d4_cause_racine),
      d5_actions_correctives = COALESCE($24, d5_actions_correctives),
      d6_validation = COALESCE($25, d6_validation),
      d7_prevention = COALESCE($26, d7_prevention),
      d8_cloture = COALESCE($27, d8_cloture),
      updated_at = now()
    WHERE id = $1`,
    [
      id, body.axe_id ?? null, equipeId,
      body.probleme ?? null, body.titre ?? null, body.categorie ?? null,
      body.criticite ?? null, body.cause ?? null, body.auteur ?? null, body.porteur ?? null,
      body.solution ?? null, body.echeance ?? null, body.created_at ?? null,
      body.statut ?? null, body.code ?? null,
      body.pdca_plan ?? null, body.pdca_do ?? null, body.pdca_check ?? null, body.pdca_act ?? null,
      body.d1_equipe ?? null, body.d2_probleme ?? null, body.d3_containment ?? null,
      body.d4_cause_racine ?? null, body.d5_actions_correctives ?? null,
      body.d6_validation ?? null, body.d7_prevention ?? null, body.d8_cloture ?? null,
    ],
  )

  const full = await query(
    `SELECT ${ACTION_FIELDS} FROM actions a JOIN equipes eq ON eq.id = a.equipe_id WHERE a.id = $1`,
    [id],
  )
  if (!full.rows[0]) return res.status(404).json({ error: 'Action introuvable' })
  res.json(formatAction(full.rows[0] as Record<string, unknown>))
})

router.delete('/actions/:id', async (req, res) => {
  const result = await query('DELETE FROM actions WHERE id = $1 RETURNING id', [req.params.id])
  if (!result.rows[0]) return res.status(404).json({ error: 'Action introuvable' })
  res.status(204).send()
})

// --- commentaires ---

router.get('/commentaires', async (req: SqcdpRequest, res) => {
  const equipe = (req.query.equipe as string) || req.sqcdpEquipe
  const params: unknown[] = []
  let sql = `
    SELECT c.id, c.axe_id, c.date::text AS date, c.content, eq.name AS equipe
    FROM commentaires c
    JOIN equipes eq ON eq.id = c.equipe_id
    WHERE 1=1
  `
  if (equipe) {
    params.push(equipe)
    sql += ` AND eq.name = $${params.length}`
  }
  sql += ' ORDER BY c.date DESC'

  const result = await query(sql, params)
  res.json(result.rows)
})

router.post('/commentaires', async (req: SqcdpRequest, res) => {
  const { axe_id, date, content, equipe, site } = req.body
  if (!axe_id || !date || !content) {
    return res.status(400).json({ error: 'axe_id, date et content requis' })
  }

  const equipeName = String(equipe ?? req.sqcdpEquipe ?? 'Ligne 1')
  const siteName = String(site ?? req.sqcdpSite ?? config.defaultSite)
  const equipeId = await resolveEquipeId(equipeName, siteName)

  const result = await query(
    `INSERT INTO commentaires (axe_id, equipe_id, date, content, created_by)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING id, axe_id, date::text AS date, content`,
    [axe_id, equipeId, date, content, req.user?.id ?? null],
  )

  res.status(201).json({ ...result.rows[0], equipe: equipeName })
})

router.delete('/commentaires/:id', async (req, res) => {
  const result = await query('DELETE FROM commentaires WHERE id = $1 RETURNING id', [req.params.id])
  if (!result.rows[0]) return res.status(404).json({ error: 'Commentaire introuvable' })
  res.status(204).send()
})

export default router
