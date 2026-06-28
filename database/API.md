# Contrat API REST SQCDP

Base URL : `VITE_API_BASE_URL` (défaut `https://sqcdp-api.onrender.com`)

## En-têtes

| En-tête | Description |
|---------|-------------|
| `Authorization` | `Bearer <supabase_jwt>` si auth activée |
| `Content-Type` | `application/json` |
| `X-SQCDP-Equipe` | Nom de l'équipe active (filtrage côté API) |
| `X-SQCDP-Site` | Nom du site actif |

## Query params communs

- `equipe` — filtre par nom d'équipe
- `site` — filtre par site
- `from` / `to` — plage de dates (YYYY-MM-DD)

## Endpoints

### Référentiel

| Méthode | Route | Description |
|---------|-------|-------------|
| GET | `/axes` | Liste des axes |
| GET | `/params?site=` | Couleurs + libellés |
| POST | `/params` | Sauvegarde paramètres |
| GET | `/sites` | Liste des sites |
| GET | `/equipes?site=` | Équipes du site |
| POST | `/equipes` | `{ "name": "Ligne 4", "site": "Site principal" }` |

### Données SQCDP

| Méthode | Route | Description |
|---------|-------|-------------|
| GET | `/jour_etats?equipe=&from=&to=` | États journaliers |
| POST | `/jour_etats` | `{ jour, axe_id, etat, date, equipe }` |
| GET | `/actions?equipe=` | Actions |
| GET | `/actions/:id` | Détail action |
| POST | `/actions` | Création |
| PUT | `/actions/:id` | Mise à jour |
| DELETE | `/actions/:id` | Suppression |
| GET | `/commentaires?equipe=` | Commentaires |
| POST | `/commentaires` | `{ axe_id, date, content, equipe }` |
| DELETE | `/commentaires/:id` | Suppression |

### Daily meet

| Méthode | Route | Description |
|---------|-------|-------------|
| GET | `/daily_reports?equipe=&limit=20` | Historique CR daily |
| POST | `/daily_reports` | Enregistrement CR |
| POST | `/roulette_history` | `{ equipe, results }` |

Tous les corps POST incluent `equipe` (nom texte) tant que l'API n'expose pas les UUID.
