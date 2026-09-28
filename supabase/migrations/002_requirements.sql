-- Apply after 001_event_portal.sql. QR codes belong only to Partners.
alter table public.registrations alter column code drop not null;
update public.registrations set data=jsonb_set(data,'{role}','"Presenter"') where data->>'role'='Speaker';
update public.registrations set data=jsonb_set(data,'{role}','"Coordination Team"') where data->>'role'='Facilitator';
update public.registrations set data=jsonb_set(data,'{role}','"Observer"') where data->>'role'='Guest';
update public.registrations set code=null, data=jsonb_set(data,'{code}','""') where data->>'role'<>'Partner';
create unique index if not exists registration_session_idx on public.registrations ((data->>'sessionToken')) where data ? 'sessionToken';
-- All content access now goes through role-checked Next.js routes.
drop policy if exists "Read shared notes" on public.notes;
drop policy if exists "Read partner directory" on public.partners;
drop policy if exists "Read programme" on public.sessions;
revoke select on public.notes, public.partners, public.sessions from anon, authenticated;
