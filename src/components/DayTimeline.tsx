import type { Session } from '../../shared/types'
import { swatchVars, type StudyView } from '../studies'
import { clockMinutes, fmtClock, fmtDate, fmtHM, fmtSpoken } from '../time'

interface Props {
  studyById: Map<string, StudyView>
  sessions: Session[]
  shiftDate: string
  isToday: boolean
  nowMs: number
  /** Minutes since midnight of shiftDate; past 1440 once the shift crosses midnight. */
  nowMinutes: number
  msByStudy: Map<string, number>
  totalMs: number
}

function hourLabel(hour: number) {
  const h = hour % 24
  if (h === 0) return '12a'
  if (h === 12) return '12p'
  return h < 12 ? `${h}a` : `${h - 12}p`
}

export function DayTimeline({ studyById, sessions, shiftDate, isToday, nowMs, nowMinutes, msByStudy, totalMs }: Props) {
  const spans = sessions
    .map((s) => {
      const from = clockMinutes(s.clockIn) + (s.startDate === s.workDate ? 0 : 1440)
      const end = s.endedAt ? Date.parse(s.endedAt) : nowMs
      return { s, from, to: from + (end - Date.parse(s.startedAt)) / 60_000 }
    })
    .sort((a, b) => a.from - b.from)

  const first = spans[0]?.from ?? nowMinutes
  const last = Math.max(nowMinutes, ...spans.map((x) => x.to))
  const startH = Math.max(0, Math.min(7, Math.floor(first / 60)))
  const endH = Math.min(36, Math.max(19, Math.ceil(last / 60)))
  const range = (endH - startH) * 60
  const pct = (minutes: number) => `${((minutes - startH * 60) / range) * 100}%`
  const hours = Array.from({ length: endH - startH + 1 }, (_, i) => startH + i)
  const labelEvery = endH - startH > 14 ? 2 : 1

  const ranked = [...msByStudy]
    .flatMap(([id, ms]) => {
      const study = studyById.get(id)
      return study && ms > 0 ? [{ study, ms }] : []
    })
    .sort((a, b) => b.ms - a.ms)

  return (
    <section className="card" aria-labelledby="day-h">
      <header className="card-head">
        <h2 id="day-h">{isToday ? 'Today' : 'This shift'}</h2>
        <span className="card-meta">
          {isToday ? '' : 'Started '}
          {fmtDate(shiftDate)} · {fmtSpoken(totalMs)}
        </span>
      </header>

      <div className="ruler" role="img" aria-label="Sessions on a time line">
        <div className="ruler-lane">
          {hours.map((h) => (
            <i key={h} className="ruler-grid" style={{ left: pct(h * 60) }} aria-hidden />
          ))}
          {spans.length === 0 && <span className="lane-empty">Nothing logged yet</span>}
          {spans.map(({ s, from, to }) => {
            const study = studyById.get(s.studyId)
            const widthPct = ((to - from) / range) * 100
            const position = { left: pct(from), width: `max(${widthPct}%, 3px)` }
            return (
              <div
                key={s.id}
                className={s.endedAt ? 'block' : 'block running'}
                style={study ? swatchVars(study.swatch, position) : position}
                title={`${study?.label ?? 'Study'} · ${fmtClock(s.clockIn)} – ${s.clockOut ? fmtClock(s.clockOut) : 'now'}`}
              />
            )
          })}
          {nowMinutes >= startH * 60 && nowMinutes <= endH * 60 && (
            <i className="now-line" style={{ left: pct(nowMinutes) }} aria-hidden />
          )}
        </div>
        <div className="ruler-hours" aria-hidden>
          {hours
            .filter((h) => (h - startH) % labelEvery === 0)
            .map((h) => (
              <span key={h} style={{ left: pct(h * 60) }}>
                {hourLabel(h)}
              </span>
            ))}
        </div>
      </div>

      {ranked.length > 0 ? (
        <ul className="totals">
          {ranked.map(({ study, ms }) => (
            <li key={study.id} style={swatchVars(study.swatch)}>
              <span className="totals-label">
                <i aria-hidden />
                {study.label}
              </span>
              <span className="totals-bar" aria-hidden>
                <span style={{ width: `${(ms / totalMs) * 100}%` }} />
              </span>
              <span className="totals-value mono">{fmtHM(ms)}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="empty">Daily totals appear after the first login.</p>
      )}
    </section>
  )
}
