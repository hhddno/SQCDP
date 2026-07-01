import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { query, pool } from '../db.js'
import { config, DEFAULT_AXES } from '../config.js'
import { resolveEquipeId, seedIfEmpty } from '../services/equipe.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const DEMO_DIR = path.resolve(__dirname, '../../../demo-data')

const DEMO_FILES = [
  'demo_01_etats_juin2026.csv',
  'demo_02_actions_commentaires.csv',
  'demo_03_mise_a_jour_etats.csv',
]

const AXE_LABELS: Record<string, string> = {
  sécurité: 'S',
  securite: 'S',
  qualité: 'Q',
  qualite: 'Q',
  coût: 'C',
  cout: 'C',
  délai: 'D',
  delai: 'D',
  personnel: 'P',
  s: 'S',
  q: 'Q',
  c: 'C',
  d: 'D',
  p: 'P',
}

function parseCSV(content: string): Record<string, string>[] {
  const lines = content.replace(/^\ufeff/, '').split(/\r?\n/).filter((l) => l.trim())
  if (lines.length < 2) return []
  const headers = lines[0].split(';').map((h) => h.trim())
  return lines.slice(1).map((line) => {
    const values = line.split(';')
    const row: Record<string, string> = {}
    headers.forEach((h, i) => {
      row[h] = values[i]?.trim() ?? ''
    })
    return row
  })
}

async function loadAxeIds(): Promise<Map<string, number>> {
  const result = await query<{ id: number; key: string; label: string }>(
    'SELECT id, key, label FROM axes WHERE site_id IS NULL ORDER BY sort_order',
  )
  const map = new Map<string, number>()
  for (const row of result.rows) {
    map.set(row.key.toLowerCase(), row.id)
    map.set(row.label.toLowerCase(), row.id)
  }
  return map
}

function resolveAxeId(axes: Map<string, number>, label: string): number | null {
  const norm = label.trim().toLowerCase()
  const key = AXE_LABELS[norm] ?? norm
  return axes.get(key.toLowerCase()) ?? axes.get(norm) ?? null
}

const VALID_ETATS = new Set(['ok', 'attention', 'blocage', 'non rempli'])

export async function seedDemo() {
  await seedIfEmpty()

  const siteName = process.env.SEED_SITE ?? config.defaultSite
  const equipeName = process.env.SEED_EQUIPE ?? 'Ligne 1'
  const equipeId = await resolveEquipeId(equipeName, siteName)
  const axes = await loadAxeIds()

  if (axes.size === 0) {
    for (const [i, axe] of DEFAULT_AXES.entries()) {
      await query(
        'INSERT INTO axes (key, label, sort_order) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING',
        [axe.key, axe.label, i + 1],
      )
    }
  }

  const axeMap = await loadAxeIds()
  let etats = 0
  let actions = 0
  let comments = 0
  const errors: string[] = []

  for (const file of DEMO_FILES) {
    const filePath = path.join(DEMO_DIR, file)
    if (!fs.existsSync(filePath)) {
      errors.push(`Fichier manquant: ${filePath}`)
      continue
    }
    const rows = parseCSV(fs.readFileSync(filePath, 'utf-8'))

    for (const row of rows) {
      const type = row.Type || row.type
      const axeLabel = row.Axe || row.axe
      const date = row.Date || row.date
      const axeId = resolveAxeId(axeMap, axeLabel)

      if (!axeId) {
        errors.push(`Axe inconnu: ${axeLabel}`)
        continue
      }

      try {
        if (type === 'Etat') {
          const etat = row.Champ1.trim().toLowerCase()
          if (!date || !VALID_ETATS.has(etat)) {
            errors.push(`État invalide: ${row.Champ1}`)
            continue
          }
          await query(
            `INSERT INTO jour_etats (axe_id, equipe_id, date, etat)
             VALUES ($1, $2, $3, $4)
             ON CONFLICT (axe_id, equipe_id, date) DO UPDATE SET etat = EXCLUDED.etat`,
            [axeId, equipeId, date, etat],
          )
          etats++
        } else if (type === 'Action') {
          const probleme = row.Champ1
          const porteur = row.Champ2
          if (!probleme || !porteur) {
            errors.push(`Action incomplète: ${probleme || '?'}`)
            continue
          }
          await query(
            `INSERT INTO actions (
              axe_id, equipe_id, probleme, porteur, echeance, categorie, created_at, statut
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
            [
              axeId,
              equipeId,
              probleme,
              porteur,
              row.Champ3 || null,
              row.Champ4 || null,
              date || new Date().toISOString().slice(0, 10),
              row.Statut === 'fermee' ? 'fermee' : 'ouverte',
            ],
          )
          actions++
        } else if (type === 'Commentaire') {
          const content = row.Champ1
          if (!content || !date) {
            errors.push('Commentaire incomplet')
            continue
          }
          await query(
            'INSERT INTO commentaires (axe_id, equipe_id, date, content) VALUES ($1, $2, $3, $4)',
            [axeId, equipeId, date, content],
          )
          comments++
        }
      } catch (e) {
        errors.push(`${type} ${axeLabel} ${date}: ${e instanceof Error ? e.message : 'erreur'}`)
      }
    }
  }

  return { etats, actions, comments, errors, siteName, equipeName }
}

const isMain = process.argv[1]?.includes('seedDemo')
if (isMain) {
  seedDemo()
    .then((r) => {
      console.log(`Démo chargée pour ${r.equipeName} @ ${r.siteName}`)
      console.log(`  États: ${r.etats}, Actions: ${r.actions}, Commentaires: ${r.comments}`)
      if (r.errors.length) {
        console.warn(`  Avertissements (${r.errors.length}):`)
        r.errors.slice(0, 10).forEach((e) => console.warn(`    - ${e}`))
      }
      return pool.end()
    })
    .then(() => process.exit(0))
    .catch((e) => {
      console.error(e)
      process.exit(1)
    })
}
