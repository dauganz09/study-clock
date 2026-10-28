export interface Study {
  id: string
  title: string
  protocolNumber: string | null
  isMain: boolean
}

export interface Session {
  id: string
  studyId: string
  workDate: string
  /** Site wall-clock times, 'HH:MM:SS'. */
  clockIn: string
  clockOut: string | null
  /** Site dates the session started and ended on. They differ from workDate after midnight. */
  startDate: string
  endDate: string | null
  startedAt: string
  endedAt: string | null
}

export interface TrackerState {
  candidate: string
  client: string
  timezone: string
  serverNow: string
  studies: Study[]
  sessions: Session[]
}
