import { mkdirSync } from 'node:fs'
import { PGlite } from '@electric-sql/pglite'
import { RULES_SQL, readSql, type Query } from './db.js'

const LOCAL_SQL = ['dev/mock_schema.sql', 'dev/seed.sql', ...RULES_SQL]
const DEMO_SQL = ['dev/seed_history.sql']

// In-process Postgres for tests and credential-free dev. No dataDir = in memory.
export async function connectLocal(dataDir?: string, { demo = false } = {}): Promise<Query> {
  if (dataDir) mkdirSync(dataDir, { recursive: true })
  const db = new PGlite(dataDir)
  for (const file of [...LOCAL_SQL, ...(demo ? DEMO_SQL : [])]) await db.exec(readSql(file))
  return async (sql, params) => (await db.query(sql, params)).rows as never
}
