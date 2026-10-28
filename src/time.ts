// clock_in / clock_out are already site wall-clock times, so they are
// formatted as-is, never through the browser's zone.

const pad = (n: number) => String(n).padStart(2, '0')

export function fmtClock(t: string) {
  const [h, m] = t.split(':').map(Number)
  const suffix = h < 12 ? 'AM' : 'PM'
  return `${h % 12 || 12}:${pad(m)} ${suffix}`
}

export function clockMinutes(t: string) {
  const [h, m, s] = t.split(':').map(Number)
  return h * 60 + m + s / 60
}

export function fmtHM(ms: number) {
  const mins = Math.max(0, Math.floor(ms / 60_000))
  return `${Math.floor(mins / 60)}:${pad(mins % 60)}`
}

export function fmtSpoken(ms: number) {
  const mins = Math.max(0, Math.floor(ms / 60_000))
  const h = Math.floor(mins / 60)
  return h ? `${h}h ${pad(mins % 60)}m` : `${mins}m`
}

export function fmtHMS(ms: number) {
  const s = Math.max(0, Math.floor(ms / 1000))
  return `${pad(Math.floor(s / 3600))}:${pad(Math.floor(s / 60) % 60)}:${pad(s % 60)}`
}

export function siteNow(timezone: string, nowMs: number) {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      hourCycle: 'h23',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    })
      .formatToParts(nowMs)
      .map((p) => [p.type, p.value]),
  )
  const time = `${parts.hour}:${parts.minute}:${parts.second}`
  return { date: `${parts.year}-${parts.month}-${parts.day}`, time, minutes: clockMinutes(time) }
}

export function fmtDate(isoDate: string, opts: Intl.DateTimeFormatOptions = {}) {
  return new Date(`${isoDate}T12:00:00Z`).toLocaleDateString('en-US', {
    timeZone: 'UTC',
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    ...opts,
  })
}

export function zoneAbbr(timezone: string, nowMs: number) {
  return (
    new Intl.DateTimeFormat('en-US', { timeZone: timezone, timeZoneName: 'short' })
      .formatToParts(nowMs)
      .find((p) => p.type === 'timeZoneName')?.value ?? timezone
  )
}
