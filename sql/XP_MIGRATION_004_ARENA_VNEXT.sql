-- GankByte Arena vNext
-- Adds server-validated run sessions, event/tournament records, and event scores.
-- Run once in the Supabase SQL Editor after XP_MIGRATION_003.sql.

alter table public.arena_events
  add column if not exists kind text not null default 'challenge';

alter table public.arena_events
  add column if not exists created_by uuid references public.profiles(id);

alter table public.arena_scores
  add column if not exists event_slug text references public.arena_events(slug);

alter table public.arena_scores
  add column if not exists run_session_id uuid;

alter table public.glitch_dash_scores
  add column if not exists event_slug text references public.arena_events(slug);

alter table public.glitch_dash_scores
  add column if not exists run_session_id uuid;

create table if not exists public.arena_run_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  game_slug text not null check (game_slug in ('byte-rush', 'glitch-dash')),
  event_slug text references public.arena_events(slug),
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  client_seconds integer,
  server_seconds integer,
  reported_score integer,
  reported_stat integer,
  verification_status text not null default 'open' check (verification_status in ('open', 'verified', 'rejected')),
  rejection_reason text,
  created_at timestamptz not null default now()
);

create table if not exists public.arena_event_scores (
  event_slug text not null references public.arena_events(slug) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  game_slug text not null check (game_slug in ('byte-rush', 'glitch-dash')),
  score integer not null check (score >= 0 and score <= 1000000),
  stat integer not null default 0 check (stat >= 0),
  run_session_id uuid references public.arena_run_sessions(id),
  updated_at timestamptz not null default now(),
  primary key (event_slug, user_id)
);

create index if not exists arena_run_sessions_user_idx on public.arena_run_sessions(user_id, created_at desc);
create index if not exists arena_run_sessions_event_idx on public.arena_run_sessions(event_slug, created_at desc);
create index if not exists arena_event_scores_event_idx on public.arena_event_scores(event_slug, score desc);

alter table public.arena_run_sessions enable row level security;
alter table public.arena_event_scores enable row level security;

grant select on public.arena_run_sessions to authenticated;
grant select on public.arena_event_scores to anon, authenticated;

drop policy if exists "Players see their own run sessions" on public.arena_run_sessions;
create policy "Players see their own run sessions" on public.arena_run_sessions
  for select to authenticated using (auth.uid() = user_id or exists (select 1 from public.profiles where id = auth.uid() and is_admin));

drop policy if exists "Public event scores are visible" on public.arena_event_scores;
create policy "Public event scores are visible" on public.arena_event_scores
  for select using (true);

create or replace view public.arena_live_events as
select slug, title, game, description, rules_url, status, kind, starts_at, ends_at
from public.arena_events
where status in ('upcoming', 'live')
order by starts_at nulls last, created_at desc;

grant select on public.arena_live_events to anon, authenticated;

create or replace function public.start_arena_run(p_game_slug text, p_event_slug text default null)
returns table (run_id uuid, started_at timestamptz)
language plpgsql
security definer
set search_path = public
as $$
declare
  selected_event public.arena_events;
  new_run public.arena_run_sessions;
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;
  if p_game_slug not in ('byte-rush', 'glitch-dash') then
    raise exception 'Unknown Arena game';
  end if;
  if p_event_slug is not null and btrim(p_event_slug) <> '' then
    select * into selected_event
    from public.arena_events
    where slug = p_event_slug and status = 'live'
    for share;
    if not found then
      raise exception 'That event is not live';
    end if;
    if lower(replace(selected_event.game, ' ', '-')) <> p_game_slug then
      raise exception 'That event belongs to a different game';
    end if;
  end if;
  insert into public.arena_run_sessions (user_id, game_slug, event_slug)
  values (auth.uid(), p_game_slug, nullif(btrim(p_event_slug), ''))
  returning * into new_run;
  return query select new_run.id, new_run.started_at;
end;
$$;

create or replace function public.submit_verified_arena_run(
  p_run_id uuid,
  p_score integer,
  p_stat integer,
  p_client_seconds integer
)
returns table (run_id uuid, game_slug text, score integer, stat integer, server_seconds integer, verification_status text)
language plpgsql
security definer
set search_path = public
as $$
declare
  run_row public.arena_run_sessions;
  observed_seconds integer;
  safe_score integer;
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;
  select * into run_row
  from public.arena_run_sessions
  where id = p_run_id and user_id = auth.uid()
  for update;
  if not found then
    raise exception 'Arena run session not found';
  end if;
  if run_row.verification_status <> 'open' then
    raise exception 'Arena run session already submitted';
  end if;
  if p_score is null or p_score < 0 or p_score > 1000000 then
    raise exception 'Score is outside the allowed range';
  end if;
  if p_stat is null or p_stat < 0 then
    raise exception 'Run statistic is outside the allowed range';
  end if;
  observed_seconds := greatest(0, floor(extract(epoch from (now() - run_row.started_at)))::integer);
  if p_client_seconds is null or abs(p_client_seconds - observed_seconds) > 12 then
    raise exception 'Run duration could not be verified';
  end if;
  safe_score := greatest(1000, observed_seconds * 12000);
  if p_score > safe_score then
    raise exception 'Score is outside the verified run envelope';
  end if;

  update public.arena_run_sessions
  set completed_at = now(),
      client_seconds = p_client_seconds,
      server_seconds = observed_seconds,
      reported_score = p_score,
      reported_stat = p_stat,
      verification_status = 'verified'
  where id = run_row.id;

  if run_row.game_slug = 'byte-rush' then
    insert into public.arena_scores (user_id, score, wave, run_seconds, status, event_slug, run_session_id)
    values (run_row.user_id, p_score, greatest(1, least(4, p_stat)), observed_seconds, 'approved', run_row.event_slug, run_row.id);
  else
    insert into public.glitch_dash_scores (user_id, score, streak, run_seconds, status, event_slug, run_session_id)
    values (run_row.user_id, p_score, p_stat, observed_seconds, 'approved', run_row.event_slug, run_row.id);
  end if;

  if run_row.event_slug is not null then
    insert into public.arena_event_scores (event_slug, user_id, game_slug, score, stat, run_session_id)
    values (run_row.event_slug, run_row.user_id, run_row.game_slug, p_score, p_stat, run_row.id)
    on conflict (event_slug, user_id) do update
      set score = greatest(public.arena_event_scores.score, excluded.score),
          stat = case when excluded.score >= public.arena_event_scores.score then excluded.stat else public.arena_event_scores.stat end,
          run_session_id = case when excluded.score >= public.arena_event_scores.score then excluded.run_session_id else public.arena_event_scores.run_session_id end,
          updated_at = now();
  end if;

  return query select run_row.id, run_row.game_slug, p_score, p_stat, observed_seconds, 'verified'::text;
end;
$$;

create or replace function public.upsert_arena_event(
  p_slug text,
  p_title text,
  p_game text,
  p_description text,
  p_kind text default 'challenge',
  p_status text default 'upcoming',
  p_rules_url text default null,
  p_starts_at timestamptz default null,
  p_ends_at timestamptz default null
)
returns public.arena_events
language plpgsql
security definer
set search_path = public
as $$
declare saved_event public.arena_events;
begin
  if not exists (select 1 from public.profiles where id = auth.uid() and is_admin) then
    raise exception 'Admin access required';
  end if;
  if p_slug !~ '^[a-z0-9][a-z0-9-]{2,62}$' then
    raise exception 'Use a lowercase event slug with letters, numbers, or hyphens';
  end if;
  if p_game not in ('Byte Rush', 'Glitch Dash') then
    raise exception 'Unknown Arena game';
  end if;
  insert into public.arena_events (slug, title, game, description, kind, status, rules_url, starts_at, ends_at, created_by)
  values (p_slug, btrim(p_title), p_game, btrim(p_description), coalesce(nullif(p_kind, ''), 'challenge'), coalesce(nullif(p_status, ''), 'upcoming'), p_rules_url, p_starts_at, p_ends_at, auth.uid())
  on conflict (slug) do update set title = excluded.title, game = excluded.game, description = excluded.description, kind = excluded.kind, status = excluded.status, rules_url = excluded.rules_url, starts_at = excluded.starts_at, ends_at = excluded.ends_at
  returning * into saved_event;
  return saved_event;
end;
$$;

revoke execute on function public.start_arena_run(text, text) from public;
revoke execute on function public.submit_verified_arena_run(uuid, integer, integer, integer) from public;
revoke execute on function public.upsert_arena_event(text, text, text, text, text, text, text, timestamptz, timestamptz) from public;
grant execute on function public.start_arena_run(text, text) to authenticated;
grant execute on function public.submit_verified_arena_run(uuid, integer, integer, integer) to authenticated;
grant execute on function public.upsert_arena_event(text, text, text, text, text, text, text, timestamptz, timestamptz) to authenticated;

-- Challenge #001 remains postponed until it is deliberately reopened.
update public.arena_events
set status = 'upcoming'
where slug = 'weekend-challenge-001' and status = 'live';
