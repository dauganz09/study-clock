import { Fragment, useState } from 'react'
import type { Session } from '../../shared/types'
import { swatchVars, type StudyView } from '../studies'
import { fmtClock, fmtDate, fmtHM } from '../time'

interface Props {
  studyById: Map<string, StudyView>
  sessions: Session[]
  today: string
  nowMs: number
}

const PAGE = 25

function StudyCell({ study }: { study?: StudyView }) {
  if (!study) return <span className="log-study">Unknown study</span>
  return (
    <span className="log-study" style={swatchVars(study.swatch)}>
      <b>{study.code}</b>
      {study.label}
    </span>
  )
}

function dayHeading(workDate: string, today: string) {
  const sameYear = workDate.slice(0, 4) === today.slice(0, 4)
  const date = fmtDate(workDate, { year: sameYear ? undefined : 'numeric' })
  return workDate === today ? `Today · ${date}` : date
}

export function ActivityLog({ studyById, sessions, today, nowMs }: Props) {
  const [shown, setShown] = useState(PAGE)
  const visible = sessions.slice(0, shown)

  return (
    <section className="card card-flush" aria-labelledby="log-h">
      <header className="card-head">
        <h2 id="log-h">Activity log</h2>
        <span className="card-count">{sessions.length}</span>
      </header>

      {sessions.length === 0 ? (
        <p className="empty">No sessions yet.</p>
      ) : (
        <div className="table-wrap">
          <table className="log">
            <thead>
              <tr>
                <th scope="col">Study logged into</th>
                <th scope="col">Login time</th>
                <th scope="col">Study logged out of</th>
                <th scope="col">Logout time</th>
                <th scope="col" className="num">
                  Duration
                </th>
              </tr>
            </thead>
            <tbody>
              {visible.map((s, i) => {
                const study = studyById.get(s.studyId)
                const running = s.endedAt === null
                const newDay = i === 0 || visible[i - 1].workDate !== s.workDate

                return (
                  <Fragment key={s.id}>
                    {newDay && (
                      <tr className="log-day">
                        <th colSpan={5} scope="rowgroup">
                          {dayHeading(s.workDate, today)}
                        </th>
                      </tr>
                    )}
                    <tr className={running ? 'is-running' : undefined}>
                      <td data-label="Logged into">
                        <StudyCell study={study} />
                      </td>
                      <td data-label="Login" className="mono">
                        {fmtClock(s.clockIn)}
                        {s.startDate !== s.workDate && <span className="note">after midnight</span>}
                      </td>
                      <td data-label="Logged out of">
                        {running ? <span className="dash">—</span> : <StudyCell study={study} />}
                      </td>
                      <td data-label="Logout" className="mono">
                        {s.clockOut ? fmtClock(s.clockOut) : <span className="dash">—</span>}
                        {s.endDate && s.endDate !== s.workDate && (
                          <span className="note">next day, {fmtDate(s.endDate, { weekday: undefined })}</span>
                        )}
                      </td>
                      <td data-label="Duration" className="num mono">
                        {s.endedAt ? (
                          fmtHM(Date.parse(s.endedAt) - Date.parse(s.startedAt))
                        ) : (
                          <span className="badge badge-live" title={fmtHM(nowMs - Date.parse(s.startedAt))}>
                            <i aria-hidden />
                            Running
                          </span>
                        )}
                      </td>
                    </tr>
                  </Fragment>
                )
              })}
            </tbody>
          </table>
          {sessions.length > shown && (
            <button className="btn-more" onClick={() => setShown((n) => n + PAGE)}>
              Show {Math.min(PAGE, sessions.length - shown)} older sessions
            </button>
          )}
        </div>
      )}
    </section>
  )
}
