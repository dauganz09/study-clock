import { beforeEach, describe, expect, it } from 'vitest'
import type { Query } from './db.js'
import { connectLocal } from './local-db.js'
import { TrackerError, clockIn, clockOut, loadState } from './tracker.js'

// From sql/dev/seed.sql. Site zone is America/Menominee (UTC-5 in October).
const A = '00000000-0000-4000-8000-000000000001'
const S = {
  derm: '00000000-0000-4000-8000-000000000162',
  resp: '00000000-0000-4000-8000-000000000113',
  infd: '00000000-0000-4000-8000-000000000171',
  onc: '00000000-0000-4000-8000-000000000172',
  other: '00000000-0000-4000-8000-000000000199', // not on the assignment
}
const name = Object.fromEntries(Object.entries(S).map(([k, v]) => [v, k]))

let q: Query

const days = () =>
  q<{ work_date: string; clock_in: string; clock_out: string | null; study: string }>(
    `select work_date::text, clock_in::text, clock_out::text, study_id::text as study
       from public.daily_timesheets where assignment_id = $1 order by work_date`,
    [A],
  ).then((rows) => rows.map((r) => ({ ...r, study: name[r.study] })))

const sessions = () =>
  q<{ study: string; started: string; ended: string | null }>(
    `select study_id::text as study,
            to_char(started_at at time zone 'UTC', 'HH24:MI:SS') as started,
            to_char(ended_at   at time zone 'UTC', 'HH24:MI:SS') as ended
       from public.study_sessions where assignment_id = $1 order by started_at`,
    [A],
  ).then((rows) => rows.map((r) => ({ ...r, study: name[r.study] })))

const tIn = (study: string, at: string) => q('select public.tt_clock_in($1, $2, $3::timestamptz)', [A, study, at])
const tOut = (study: string, at: string) => q('select public.tt_clock_out($1, $2, $3::timestamptz)', [A, study, at])
const sqlstate = (p: Promise<unknown>) =>
  p.then(
    () => 'no error',
    (e: { code?: string }) => e.code,
  )

beforeEach(async () => {
  q = await connectLocal()
})

describe('switching studies', () => {
  it('first login opens the day row with the site wall-clock time', async () => {
    await tIn(S.derm, '2026-10-27T13:58:00Z') // 8:58 AM CDT
    expect(await days()).toEqual([{ work_date: '2026-10-27', clock_in: '08:58:00', clock_out: null, study: 'derm' }])
    expect(await sessions()).toEqual([{ study: 'derm', started: '13:58:00', ended: null }])
  })

  it('ends the old study and starts the new one at the same instant, on the same day row', async () => {
    await tIn(S.derm, '2026-10-27T13:58:00Z')
    await tIn(S.resp, '2026-10-27T16:42:07Z')

    expect(await sessions()).toEqual([
      { study: 'derm', started: '13:58:00', ended: '16:42:07' },
      { study: 'resp', started: '16:42:07', ended: null },
    ])
    expect(await days()).toEqual([{ work_date: '2026-10-27', clock_in: '08:58:00', clock_out: null, study: 'resp' }])
  })

  it('treats logging in to the running study again as a no-op', async () => {
    await tIn(S.derm, '2026-10-27T13:58:00Z')
    await tIn(S.derm, '2026-10-27T13:58:01Z')
    expect(await sessions()).toHaveLength(1)
  })

  it('keeps exactly one running session through many switches', async () => {
    const order = [S.derm, S.resp, S.infd, S.derm, S.onc, S.resp]
    for (const [i, s] of order.entries()) await tIn(s, `2026-10-27T1${i}:00:00Z`)
    const running = (await sessions()).filter((s) => s.ended === null)
    expect(running).toEqual([expect.objectContaining({ study: 'resp' })])
  })

  it('logging out closes the session and the day; logging back in reopens the same day', async () => {
    await tIn(S.derm, '2026-10-27T13:58:00Z')
    await tOut(S.derm, '2026-10-27T17:00:00Z')
    expect(await days()).toEqual([
      { work_date: '2026-10-27', clock_in: '08:58:00', clock_out: '12:00:00', study: 'derm' },
    ])

    await tIn(S.onc, '2026-10-27T18:00:00Z')
    expect(await days()).toEqual([{ work_date: '2026-10-27', clock_in: '08:58:00', clock_out: null, study: 'onc' }])
    expect(await sessions()).toHaveLength(2)
  })
})

describe('impossible clicks', () => {
  it('rejects logging out when nothing is running', async () => {
    expect(await sqlstate(tOut(S.derm, '2026-10-27T13:00:00Z'))).toBe('TT002')
  })

  it('rejects logging out of a study that is not the running one', async () => {
    await tIn(S.derm, '2026-10-27T13:58:00Z')
    expect(await sqlstate(tOut(S.resp, '2026-10-27T14:00:00Z'))).toBe('TT002')
    expect((await sessions())[0].ended).toBeNull()
  })

  it('blocks a second running session even when written directly to the table', async () => {
    await tIn(S.derm, '2026-10-27T13:58:00Z')
    const direct = q(
      `insert into public.study_sessions (timesheet_id, assignment_id, study_id, started_at)
       select id, assignment_id, $2, now() from public.daily_timesheets where assignment_id = $1`,
      [A, S.resp],
    )
    expect(await sqlstate(direct)).toBe('23505') // study_sessions_one_running
  })

  it('blocks a second open day row for the assignment', async () => {
    await tIn(S.derm, '2026-10-27T13:58:00Z')
    const direct = q(
      `insert into public.daily_timesheets (assignment_id, work_date, clock_in) values ($1, '2026-10-28', '09:00')`,
      [A],
    )
    expect(await sqlstate(direct)).toBe('TT001')
  })

  it("won't add sessions to a day that was already submitted", async () => {
    await tIn(S.derm, '2026-10-27T13:58:00Z')
    await tOut(S.derm, '2026-10-27T17:00:00Z')
    await q(`update public.daily_timesheets set status = 'submitted' where assignment_id = $1`, [A])
    expect(await sqlstate(tIn(S.derm, '2026-10-27T18:00:00Z'))).toBe('TT005')
  })

  it('maps rule violations to HTTP errors at the API layer', async () => {
    await expect(clockOut(q, A, S.derm)).rejects.toMatchObject({ status: 409 })
    await expect(clockIn(q, A, S.other)).rejects.toMatchObject({ status: 400 })
    await expect(clockIn(q, A, 'not-a-uuid')).rejects.toBeInstanceOf(TrackerError)
  })
})

describe('midnight', () => {
  it('keeps a shift that crosses midnight on the day it started, like the overnight rows already in the table', async () => {
    await tIn(S.infd, '2026-10-28T04:30:00Z') // Oct 27, 11:30 PM CDT
    await tIn(S.derm, '2026-10-28T05:15:00Z') // Oct 28, 12:15 AM: switch after midnight
    await tOut(S.derm, '2026-10-28T05:45:00Z') // Oct 28, 12:45 AM

    expect(await days()).toEqual([
      { work_date: '2026-10-27', clock_in: '23:30:00', clock_out: '00:45:00', study: 'derm' },
    ])

    const { sessions: log } = await loadState(q, A)
    expect(log.map((s) => [s.workDate, s.clockIn, s.clockOut, s.endDate])).toEqual([
      ['2026-10-27', '00:15:00', '00:45:00', '2026-10-28'],
      ['2026-10-27', '23:30:00', '00:15:00', '2026-10-28'],
    ])
  })

  it('the next login after an overnight shift starts a new day row', async () => {
    await tIn(S.infd, '2026-10-28T04:30:00Z')
    await tOut(S.infd, '2026-10-28T05:45:00Z')
    await tIn(S.derm, '2026-10-28T14:00:00Z') // Oct 28, 9:00 AM
    expect((await days()).map((d) => d.work_date)).toEqual(['2026-10-27', '2026-10-28'])
  })
})
