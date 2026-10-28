import { useCallback, useEffect, useRef, useState } from 'react'
import type { TrackerState } from '../shared/types'

async function call(path: string, body?: object): Promise<TrackerState> {
  const res = await fetch(path, {
    method: body ? 'POST' : 'GET',
    headers: body ? { 'content-type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  })
  const json = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(json.error ?? `Request failed (${res.status})`)
  return json
}

export type Action = { kind: 'in' | 'out'; studyId: string }

export function useTracker() {
  const [state, setState] = useState<TrackerState | null>(null)
  const [pending, setPending] = useState<Action | null>(null)
  const [error, setError] = useState<string | null>(null)
  // Offset from the database clock, so the timer matches the saved times.
  const skew = useRef(0)

  const accept = useCallback((s: TrackerState) => {
    skew.current = Date.parse(s.serverNow) - Date.now()
    setState(s)
  }, [])

  const refresh = useCallback(
    () =>
      call('/api/state')
        .then((s) => {
          accept(s)
          setError(null)
        })
        .catch((e: Error) => setError(e.message)),
    [accept],
  )

  useEffect(() => {
    refresh()
    const id = setInterval(refresh, 30_000)
    const onFocus = () => document.visibilityState === 'visible' && refresh()
    document.addEventListener('visibilitychange', onFocus)
    return () => {
      clearInterval(id)
      document.removeEventListener('visibilitychange', onFocus)
    }
  }, [refresh])

  const act = useCallback(
    async (action: Action) => {
      if (pending) return false
      setPending(action)
      setError(null)
      try {
        accept(await call(action.kind === 'in' ? '/api/clock-in' : '/api/clock-out', { studyId: action.studyId }))
        return true
      } catch (e) {
        setError((e as Error).message)
        refresh()
        return false
      } finally {
        setPending(null)
      }
    },
    [pending, accept, refresh],
  )

  return { state, pending, error, act, now: () => Date.now() + skew.current }
}

export function useTick() {
  const [, set] = useState(0)
  useEffect(() => {
    const id = setInterval(() => set((n) => n + 1), 1000)
    return () => clearInterval(id)
  }, [])
}
