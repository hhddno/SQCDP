import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { pool } from '../db.js'
import { seedIfEmpty } from '../services/equipe.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

export async function runMigrations() {
  const sqlPath = path.join(__dirname, '../../database/init.sql')
  const sql = fs.readFileSync(sqlPath, 'utf-8')
  await pool.query(sql)
  await seedIfEmpty()
}

const isMain = process.argv[1]?.includes('initDb')
if (isMain) {
  runMigrations()
    .then(() => {
      console.log('Schéma SQCDP initialisé')
      process.exit(0)
    })
    .catch((e) => {
      console.error(e)
      process.exit(1)
    })
}
