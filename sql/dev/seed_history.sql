-- Runs once, while study_sessions is empty.
do $$
declare
  a   uuid := '00000000-0000-4000-8000-000000000001';
  s1  uuid := '00000000-0000-4000-8000-000000000162';
  s2  uuid := '00000000-0000-4000-8000-000000000113';
  s3  uuid := '00000000-0000-4000-8000-000000000171';
  d0  date := public.tt_local(now())::date;
  at_ timestamptz;
begin
  if exists (select 1 from public.study_sessions) then
    return;
  end if;

  at_ := (d0 - 2 + time '08:52') at time zone public.tt_timezone();
  perform public.tt_clock_in (a, s1, at_);
  perform public.tt_clock_in (a, s2, at_ + interval '2h 39m');
  perform public.tt_clock_in (a, s1, at_ + interval '4h 13m');
  perform public.tt_clock_out(a, s1, at_ + interval '8h 20m');

  -- overnight
  at_ := (d0 - 1 + time '18:30') at time zone public.tt_timezone();
  perform public.tt_clock_in (a, s3, at_);
  perform public.tt_clock_in (a, s1, at_ + interval '3h 10m');
  perform public.tt_clock_out(a, s1, at_ + interval '6h 25m');
end
$$;
