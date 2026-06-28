import type { Action } from '../types'

/** Actions visibles pour l'équipe active (sans équipe = partagées). */
export function filterActionsForEquipe(actions: Action[], equipe: string): Action[] {
  return actions.filter((a) => !a.equipe || a.equipe === equipe)
}
