-- SQCDP — Schéma PostgreSQL (Supabase / Postgres)
-- L'app frontend consomme ces tables via l'API REST Render ou Supabase Edge Functions.

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Sites / usines
CREATE TABLE IF NOT EXISTS sites (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL UNIQUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Équipes / lignes
CREATE TABLE IF NOT EXISTS equipes (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id     UUID NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  active      BOOLEAN NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (site_id, name)
);

-- Axes SQCDP (référentiel, extensible par site)
CREATE TABLE IF NOT EXISTS axes (
  id          SERIAL PRIMARY KEY,
  key         CHAR(1) NOT NULL CHECK (key IN ('S','Q','C','D','P')),
  label       TEXT NOT NULL,
  site_id     UUID REFERENCES sites(id) ON DELETE CASCADE,
  sort_order  SMALLINT NOT NULL DEFAULT 0,
  UNIQUE (site_id, key)
);

-- États journaliers par axe
CREATE TABLE IF NOT EXISTS jour_etats (
  id          BIGSERIAL PRIMARY KEY,
  axe_id      INT NOT NULL REFERENCES axes(id),
  equipe_id   UUID NOT NULL REFERENCES equipes(id) ON DELETE CASCADE,
  date        DATE NOT NULL,
  etat        TEXT NOT NULL CHECK (etat IN ('ok','attention','blocage','non rempli')),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by  UUID REFERENCES auth.users(id),
  UNIQUE (axe_id, equipe_id, date)
);

CREATE INDEX IF NOT EXISTS idx_jour_etats_equipe_date ON jour_etats (equipe_id, date);

-- Commentaires quotidiens
CREATE TABLE IF NOT EXISTS commentaires (
  id          BIGSERIAL PRIMARY KEY,
  axe_id      INT NOT NULL REFERENCES axes(id),
  equipe_id   UUID NOT NULL REFERENCES equipes(id) ON DELETE CASCADE,
  date        DATE NOT NULL,
  content     TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by  UUID REFERENCES auth.users(id)
);

CREATE INDEX IF NOT EXISTS idx_commentaires_equipe_date ON commentaires (equipe_id, date);

-- Actions PDCA / 8D
CREATE TABLE IF NOT EXISTS actions (
  id                    BIGSERIAL PRIMARY KEY,
  axe_id                INT NOT NULL REFERENCES axes(id),
  equipe_id             UUID NOT NULL REFERENCES equipes(id) ON DELETE CASCADE,
  probleme              TEXT NOT NULL,
  titre                 TEXT,
  categorie             TEXT,
  criticite             TEXT,
  cause                 TEXT,
  auteur                TEXT,
  porteur               TEXT NOT NULL,
  solution              TEXT,
  echeance              DATE,
  created_at            DATE NOT NULL DEFAULT CURRENT_DATE,
  statut                TEXT NOT NULL DEFAULT 'ouverte' CHECK (statut IN ('ouverte','fermee')),
  code                  TEXT,
  pdca_plan             TEXT,
  pdca_do               TEXT,
  pdca_check            TEXT,
  pdca_act              TEXT,
  d1_equipe             TEXT,
  d2_probleme           TEXT,
  d3_containment        TEXT,
  d4_cause_racine       TEXT,
  d5_actions_correctives TEXT,
  d6_validation         TEXT,
  d7_prevention         TEXT,
  d8_cloture            TEXT,
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_actions_equipe_statut ON actions (equipe_id, statut);

-- Paramètres UI (couleurs, libellés)
CREATE TABLE IF NOT EXISTS app_params (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id     UUID NOT NULL REFERENCES sites(id) ON DELETE CASCADE UNIQUE,
  colors      JSONB NOT NULL,
  labels      JSONB NOT NULL,
  axes_labels JSONB,
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Comptes-rendus de daily
CREATE TABLE IF NOT EXISTS daily_reports (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  equipe_id       UUID NOT NULL REFERENCES equipes(id) ON DELETE CASCADE,
  date            DATE NOT NULL,
  timer_sec       INT NOT NULL DEFAULT 0,
  roulette        JSONB,
  checklist       JSONB,
  today_states    JSONB,
  summary_text    TEXT NOT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by      UUID REFERENCES auth.users(id),
  UNIQUE (equipe_id, date)
);

CREATE INDEX IF NOT EXISTS idx_daily_reports_equipe ON daily_reports (equipe_id, date DESC);

-- Historique roulette (optionnel, par équipe)
CREATE TABLE IF NOT EXISTS roulette_history (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  equipe_id   UUID NOT NULL REFERENCES equipes(id) ON DELETE CASCADE,
  results     JSONB NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Journal d'audit serveur
CREATE TABLE IF NOT EXISTS audit_log (
  id          BIGSERIAL PRIMARY KEY,
  equipe_id   UUID REFERENCES equipes(id),
  user_email  TEXT,
  action      TEXT NOT NULL,
  details     TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Données initiales
INSERT INTO sites (name) VALUES ('Site principal') ON CONFLICT (name) DO NOTHING;

INSERT INTO axes (key, label, sort_order) VALUES
  ('S', 'Sécurité', 1),
  ('Q', 'Qualité', 2),
  ('C', 'Coût', 3),
  ('D', 'Délai', 4),
  ('P', 'Personnel', 5)
ON CONFLICT DO NOTHING;
