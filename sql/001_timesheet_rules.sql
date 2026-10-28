-- Sessions per study on top of daily_timesheets, which allows one row per
-- assignment per day (see NOTES.md).
--
-- SQLSTATEs: TT001 second running session, TT002 not logged in to that study,
--            TT004 clock went backwards, TT005 day is no longer a draft.

-- Iron Mountain, MI is on Central time.
create or replace function public.tt_timezone()
returns text
language sql
immutable
as $$ select 'America/Menominee' $$;

create or replace function public.tt_local(p_at timestamptz)
returns timestamp
language sql
stable
as $$ select date_trunc('second', p_at at time zone public.tt_timezone()) $$;

create or replace function public.tt_lock_assignment(p_assignment_id uuid)
returns void
language sql
as $$ select pg_advisory_xact_lock(hashtextextended('study_sessions:' || p_assignment_id::text, 0)) $$;

-- No foreign keys: this role lacks REFERENCES on the platform tables.
create table if not exists public.study_sessions (
  id            uuid primary key default gen_random_uuid(),
  timesheet_id  uuid not null, -- daily_timesheets.id
  assignment_id uuid not null, -- assignments.id
  study_id      uuid not null, -- studies.id
  started_at    timestamptz not null,
  ended_at      timestamptz,
  created_at    timestamptz not null default now(),
  constraint study_sessions_ends_after_start check (ended_at is null or ended_at >= started_at)
);

create unique index if not exists study_sessions_one_running
  on public.study_sessions (assignment_id)
  where ended_at is null;

create index if not exists study_sessions_assignment_started
  on public.study_sessions (assignment_id, started_at desc);

create or replace function public.tt_check_open_day()
returns trigger
language plpgsql
as $$
begin
  if new.clock_in is not null and new.clock_out is null then
    perform public.tt_lock_assignment(new.assignment_id);
    if exists (
      select 1
      from public.daily_timesheets d
      where d.assignment_id = new.assignment_id
        and d.clock_in is not null
        and d.clock_out is null
        and d.id <> new.id
    ) then
      raise exception 'assignment % already has an open timesheet day', new.assignment_id
        using errcode = 'TT001';
    end if;
  end if;
  return new;
end
$$;

-- Created only if missing: DROP TRIGGER needs table ownership.
do $$
begin
  if not exists (
    select 1 from pg_trigger
    where tgname = 'tt_check_open_day' and tgrelid = 'public.daily_timesheets'::regclass
  ) then
    create trigger tt_check_open_day
      before insert or update of clock_in, clock_out, assignment_id
      on public.daily_timesheets
      for each row
      execute function public.tt_check_open_day();
  end if;
end
$$;

-- Stands in for ON DELETE CASCADE.
create or replace function public.tt_delete_day_sessions()
returns trigger
language plpgsql
as $$
begin
  delete from public.study_sessions where timesheet_id = old.id;
  return old;
end
$$;

do $$
begin
  if not exists (
    select 1 from pg_trigger
    where tgname = 'tt_delete_day_sessions' and tgrelid = 'public.daily_timesheets'::regclass
  ) then
    create trigger tt_delete_day_sessions
      after delete on public.daily_timesheets
      for each row
      execute function public.tt_delete_day_sessions();
  end if;
end
$$;

create or replace function public.tt_day_for(p_assignment_id uuid, p_at timestamptz)
returns uuid
language plpgsql
as $$
declare
  v_local timestamp := public.tt_local(p_at);
  v_day   public.daily_timesheets;
begin
  select * into v_day
  from public.daily_timesheets
  where assignment_id = p_assignment_id and work_date = v_local::date
  for update;

  if not found then
    insert into public.daily_timesheets (assignment_id, work_date, clock_in)
    values (p_assignment_id, v_local::date, v_local::time)
    returning * into v_day;
    return v_day.id;
  end if;

  if v_day.status <> 'draft' then
    raise exception 'timesheet for % is %', v_day.work_date, v_day.status
      using errcode = 'TT005';
  end if;

  update public.daily_timesheets
     set clock_in = coalesce(clock_in, v_local::time),
         clock_out = null
   where id = v_day.id;
  return v_day.id;
end
$$;

create or replace function public.tt_clock_in(
  p_assignment_id uuid,
  p_study_id      uuid,
  p_at            timestamptz default now()
)
returns public.study_sessions
language plpgsql
as $$
declare
  v_at   timestamptz := date_trunc('second', p_at);
  v_open public.study_sessions;
  v_day  uuid;
  v_new  public.study_sessions;
begin
  perform public.tt_lock_assignment(p_assignment_id);

  select * into v_open
  from public.study_sessions
  where assignment_id = p_assignment_id and ended_at is null
  for update;

  if found and v_open.study_id = p_study_id then
    return v_open;
  end if;

  if found then
    if v_at < v_open.started_at then
      raise exception 'now (%) is before the running session started (%)', v_at, v_open.started_at
        using errcode = 'TT004';
    end if;
    update public.study_sessions set ended_at = v_at where id = v_open.id;
    v_day := v_open.timesheet_id;
  else
    v_day := public.tt_day_for(p_assignment_id, v_at);
  end if;

  insert into public.study_sessions (timesheet_id, assignment_id, study_id, started_at)
  values (v_day, p_assignment_id, p_study_id, v_at)
  returning * into v_new;

  update public.daily_timesheets
     set study_id = p_study_id
   where id = v_day;

  return v_new;
end
$$;

create or replace function public.tt_clock_out(
  p_assignment_id uuid,
  p_study_id      uuid,
  p_at            timestamptz default now()
)
returns public.study_sessions
language plpgsql
as $$
declare
  v_at   timestamptz := date_trunc('second', p_at);
  v_open public.study_sessions;
begin
  perform public.tt_lock_assignment(p_assignment_id);

  select * into v_open
  from public.study_sessions
  where assignment_id = p_assignment_id and ended_at is null
  for update;

  if not found or v_open.study_id <> p_study_id then
    raise exception 'not logged in to study %', p_study_id
      using errcode = 'TT002';
  end if;

  if v_at < v_open.started_at then
    raise exception 'now (%) is before the running session started (%)', v_at, v_open.started_at
      using errcode = 'TT004';
  end if;

  update public.study_sessions set ended_at = v_at where id = v_open.id
  returning * into v_open;

  update public.daily_timesheets
     set clock_out = public.tt_local(v_at)::time
   where id = v_open.timesheet_id;

  return v_open;
end
$$;

-- p_limit null = every session.
drop function if exists public.tt_sessions(uuid, int);
create or replace function public.tt_sessions(p_assignment_id uuid, p_limit int default null)
returns table (
  id         uuid,
  study_id   uuid,
  work_date  date,
  clock_in   time,
  clock_out  time,
  start_date date,
  end_date   date,
  started_at timestamptz,
  ended_at   timestamptz
)
language sql
stable
as $$
  select s.id, s.study_id, d.work_date,
         public.tt_local(s.started_at)::time,
         public.tt_local(s.ended_at)::time,
         public.tt_local(s.started_at)::date,
         public.tt_local(s.ended_at)::date,
         s.started_at, s.ended_at
  from public.study_sessions s
  join public.daily_timesheets d on d.id = s.timesheet_id
  where s.assignment_id = p_assignment_id
  order by s.started_at desc, s.id desc
  limit p_limit
$$;
