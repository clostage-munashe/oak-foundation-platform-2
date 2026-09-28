-- Store only a one-way hash of attendee browser-session tokens and enforce server-side expiry.
-- Existing active sessions are migrated lazily on first use by the application; legacy tokens
-- older than 30 days are rejected and never migrated.
alter table public.registrations
  add column if not exists session_token_hash text,
  add column if not exists session_expires_at timestamptz;

create unique index if not exists registrations_session_hash_idx
  on public.registrations (session_token_hash)
  where session_token_hash is not null;

create index if not exists registrations_session_expiry_idx
  on public.registrations (session_expires_at)
  where session_expires_at is not null;

drop index if exists public.registration_session_idx;
