import type { Session, Study, TrackerState } from '../shared/types.js'
import type { Query } from './db.js'

export class TrackerError extends Error {
  constructor(
    public status: 400 | 404 | 409,
    message: string,
  ) {
    super(message)
  }
}

const RULE_MESSAGES: Record<string, string> = {
  TT001: 'Another study is already running. Refresh to see it.',
  TT002: "You're not logged in to that study. Refresh to see the current state.",
  TT004: 'The server clock is behind the running session. Try again in a moment.',
  TT005: "Today's timesheet has already been submitted, so it can't take new sessions.",
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

// No study-assignment link exists, so: the main study plus studies in the
// client's or candidate's organization.
const STUDIES_FOR_ASSIGNMENT = `
  select s.id::text as id,
         s.title,
         s.protocol_number as "protocolNumber",
         s.id is not distinct from c.study_id as "isMain"
    from public.assignments a
    join public.candidates c on c.id = a.candidate_id
    join public.clients   cl on cl.id = a.client_id
    join public.studies    s on s.id = c.study_id
                             or s.organization_id = cl.organization_id
                             or s.organization_id = c.organization_id
   where a.id = $1`

export async function loadState(q: Query, assignmentId: string): Promise<TrackerState> {
  const [header] = await q<Omit<TrackerState, 'studies' | 'sessions'>>(
    `select c.full_name as candidate,
            cl.name as client,
            public.tt_timezone() as timezone,
            to_json(now()) #>> '{}' as "serverNow"
       from public.assignments a
       join public.candidates c on c.id = a.candidate_id
       join public.clients   cl on cl.id = a.client_id
      where a.id = $1`,
    [assignmentId],
  )
  if (!header) throw new TrackerError(404, `Assignment ${assignmentId} not found`)

  const studies = await q<Study>(`${STUDIES_FOR_ASSIGNMENT} order by "isMain" desc, s.title`, [assignmentId])

  const sessions = await q<Session>(
    `select id::text as id,
            study_id::text as "studyId",
            work_date::text as "workDate",
            clock_in::text as "clockIn",
            clock_out::text as "clockOut",
            start_date::text as "startDate",
            end_date::text as "endDate",
            to_json(started_at) #>> '{}' as "startedAt",
            to_json(ended_at) #>> '{}' as "endedAt"
       from public.tt_sessions($1)`,
    [assignmentId],
  )

  return { ...header, studies, sessions }
}

async function assertStudyOnAssignment(q: Query, assignmentId: string, studyId: string) {
  const rows = UUID.test(studyId) ? await q(`${STUDIES_FOR_ASSIGNMENT} and s.id = $2`, [assignmentId, studyId]) : []
  if (!rows.length) throw new TrackerError(400, `Study ${studyId} isn't part of this assignment`)
}

async function runRule(q: Query, sql: string, params: unknown[]) {
  try {
    await q(sql, params)
  } catch (err) {
    const message = RULE_MESSAGES[(err as { code?: string }).code ?? '']
    if (message) throw new TrackerError(409, message)
    throw err
  }
}

export async function clockIn(q: Query, assignmentId: string, studyId: string) {
  await assertStudyOnAssignment(q, assignmentId, studyId)
  await runRule(q, 'select public.tt_clock_in($1, $2)', [assignmentId, studyId])
}

export async function clockOut(q: Query, assignmentId: string, studyId: string) {
  await assertStudyOnAssignment(q, assignmentId, studyId)
  await runRule(q, 'select public.tt_clock_out($1, $2)', [assignmentId, studyId])
}
