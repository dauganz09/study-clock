# Notes

Candidate: **Tammy Howe** at **Marshfield Medical Center – Dickinson** (Iron Mountain, MI).

## Table design

The brief says each `daily_timesheets` row is one session. But the table has `UNIQUE (assignment_id, work_date)`, so a
switch can't add a second row that day. So I kept it as the day's timesheet and added one table. Each click writes both
tables in one transaction.

| Table                         | One row per      | Holds                                                                           |
| ----------------------------- | ---------------- | ------------------------------------------------------------------------------- |
| `daily_timesheets` (existing) | assignment + day | `clock_in` = first login, `clock_out` = last logout, `study_id` = current study |
| `study_sessions` (new)        | session          | `study_id`, `started_at`, `ended_at`; the activity log reads this               |

Times come from the database's `now()`, never the browser. Hour columns stay at 0 until the rounding rules are known.

## Rules, enforced in Postgres

- **One study at a time:** a partial unique index allows one running session per assignment.
- **Switching:** `tt_clock_in` ends the old session and starts the new one at the same instant.
- **Impossible clicks:** `tt_clock_out` fails unless that study is running. The API returns 409.
- **Double clicks, two tabs:** an advisory lock per assignment puts writes in order.

## Time zones and midnight

`clock_in`/`clock_out` are **site time**, `America/Menominee` (Iron Mountain is on Central time). `study_sessions` stores
`timestamptz`, so durations stay exact across DST. A shift past midnight stays on its start day (23:30 → 00:45), like
the table's existing overnight rows.

## Gaps and next steps

- **App login:** the server uses the database login. The rules are SQL functions, so `supabase.rpc` would also work.
- **Studies:** nothing links studies to assignments, so I show her main study plus her and the client's organizations.
- **Side effect:** the platform's own trigger writes a zero-hour `weekly_actuals` row on every save.
- **Next:** fill in hours, and flag sessions left open over 12h.
- **Stretch:** daily total per study.
