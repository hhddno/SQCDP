import type { Action, Axe, Comment, DayState, EtatApi } from '../types'
import { api } from './api'
import { getCurrentEquipe } from './team'

const SEP = ';'

function parseCSV(content: string): Record<string, string>[] {
  const lines = content.replace(/^\ufeff/, '').split(/\r?\n/).filter((l) => l.trim())
  if (lines.length < 2) return []
  const headers = lines[0].split(SEP).map((h) => h.trim())
  return lines.slice(1).map((line) => {
    const values = line.split(SEP)
    const row: Record<string, string> = {}
    headers.forEach((h, i) => {
      row[h] = values[i]?.trim() ?? ''
    })
    return row
  })
}

function findAxeId(axes: Axe[], label: string): number | null {
  const axe = axes.find(
    (a) => a.label.toLowerCase() === label.toLowerCase() || a.key.toLowerCase() === label.toLowerCase(),
  )
  return axe?.id ?? null
}

const VALID_ETATS: EtatApi[] = ['ok', 'attention', 'blocage', 'non rempli']

export interface ImportResult {
  actions: number
  comments: number
  etats: number
  errors: string[]
}

export async function importFromCSV(file: File, axes: Axe[]): Promise<ImportResult> {
  const text = await file.text()
  const rows = parseCSV(text)
  const result: ImportResult = { actions: 0, comments: 0, etats: 0, errors: [] }

  for (const row of rows) {
    const type = row.Type || row.type
    const axeLabel = row.Axe || row.axe
    const date = row.Date || row.date
    const axeId = findAxeId(axes, axeLabel)

    if (!axeId) {
      result.errors.push(`Axe inconnu: ${axeLabel}`)
      continue
    }

    try {
      if (type === 'Action') {
        const action: Action = {
          axe_id: axeId,
          probleme: row.Champ1,
          porteur: row.Champ2,
          echeance: row.Champ3 || null,
          categorie: row.Champ4 || undefined,
          statut: (row.Statut === 'fermee' ? 'fermee' : 'ouverte'),
          created_at: date || undefined,
          equipe: row.Equipe || getCurrentEquipe(),
          cause: row.Cause || undefined,
          solution: row.Solution || undefined,
          pdca_plan: row.PDCA_Plan || undefined,
          pdca_do: row.PDCA_Do || undefined,
          pdca_check: row.PDCA_Check || undefined,
          pdca_act: row.PDCA_Act || undefined,
        }
        if (!action.probleme || !action.porteur) {
          result.errors.push(`Action incomplète: ${action.probleme || '?'}`)
          continue
        }
        await api.saveAction(action)
        result.actions++
      } else if (type === 'Commentaire') {
        const content = row.Champ1
        if (!content || !date) {
          result.errors.push('Commentaire incomplet')
          continue
        }
        await api.addComment({ axe_id: axeId, date, content, equipe: getCurrentEquipe() })
        result.comments++
      } else if (type === 'Etat') {
        const etat = row.Champ1.trim().toLowerCase() as EtatApi
        if (!date || !VALID_ETATS.includes(etat)) {
          result.errors.push(`État invalide: ${row.Champ1} (${date})`)
          continue
        }
        const jour = parseInt(date.split('-')[2], 10)
        await api.saveDayState(jour, axeId, etat, date)
        result.etats++
      }
    } catch {
      result.errors.push(`Erreur ligne: ${type} ${axeLabel} ${date}`)
    }
  }

  api.clearCache()
  return result
}

const EXPORT_HEADERS = [
  'Type', 'Axe', 'Date', 'Champ1', 'Champ2', 'Champ3', 'Champ4', 'Statut',
  'Equipe', 'Cause', 'Solution', 'PDCA_Plan', 'PDCA_Do', 'PDCA_Check', 'PDCA_Act',
]

export function exportToCSV(
  axes: Axe[],
  actions: Action[],
  commentaires: Comment[],
  dayStates: DayState[],
) {
  const lines: string[] = []
  const sep = SEP

  lines.push(EXPORT_HEADERS.join(sep))

  actions.forEach((a) => {
    const axe = axes.find((x) => x.id === a.axe_id)
    lines.push(
      [
        'Action',
        axe?.label ?? String(a.axe_id),
        a.created_at ?? '',
        a.probleme,
        a.porteur,
        a.echeance ?? '',
        a.categorie ?? '',
        a.statut,
        a.equipe ?? '',
        a.cause ?? '',
        a.solution ?? '',
        a.pdca_plan ?? '',
        a.pdca_do ?? '',
        a.pdca_check ?? '',
        a.pdca_act ?? '',
      ].join(sep),
    )
  })

  commentaires.forEach((c) => {
    const axe = axes.find((x) => x.id === c.axe_id)
    lines.push(
      ['Commentaire', axe?.label ?? String(c.axe_id), c.date, c.content, '', '', '', '', c.equipe ?? '', '', '', '', '', '', ''].join(sep),
    )
  })

  dayStates.forEach((d) => {
    const axe = axes.find((x) => x.id === d.axe_id)
    lines.push(
      ['Etat', axe?.label ?? String(d.axe_id), d.date, d.etat, '', '', '', '', d.equipe ?? '', '', '', '', '', '', ''].join(sep),
    )
  })

  const blob = new Blob(['\ufeff' + lines.join('\n')], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `sqcdp_export_${new Date().toISOString().slice(0, 10)}.csv`
  a.click()
  URL.revokeObjectURL(url)
}
