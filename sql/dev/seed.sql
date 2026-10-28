insert into public.studies (id, title, protocol_number, organization_id, status) values
  ('00000000-0000-4000-8000-000000000162', 'Study 162 – Dermatology',        'CA-2026-0162', '00000000-0000-4000-8000-0000000000c1', 'Active'),
  ('00000000-0000-4000-8000-000000000113', 'Study 113 – Respiratory',        'CA-2026-0113', '00000000-0000-4000-8000-0000000000c1', 'Active'),
  ('00000000-0000-4000-8000-000000000171', 'Study 171 – Infectious Disease', 'CA-2026-0171', '00000000-0000-4000-8000-0000000000c2', 'Active'),
  ('00000000-0000-4000-8000-000000000172', 'Study 172 – Oncology',           'CA-2026-0172', '00000000-0000-4000-8000-0000000000c2', 'Active'),
  ('00000000-0000-4000-8000-000000000199', 'Study 199 – Not on this assignment', 'CA-2026-0199', null, 'Active')
on conflict (id) do nothing;

insert into public.clients (id, name, organization_id) values
  ('00000000-0000-4000-8000-0000000000a1', 'Marshfield Medical Center - Dickinson', '00000000-0000-4000-8000-0000000000c1')
on conflict (id) do nothing;

insert into public.candidates (id, full_name, organization_id, study_id) values
  ('00000000-0000-4000-8000-0000000000b1', 'Tammy Howe', '00000000-0000-4000-8000-0000000000c2', '00000000-0000-4000-8000-000000000162')
on conflict (id) do nothing;

insert into public.assignments (id, candidate_id, client_id) values
  ('00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-0000000000b1', '00000000-0000-4000-8000-0000000000a1')
on conflict (id) do nothing;
