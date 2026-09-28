-- Atomic, shared fixed-window API rate limiting for production instances.
-- Run after 001_event_portal.sql and 002_requirements.sql.
create table if not exists public.api_rate_limits (
  key_hash text primary key,
  window_started_at timestamptz not null,
  hit_count integer not null check (hit_count > 0)
);

alter table public.api_rate_limits enable row level security;
revoke all on public.api_rate_limits from anon, authenticated;
grant all on public.api_rate_limits to service_role;

create or replace function public.consume_api_rate_limit(
  p_key text,
  p_limit integer,
  p_window_seconds integer
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_hits integer;
begin
  if p_key !~ '^[a-f0-9]{64}$' or p_limit < 1 or p_limit > 10000 or p_window_seconds < 1 or p_window_seconds > 86400 then
    raise exception 'Invalid rate-limit arguments';
  end if;

  insert into public.api_rate_limits (key_hash, window_started_at, hit_count)
  values (p_key, now(), 1)
  on conflict (key_hash) do update
  set window_started_at = case
        when public.api_rate_limits.window_started_at <= now() - make_interval(secs => p_window_seconds) then now()
        else public.api_rate_limits.window_started_at
      end,
      hit_count = case
        when public.api_rate_limits.window_started_at <= now() - make_interval(secs => p_window_seconds) then 1
        else public.api_rate_limits.hit_count + 1
      end
  returning hit_count into v_hits;

  -- Opportunistic cleanup avoids requiring an external scheduled job.
  if random() < 0.01 then
    delete from public.api_rate_limits
    where window_started_at < now() - interval '1 day';
  end if;

  return v_hits <= p_limit;
end;
$$;

revoke all on function public.consume_api_rate_limit(text, integer, integer) from public, anon, authenticated;
grant execute on function public.consume_api_rate_limit(text, integer, integer) to service_role;
