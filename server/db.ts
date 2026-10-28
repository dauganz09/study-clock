import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import pg from 'pg'

export type Query = <T = Record<string, unknown>>(sql: string, params?: unknown[]) => Promise<T[]>

const sqlDir = fileURLToPath(new URL('../sql/', import.meta.url))
export const readSql = (name: string) => readFileSync(sqlDir + name, 'utf8')

export const RULES_SQL = ['001_timesheet_rules.sql']

export function connectRemote(url: string, { max = 4 } = {}): Query {
  // pg treats sslmode=require as verify-full; the pooler's CA isn't in Node's store.
  const u = new URL(url)
  u.searchParams.delete('sslmode')
  const pool = new pg.Pool({
    connectionString: u.toString(),
    ssl: { rejectUnauthorized: false },
    max,
  })
  return async (sql, params) => (await pool.query(sql, params)).rows
}
