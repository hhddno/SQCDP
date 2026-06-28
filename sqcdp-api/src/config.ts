import 'dotenv/config'

export const config = {
  port: parseInt(process.env.PORT ?? '3001', 10),
  databaseUrl: process.env.DATABASE_URL ?? '',
  supabaseUrl: process.env.SUPABASE_URL ?? '',
  supabaseJwtSecret: process.env.SUPABASE_JWT_SECRET ?? '',
  corsOrigins: (process.env.CORS_ORIGINS ?? '*')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean),
  defaultSite: process.env.DEFAULT_SITE ?? 'Site principal',
}

export const DEFAULT_COLORS = {
  vert: '#53c15e',
  jaune: '#ffe066',
  rouge: '#ec5353',
  gris: '#e0e0e0',
}

export const DEFAULT_LABELS = {
  vert: 'OK',
  jaune: 'Attention',
  rouge: 'Blocage',
  gris: 'Non rempli',
}

export const DEFAULT_AXES = [
  { key: 'S', label: 'Sécurité' },
  { key: 'Q', label: 'Qualité' },
  { key: 'C', label: 'Coût' },
  { key: 'D', label: 'Délai' },
  { key: 'P', label: 'Personnel' },
]
