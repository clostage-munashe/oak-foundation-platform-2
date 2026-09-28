-- Run once in Supabase SQL Editor, followed by seed.sql.
create table if not exists public.staff (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);
create table if not exists public.registrations (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  email text not null unique,
  data jsonb not null,
  checked_in_at timestamptz,
  created_at timestamptz not null default now(),
  constraint valid_email_normalization check (email = lower(email)),
  constraint valid_registration_data check (jsonb_typeof(data) = 'object')
);
create table if not exists public.partners (id text primary key, position integer not null default 0, data jsonb not null);
create table if not exists public.sessions (id text primary key, position integer not null default 0, data jsonb not null);
create table if not exists public.notes (id text primary key, data jsonb not null, created_at timestamptz not null default now());
create table if not exists public.resources (id text primary key, name text not null, storage_path text);
create index if not exists registrations_checked_in_idx on public.registrations(checked_in_at) where checked_in_at is not null;
alter table public.staff enable row level security;
alter table public.registrations enable row level security;
alter table public.partners enable row level security;
alter table public.sessions enable row level security;
alter table public.notes enable row level security;
alter table public.resources enable row level security;
-- A user can check their own staff membership, but cannot assign it.
create policy "Read own staff membership" on public.staff for select to authenticated using (user_id = (select auth.uid()));
-- Public event content only. Registrations and resource paths have no anon policy.
create policy "Read partner directory" on public.partners for select to anon, authenticated using (true);
create policy "Read programme" on public.sessions for select to anon, authenticated using (true);
create policy "Read shared notes" on public.notes for select to anon, authenticated using (true);
-- Data changes go through validated Next.js endpoints. Staff endpoints verify membership.
revoke all on public.staff, public.registrations, public.partners, public.sessions, public.notes, public.resources from anon, authenticated;
grant select on public.staff to authenticated;
grant select on public.partners, public.sessions, public.notes to anon, authenticated;
grant all on public.staff, public.registrations, public.partners, public.sessions, public.notes, public.resources to service_role;
-- The bucket remains private. Downloads use short-lived signed URLs from the server.
insert into storage.buckets (id, name, public, file_size_limit)
values ('event-resources', 'event-resources', false, 209715200)
on conflict (id) do nothing;
