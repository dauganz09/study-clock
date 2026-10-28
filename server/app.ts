import { Hono } from 'hono'
import type { Query } from './db.js'
import { TrackerError, clockIn, clockOut, loadState } from './tracker.js'

async function studyIdFrom(body: Promise<unknown>) {
  const { studyId } = ((await body.catch(() => null)) ?? {}) as { studyId?: unknown }
  if (typeof studyId !== 'string') throw new TrackerError(400, 'studyId is required')
  return studyId
}

export function createApp(q: Query, assignmentId: string) {
  const app = new Hono().basePath('/api')

  app.onError((err, c) => {
    if (err instanceof TrackerError) return c.json({ error: err.message }, err.status)
    console.error(err)
    return c.json({ error: 'Something went wrong saving that. Nothing was changed.' }, 500)
  })

  app.get('/state', async (c) => c.json(await loadState(q, assignmentId)))

  app.post('/clock-in', async (c) => {
    await clockIn(q, assignmentId, await studyIdFrom(c.req.json()))
    return c.json(await loadState(q, assignmentId))
  })

  app.post('/clock-out', async (c) => {
    await clockOut(q, assignmentId, await studyIdFrom(c.req.json()))
    return c.json(await loadState(q, assignmentId))
  })

  return app
}
