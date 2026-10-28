import 'dotenv/config'
import { serve } from '@hono/node-server'
import { createApp } from './app.js'
import { connectRemote } from './db.js'
import { connectLocal } from './local-db.js'

const PORT = Number(process.env.API_PORT ?? 8787)
const LOCAL_ASSIGNMENT = '00000000-0000-4000-8000-000000000001' // sql/dev/seed.sql

if (process.env.DATABASE_URL && !process.env.ASSIGNMENT_ID) {
  console.error('Set ASSIGNMENT_ID in .env to the assignment to show (see .env.example)')
  process.exit(1)
}
const ASSIGNMENT_ID = process.env.ASSIGNMENT_ID ?? LOCAL_ASSIGNMENT

const q = process.env.DATABASE_URL
  ? connectRemote(process.env.DATABASE_URL)
  : await connectLocal('.data/pglite', { demo: true })

serve({ fetch: createApp(q, ASSIGNMENT_ID).fetch, port: PORT }, () => {
  const where = process.env.DATABASE_URL ? 'sample database' : 'local PGlite (.data/pglite)'
  console.log(`api on :${PORT} · assignment ${ASSIGNMENT_ID} · ${where}`)
})
