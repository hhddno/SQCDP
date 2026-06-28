# Architecture SQCDP

Application **SPA React** (Vite + TypeScript) pour le pilotage SQCDP en usine. Données métier sur **API REST PostgreSQL** (Render) ; le navigateur garde un **cache local** et une **file de synchronisation** pour le mode dégradé / PWA.

## Vue d'ensemble

```
┌─────────────────────────────────────────────────────────────┐
│  React UI (pages, dialogs, charts Recharts, PWA Workbox)   │
├─────────────────────────────────────────────────────────────┤
│  AppContext / AuthContext — état global, refresh, équipe    │
├─────────────────────────────────────────────────────────────┤
│  lib/api.ts — façade REST + cache mémoire + merge local   │
│  lib/localData.ts / organisation.ts — persistance LS       │
│  lib/syncQueue.ts — file offline (enqueue → processSync)    │
├─────────────────────────────────────────────────────────────┤
│  Supabase Auth (optionnel) — sessions utilisateur           │
├─────────────────────────────────────────────────────────────┤
│  API Express (sqcdp-api) → PostgreSQL                      │
└─────────────────────────────────────────────────────────────┘
```

## Couches frontend

| Couche | Rôle |
|--------|------|
| **Pages** | `DashboardPage`, `WeekPage`, `DailyPage`, `AnalyticsPage`, `RoulettePage` — une route par usage atelier |
| **Composants** | Donuts SQCDP, stand-up plein écran, roulette réunion, barre de sync réseau |
| **Context** | `AppProvider` charge axes/actions/commentaires, filtre par équipe, expose `syncPending` |
| **lib/api** | CRUD REST ; en cas d'échec réseau, écriture locale + `enqueueSync` |
| **lib/syncQueue** | Jobs typés (`dayState`, `action`, `comment`, `dailyReport`…) rejoués à la reconnexion |
| **PWA** | Service worker Workbox, manifest, precache du bundle |

## Flux données typique

1. Au chargement : `api.loadOrganisation()` puis parallèle axes / actions / commentaires.
2. Saisie utilisateur : mise à jour optimiste en `localStorage`, puis `POST`/`PATCH` API.
3. Hors ligne ou timeout : job en file ; `SyncStatusBar` + `processSyncQueue()` au retour réseau.
4. Export PDF/CSV : génération côté client (`jspdf`, `html2canvas`, `lib/csv`).

## Mode Daily

`DailyPage` orchestre une réunion structurée : ordre du jour, rôles, saisie par axe, revue des actions ouvertes, clôture avec compte-rendu (`lib/dailyReport.ts`).

## Auth & déploiement

- **Auth** : Supabase (`AuthContext`) — routes protégées via `ProtectedRoute`.
- **Frontend** : Vercel (`sqcdp.vercel.app`), build `tsc -b && vite build`.
- **API** : dépôt séparé `sqcdp-api` sur Render ; URL via `VITE_API_BASE_URL`.
- **CI** : GitHub Actions — build, Playwright E2E, déploiement GitHub Pages.

## Variables d'environnement

Voir `.env.example` : `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_API_BASE_URL`.
