import type { Session } from '../../shared/types'
import { swatchVars, type StudyView } from '../studies'
import { fmtClock, fmtHMS, fmtSpoken } from '../time'
import { IconStop } from './icons'

interface Props {
  study: StudyView | null
  session: Session | null
  nowMs: number
  zone: string
  totalMs: number
  sessionCount: number
  busy: boolean
  onLogout: () => void
}

export function CurrentSession({ study, session, nowMs, zone, totalMs, sessionCount, busy, onLogout }: Props) {
  const running = study && session
  const elapsed = session ? nowMs - Date.parse(session.startedAt) : 0

  return (
    <section
      className={running ? 'current is-running' : 'current'}
      style={running ? swatchVars(study.swatch) : undefined}
      aria-label="Current session"
    >
      <div className="current-main">
        <div className="current-status">
          <span className="status-dot" aria-hidden />
          {running ? 'Logged in' : 'Not logged in'}
        </div>
        {running ? (
          <>
            <h2 className="current-title">
              <span className="current-code mono">{study.code}</span>
              {study.name}
            </h2>
            <p className="current-meta">
              {study.protocolNumber && <span className="mono">{study.protocolNumber}</span>}
              <span>
                Since {fmtClock(session.clockIn)} {zone}
              </span>
            </p>
          </>
        ) : (
          <h2 className="current-title muted">No study running</h2>
        )}
      </div>

      <div className="current-timer mono">{fmtHMS(elapsed)}</div>

      <div className="current-side">
        <dl className="current-stats">
          <div>
            <dt>Today</dt>
            <dd className="mono">{fmtSpoken(totalMs)}</dd>
          </div>
          <div>
            <dt>Sessions</dt>
            <dd className="mono">{sessionCount}</dd>
          </div>
        </dl>
        {running && (
          <button className="btn btn-danger btn-lg" onClick={onLogout} disabled={busy}>
            <IconStop />
            {busy ? 'Saving…' : `Log out of ${study.label}`}
          </button>
        )}
      </div>
    </section>
  )
}
