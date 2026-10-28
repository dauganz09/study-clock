import type { Action } from '../api'
import type { Session } from '../../shared/types'
import { swatchVars, type StudyView } from '../studies'
import { fmtHMS, fmtSpoken } from '../time'
import { IconArrowSwap, IconPlay, IconStop } from './icons'

interface Props {
  studies: StudyView[]
  open: Session | null
  msByStudy: Map<string, number>
  nowMs: number
  pending: Action | null
  onAct: (action: Action) => void
}

export function StudyList({ studies, open, msByStudy, nowMs, pending, onAct }: Props) {
  const openStudy = studies.find((s) => s.id === open?.studyId)

  return (
    <section className="card" aria-labelledby="studies-h">
      <header className="card-head">
        <h2 id="studies-h">Studies</h2>
        <span className="card-count">{studies.length}</span>
      </header>

      {studies.length === 0 ? (
        <p className="empty">No studies on this assignment.</p>
      ) : (
        <ul className="study-list">
          {studies.map((study) => {
            const active = study === openStudy
            const saving = pending?.studyId === study.id
            const total = msByStudy.get(study.id) ?? 0

            return (
              <li key={study.id} className={active ? 'study active' : 'study'} style={swatchVars(study.swatch)}>
                <span className="study-code" aria-hidden>
                  {study.code}
                </span>

                <div className="study-body">
                  <div className="study-title">
                    <span>{study.name}</span>
                    {study.isMain && <span className="badge">Main</span>}
                  </div>
                  <div className="study-meta">
                    {study.protocolNumber && <span className="mono">{study.protocolNumber}</span>}
                    {active && open ? (
                      <span className="running-note">
                        <i aria-hidden />
                        <span className="mono">{fmtHMS(nowMs - Date.parse(open.startedAt))}</span>
                      </span>
                    ) : (
                      total > 0 && <span>{fmtSpoken(total)} today</span>
                    )}
                  </div>
                </div>

                <div className="study-action">
                  {active ? (
                    <button
                      className="btn btn-danger-soft"
                      disabled={!!pending}
                      onClick={() => onAct({ kind: 'out', studyId: study.id })}
                      aria-label={`Log out of ${study.label}`}
                    >
                      <IconStop />
                      {saving ? 'Saving…' : 'Log out'}
                    </button>
                  ) : (
                    <button
                      className="btn btn-secondary"
                      disabled={!!pending}
                      onClick={() => onAct({ kind: 'in', studyId: study.id })}
                      aria-label={
                        openStudy
                          ? `Log in to ${study.label} and log out of ${openStudy.label}`
                          : `Log in to ${study.label}`
                      }
                    >
                      {openStudy ? <IconArrowSwap /> : <IconPlay />}
                      {saving ? 'Saving…' : 'Log in'}
                    </button>
                  )}
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}
