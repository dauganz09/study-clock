# Study Clock

One screen where a candidate on a client assignment logs in and out of studies.
Every click is saved the moment it happens: to `public.study_sessions` (one row per session) and to
that day's row in `public.daily_timesheets`. [NOTES.md](NOTES.md) explains why there are two tables.

## Run it

```bash
npm install
cp .env.example .env        # put the DB password into DATABASE_URL
npm run db:apply            # installs sql/001_timesheet_rules.sql (safe to re-run)
npm run dev                 # http://localhost:5173
```

`npm test` runs the switching tests against an in-memory Postgres (PGlite), so it needs no
credentials. `npm run lint` checks formatting and types.

| Env var         | What it does                                                                             |
| --------------- | ---------------------------------------------------------------------------------------- |
| `DATABASE_URL`  | Sample database. Unset = local PGlite in `.data/` with demo rows, no credentials needed. |
| `ASSIGNMENT_ID` | The assignment to show. Required with `DATABASE_URL`; `.env.example` has Tammy Howe's.   |

## Stack, and why

- **React + Vite** for the screen: the fastest way for me to build a small, careful UI.
- **Hono on Node** as a thin API (`server/`): three routes, no business logic of its own.
- **Postgres functions + a trigger** (`sql/001_timesheet_rules.sql`) hold every rule, so the
  rules hold no matter who writes to the table.
- **PGlite** (real Postgres compiled to WASM) runs the same SQL in tests and in the demo DB.

## Layout

```
sql/001_timesheet_rules.sql   study_sessions table, functions, triggers (the part that matters)
sql/dev/                      mock of the real tables + demo seed, local only
server/tracker.ts             reads state, calls the SQL functions, maps rule errors to 409s
server/tracker.test.ts        switching, impossible clicks, midnight
shared/types.ts               the API's response shape, used by both sides
src/                          the screen
```

See [NOTES.md](NOTES.md) for the design decisions and what's missing.
