# SQCDP API

API REST Node.js + Express + PostgreSQL pour l'application SQCDP.

Notes complémentaires : schéma et contrat dans [`../database/`](../database/). Front React : racine du dépôt.

## Démarrage rapide

### 1. PostgreSQL

Créez une base (local, Supabase, Neon, Render Postgres…) et notez l'URL.

```bash
cd sqcdp-api
cp .env.example .env
# Éditez DATABASE_URL
```

### 2. Initialiser le schéma

**Option A — Docker (recommandé en local)**

```bash
docker compose up --build
```

L'API écoute sur `http://localhost:3001`.

**Option B — Postgres existant**

```bash
npm install
npm run db:init
npm run dev
```

Vérifiez : `GET http://localhost:3001/health`

### 3. Brancher le frontend

À la racine du dépôt :

```env
VITE_API_BASE_URL=http://localhost:3001
```

## Déploiement Render

1. Créez un **Web Service** Docker depuis ce dossier (ou utilisez `render.yaml`)
2. Ajoutez une base **PostgreSQL** Render
3. Variable `DATABASE_URL` liée à la base
4. Optionnel : `SUPABASE_JWT_SECRET` pour valider les tokens auth

## Endpoints

Voir [`../database/API.md`](../database/API.md).

| Route | Description |
|-------|-------------|
| `GET /health` | Santé API + DB |
| `GET /axes` | Axes SQCDP |
| `GET/POST /equipes` | Équipes par site |
| `GET/POST /jour_etats` | États journaliers |
| `GET/POST/PUT/DELETE /actions` | Actions PDCA/8D |
| `GET/POST/DELETE /commentaires` | Commentaires |
| `GET/POST /params` | Couleurs & libellés |
| `GET/POST /daily_reports` | Comptes-rendus daily |
| `POST /roulette_history` | Historique roulette |

## Auth (optionnelle)

Sans `SUPABASE_JWT_SECRET` ni `SUPABASE_URL`, l'API est **ouverte** (comme le frontend sans Supabase).

Avec le secret JWT Supabase (Settings → API → JWT Secret), les requêtes authentifiées remplissent `created_by` / `updated_by`.

## Structure

```
sqcdp-api/
  database/init.sql   # Schéma PostgreSQL standalone
  src/
    index.ts          # Point d'entrée Express
    routes/           # Routes REST
    services/         # Résolution équipe/site
    middleware/       # Contexte equipe + JWT
```
