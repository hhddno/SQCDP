# SQCDP

Suite **SQCDP** (Sécurité, Qualité, Coût, Délai, Personnel) pour le pilotage industriel en atelier.

| | |
|---|---|
| **App production** | https://sqcdp.vercel.app |
| **Dépôt** | [github.com/dariohd/SQCDP](https://github.com/dariohd/SQCDP) |

Ce dépôt regroupe l'application React (racine), l'API Express (`sqcdp-api/`) et le schéma SQL (`database/`).

| Dossier | Rôle | Doc |
|---------|------|-----|
| **Racine** (`src/`, `package.json`…) | PWA React | [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) |
| **`sqcdp-api/`** | API REST + PostgreSQL | [sqcdp-api/README.md](sqcdp-api/README.md) |
| **`database/`** | Schéma + contrat REST | [database/API.md](database/API.md), [schema.sql](database/schema.sql) |

Le navigateur parle à l'API en REST (JWT Supabase optionnel). En offline, l'app garde les données en localStorage et resynchronise via une file d'attente.

---

## Application frontend

[![CI](https://github.com/dariohd/SQCDP/actions/workflows/ci.yml/badge.svg)](https://github.com/dariohd/SQCDP/actions/workflows/ci.yml)

![sqcdp.vercel.app](docs/screenshot.png)

React + Vite + TypeScript. Pas de base embarquée côté client : API Render + cache local (PWA).

### Fonctionnalités

- Tableau de bord mensuel (5 donuts interactifs animés)
- Vue **semaine** et **pilotage** (tendances, KPIs, benchmark équipes)
- **Mode Daily** guidé (ordre du jour, rôles, saisie, revue, clôture + compte-rendu)
- Actions **PDCA** + **8D**, modèles prédéfinis
- Alertes cliquables (retards, escalade, blocages)
- Filtrage par **équipe / ligne**
- Export **CSV** / **PDF** mensuel, import CSV
- Mode **Stand-up**, **Roulette** réunion, sync offline, journal d'audit
- Raccourcis : `R` refresh, `I` import, `S` stand-up, `B` saisie, `N` alertes, `D` daily

### Démarrage (app seule)

```bash
npm install
cp .env.example .env
npm run dev
```

→ http://localhost:5173 — variables : [.env.example](.env.example)

```bash
npm run build
npm run test:e2e
```

Démo CSV : `demo-data/` (importer 01 → 04).

---

## Démarrage complet (app + API)

### API + base

```bash
cd sqcdp-api
cp .env.example .env
docker compose up --build
# ou : npm install && npm run db:init && npm run dev
```

→ http://localhost:3001

### Brancher l'app

À la racine du dépôt :

```bash
echo "VITE_API_BASE_URL=http://localhost:3001" > .env
npm run dev
```

---

## Déploiement production

| Composant | Cible |
|-----------|--------|
| **App** (racine) | Vercel — https://sqcdp.vercel.app |
| **sqcdp-api** | Render (`render.yaml`) ou Docker |
| **PostgreSQL** | Render, Supabase ou Neon |

Secrets Vercel : `VITE_API_BASE_URL`, `SUPABASE_URL`, `SUPABASE_KEY` (optionnel).

CI GitHub : build + tests Playwright (`.github/workflows/ci.yml`).

---

## Contact

Hugo Davion — [bulletonsite.com](https://bulletonsite.com)
