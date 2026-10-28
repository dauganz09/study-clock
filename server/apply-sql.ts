import 'dotenv/config'
import { RULES_SQL, connectRemote, readSql } from './db.js'

const url = process.env.DATABASE_URL
if (!url) {
  console.error('DATABASE_URL is not set (see .env.example)')
  process.exit(1)
}

const q = connectRemote(url)
for (const file of RULES_SQL) {
  await q(readSql(file))
  console.log(`applied ${file}`)
}
process.exit(0)
