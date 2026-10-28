import { handle } from 'hono/vercel'
import { createApp } from '../server/app.js'
import { connectRemote } from '../server/db.js'

const { DATABASE_URL, ASSIGNMENT_ID } = process.env
if (!DATABASE_URL || !ASSIGNMENT_ID) throw new Error('DATABASE_URL and ASSIGNMENT_ID must be set')

// One connection per warm function instance; the pooler does the fan-in.
const app = createApp(connectRemote(DATABASE_URL, { max: 1 }), ASSIGNMENT_ID)

export const GET = handle(app)
export const POST = handle(app)
