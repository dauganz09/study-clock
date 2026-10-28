-- Local copy of the sample tables we use. Tests and DATABASE_URL-less dev only.

create table if not exists public.studies (
  id              uuid primary key default gen_random_uuid(),
  title           text,
  protocol_number text,
  organization_id uuid,
  status          text
);

create table if not exists public.clients (
  id              uuid primary key default gen_random_uuid(),
  name            text not null,
  organization_id uuid
);

create table if not exists public.candidates (
  id              uuid primary key default gen_random_uuid(),
  full_name       text not null,
  organization_id uuid,
  study_id        uuid references public.studies(id)
);

create table if not exists public.assignments (
  id           uuid primary key default gen_random_uuid(),
  candidate_id uuid not null references public.candidates(id),
  client_id    uuid not null references public.clients(id)
);

create table if not exists public.daily_timesheets (
  id            uuid primary key default gen_random_uuid(),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  assignment_id uuid not null references public.assignments(id) on delete cascade,
  work_date     date not null,
  regular_hours numeric(4,2) not null default 0,
  clock_in      time,
  clock_out     time,
  break_minutes integer default 0,
  status        text not null default 'draft'
                check (status in ('draft', 'submitted', 'approved', 'rejected')),
  notes         text,
  study_id      uuid references public.studies(id) on delete set null,
  unique (assignment_id, work_date)
);
