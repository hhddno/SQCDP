import express from 'express'
import cors from 'cors'
import { config } from './config.js'
import { pool } from './db.js'
import { contextMiddleware } from './middleware/context.js'
import { runMigrations } from './scripts/initDb.js'
import referentielRoutes from './routes/referentiel.js'
import sqcdpRoutes from './routes/sqcdp.js'
import dailyRoutes from './routes/daily.js'

const app = express()

app.use(
  cors({
    origin: config.corsOrigins.includes('*') ? true : config.corsOrigins,
    allowedHeaders: ['Content-Type', 'Authorization', 'X-SQCDP-Equipe', 'X-SQCDP-Site'],
  }),
)
app.use(express.json({ limit: '2mb' }))
app.use(contextMiddleware)

app.get('/health', async (_req, res) => {
  try {
    await pool.query('SELECT 1')
    res.json({ status: 'ok', db: true })
  } catch {
    res.status(503).json({ status: 'degraded', db: false })
  }
})

app.use(referentielRoutes)
app.use(sqcdpRoutes)
app.use(dailyRoutes)

app.use((_req, res) => {
  res.status(404).json({ error: 'Route introuvable' })
})

app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(err)
  res.status(500).json({ error: 'Erreur serveur' })
})

async function start() {
  if (!config.databaseUrl) {
    console.error('DATABASE_URL manquant')
    process.exit(1)
  }

  try {
    await runMigrations()
    console.log('Base de données initialisée')
  } catch (e) {
    console.warn('Migration auto ignorée (exécutez npm run db:init si besoin):', e)
  }

  app.listen(config.port, () => {
    console.log(`SQCDP API → http://localhost:${config.port}`)
  })
}

start()
