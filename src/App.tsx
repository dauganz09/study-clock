import { useEffect, useMemo, useState } from 'react'
import { useTick, useTracker, type Action } from './api'
import { ActivityLog } from './components/ActivityLog'
import { CurrentSession } from './components/CurrentSession'
import { DayTimeline } from './components/DayTimeline'
import { StudyList } from './components/StudyList'
import { IconLogo } from './components/icons'
import { initials, toStudyViews } from './studies'
import { fmtClock, fmtDate, siteNow, zoneAbbr } from './time'

export default function App() {
  const { state, pending, error, act, now } = useTracker()
  const [toast, setToast] = useState<string | null>(null)
  useTick()

  useEffect(() => {
    if (!toast) return
    const id = setTimeout(() => setToast(null), 4000)
    return () => clearTimeout(id)
  }, [toast])

  const studies = useMemo(() => toStudyViews(state?.studies ?? []), [state?.studies])
  const studyById = useMemo(() => new Map(studies.map((s) => [s.id, s])), [studies])

  if (!state) {
    return (
      <div className="boot">
        {error ? (
          <>
            <b>Couldn't load the timesheet.</b>
            <span>{error}</span>
          </>
        ) : (
          <span>Loading timesheet…</span>
        )}
      </div>
    )
  }

  const { timezone } = state
  const nowMs = now()
  const site = siteNow(timezone, nowMs)
  const zone = zoneAbbr(timezone, nowMs)
  const open = state.sessions.find((s) => s.endedAt === null) ?? null
  const openStudy = open ? (studyById.get(open.studyId) ?? null) : null

  // A shift keeps its work_date past midnight.
  const shiftDate = open?.workDate ?? site.date
  const shiftSessions = state.sessions.filter((s) => s.workDate === shiftDate)
  const msByStudy = new Map<string, number>()
  for (const s of shiftSessions) {
    const end = s.endedAt ? Date.parse(s.endedAt) : nowMs
    msByStudy.set(s.studyId, (msByStudy.get(s.studyId) ?? 0) + end - Date.parse(s.startedAt))
  }
  const totalMs = [...msByStudy.values()].reduce((a, b) => a + b, 0)

  const label = (id: string) => studyById.get(id)?.label ?? 'study'

  async function run(action: Action) {
    const from = open?.studyId
    if (!(await act(action))) return
    const at = fmtClock(siteNow(timezone, now()).time)
    const to = label(action.studyId)
    setToast(
      action.kind === 'out'
        ? `Logged out of ${to} at ${at}`
        : from
          ? `Switched from ${label(from)} to ${to} at ${at}`
          : `Logged in to ${to} at ${at}`,
    )
  }

  return (
    <div className="app">
      <header className="appbar">
        <div className="brand">
          <IconLogo />
          Study Clock
        </div>
        <div className="appbar-clock">
          <span className="mono">{fmtClock(site.time)}</span>
          <span className="appbar-date">
            {fmtDate(site.date)} · {zone}
          </span>
        </div>
      </header>

      <main className="page">
        <div className="profile">
          <span className="avatar" aria-hidden>
            {initials(state.candidate)}
          </span>
          <div>
            <h1>{state.candidate}</h1>
            <p>{state.client}</p>
          </div>
        </div>

        <CurrentSession
          study={openStudy}
          session={open}
          nowMs={nowMs}
          zone={zone}
          totalMs={totalMs}
          sessionCount={shiftSessions.length}
          busy={!!pending}
          onLogout={() => open && run({ kind: 'out', studyId: open.studyId })}
        />

        <div className="grid">
          <StudyList studies={studies} open={open} msByStudy={msByStudy} nowMs={nowMs} pending={pending} onAct={run} />
          <DayTimeline
            studyById={studyById}
            sessions={shiftSessions}
            shiftDate={shiftDate}
            isToday={shiftDate === site.date}
            nowMs={nowMs}
            nowMinutes={site.minutes + (shiftDate === site.date ? 0 : 1440)}
            msByStudy={msByStudy}
            totalMs={totalMs}
          />
        </div>

        <ActivityLog studyById={studyById} sessions={state.sessions} today={site.date} nowMs={nowMs} />
      </main>

      <div className="toasts" role="status" aria-live="polite">
        {error ? <div className="toast toast-error">{error}</div> : toast && <div className="toast">{toast}</div>}
      </div>
    </div>
  )
}
