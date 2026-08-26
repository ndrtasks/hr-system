-- NDR HR Academy progress store
-- Dedicated Supabase project recommended. Do not apply to unrelated production projects.
create extension if not exists pgcrypto;

create table if not exists public.academy_trainees (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 2 and 60),
  sync_token_hash text not null,
  progress jsonb not null default '{}'::jsonb,
  last_seen timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists academy_trainees_last_seen_idx on public.academy_trainees(last_seen desc);

create or replace function public.set_academy_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists academy_trainees_updated_at on public.academy_trainees;
create trigger academy_trainees_updated_at
before update on public.academy_trainees
for each row execute function public.set_academy_updated_at();

alter table public.academy_trainees enable row level security;

-- The browser never receives a Supabase key. All access is through /api/academy-progress,
-- which uses the service role server-side and validates coach / trainee tokens.
-- Therefore no anon/authenticated policies are intentionally created.
revoke all on table public.academy_trainees from anon, authenticated;

comment on table public.academy_trainees is 'Isolated NDR HR Academy trainee mastery snapshots; server-side access only.';