-- Adds mode-aware score storage and separate public boards for every game mode.
-- Run after XP_MIGRATION_005_SYMBOL_CATCH.sql.

alter table public.arena_scores add column if not exists mode text not null default 'wrap';
update public.arena_scores set mode = 'wrap' where mode is null;
alter table public.arena_scores drop constraint if exists arena_scores_mode_check;
alter table public.arena_scores add constraint arena_scores_mode_check check (mode in ('wrap', 'walls'));

alter table public.arena_run_sessions add column if not exists mode text not null default 'default';
alter table public.arena_run_sessions drop constraint if exists arena_run_sessions_mode_check;
alter table public.arena_run_sessions add constraint arena_run_sessions_mode_check check (mode in ('wrap', 'walls', 'default'));

drop view if exists public.arena_leaderboard;
drop view if exists public.arena_weekly_leaderboard;
drop view if exists public.symbol_catch_leaderboard;
drop view if exists public.symbol_catch_weekly_leaderboard;

create view public.arena_leaderboard as
select p.id, p.display_name, best.score as best_score, best.wave as best_wave, best.mode, best.created_at as latest_run
from public.profiles p
join lateral (
  select distinct on (s.mode) s.score, s.wave, s.mode, s.created_at
  from public.arena_scores s
  where s.user_id = p.id and s.status = 'approved'
  order by s.mode, s.score desc, s.created_at desc
) best on true;
grant select on public.arena_leaderboard to anon, authenticated;

create view public.arena_weekly_leaderboard as
select p.id, p.display_name, best.score as best_score, best.wave as best_wave, best.mode, best.created_at as latest_run
from public.profiles p
join lateral (
  select distinct on (s.mode) s.score, s.wave, s.mode, s.created_at
  from public.arena_scores s
  where s.user_id = p.id and s.status = 'approved' and s.created_at >= now() - interval '7 days'
  order by s.mode, s.score desc, s.created_at desc
) best on true;
grant select on public.arena_weekly_leaderboard to anon, authenticated;

create view public.symbol_catch_leaderboard as
select p.id, p.display_name, best.score as best_score, best.best_streak, best.mode, best.created_at as latest_run
from public.profiles p
join lateral (
  select distinct on (s.mode) s.score, s.best_streak, s.mode, s.created_at
  from public.symbol_catch_scores s
  where s.user_id = p.id and s.status = 'approved'
  order by s.mode, s.score desc, s.best_streak desc, s.created_at desc
) best on true;
grant select on public.symbol_catch_leaderboard to anon, authenticated;

create view public.symbol_catch_weekly_leaderboard as
select p.id, p.display_name, best.score as best_score, best.best_streak, best.mode, best.created_at as latest_run
from public.profiles p
join lateral (
  select distinct on (s.mode) s.score, s.best_streak, s.mode, s.created_at
  from public.symbol_catch_scores s
  where s.user_id = p.id and s.status = 'approved' and s.created_at >= now() - interval '7 days'
  order by s.mode, s.score desc, s.best_streak desc, s.created_at desc
) best on true;
grant select on public.symbol_catch_weekly_leaderboard to anon, authenticated;

create or replace function public.start_arena_run(p_game_slug text, p_event_slug text default null, p_mode text default 'default')
returns table (run_id uuid, started_at timestamptz)
language plpgsql security definer set search_path = public
as $$
declare selected_event public.arena_events; new_run public.arena_run_sessions; selected_mode text;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  if p_game_slug not in ('byte-rush', 'glitch-dash') then raise exception 'Unknown Arena game'; end if;
  selected_mode := case when p_game_slug = 'byte-rush' then coalesce(nullif(p_mode, ''), 'wrap') else 'default' end;
  if p_game_slug = 'byte-rush' and selected_mode not in ('wrap', 'walls') then raise exception 'Unknown Byte Rush mode'; end if;
  if nullif(btrim(p_event_slug), '') is not null then
    select * into selected_event from public.arena_events where slug = btrim(p_event_slug) and status = 'live' for share;
    if not found then raise exception 'That event is not live'; end if;
    if lower(replace(selected_event.game, ' ', '-')) <> p_game_slug then raise exception 'That event belongs to a different game'; end if;
  end if;
  insert into public.arena_run_sessions (user_id, game_slug, mode, event_slug)
  values (auth.uid(), p_game_slug, selected_mode, nullif(btrim(p_event_slug), '')) returning * into new_run;
  return query select new_run.id, new_run.started_at;
end;
$$;

create or replace function public.submit_verified_arena_run(p_run_id uuid, p_score integer, p_stat integer, p_client_seconds integer, p_mode text default 'default')
returns table (run_id uuid, game_slug text, score integer, stat integer, server_seconds integer, verification_status text)
language plpgsql security definer set search_path = public
as $$
declare run_row public.arena_run_sessions; observed_seconds integer; safe_score integer;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  select * into run_row from public.arena_run_sessions where id = p_run_id and user_id = auth.uid() for update;
  if not found then raise exception 'Arena run session not found'; end if;
  if run_row.verification_status <> 'open' then raise exception 'Arena run session already submitted'; end if;
  if p_score is null or p_score < 0 or p_score > 1000000 then raise exception 'Score is outside the allowed range'; end if;
  if p_stat is null or p_stat < 0 then raise exception 'Run statistic is outside the allowed range'; end if;
  observed_seconds := greatest(0, floor(extract(epoch from (now() - run_row.started_at)))::integer);
  if p_client_seconds is null or abs(p_client_seconds - observed_seconds) > 12 then raise exception 'Run duration could not be verified'; end if;
  safe_score := greatest(1000, observed_seconds * 12000);
  if p_score > safe_score then raise exception 'Score is outside the verified run envelope'; end if;
  update public.arena_run_sessions set completed_at = now(), client_seconds = p_client_seconds, server_seconds = observed_seconds, reported_score = p_score, reported_stat = p_stat, verification_status = 'verified' where id = run_row.id;
  if run_row.game_slug = 'byte-rush' then
    insert into public.arena_scores (user_id, score, wave, mode, run_seconds, status, event_slug, run_session_id)
    values (run_row.user_id, p_score, greatest(1, least(4, p_stat)), run_row.mode, observed_seconds, 'approved', run_row.event_slug, run_row.id);
  else
    insert into public.glitch_dash_scores (user_id, score, streak, run_seconds, status, event_slug, run_session_id)
    values (run_row.user_id, p_score, p_stat, observed_seconds, 'approved', run_row.event_slug, run_row.id);
  end if;
  if run_row.event_slug is not null then
    insert into public.arena_event_scores (event_slug, user_id, game_slug, score, stat, run_session_id)
    values (run_row.event_slug, run_row.user_id, run_row.game_slug, p_score, p_stat, run_row.id)
    on conflict (event_slug, user_id) do update set score = greatest(public.arena_event_scores.score, excluded.score), stat = case when excluded.score >= public.arena_event_scores.score then excluded.stat else public.arena_event_scores.stat end, run_session_id = case when excluded.score >= public.arena_event_scores.score then excluded.run_session_id else public.arena_event_scores.run_session_id end, updated_at = now();
  end if;
  return query select run_row.id, run_row.game_slug, p_score, p_stat, observed_seconds, 'verified'::text;
end;
$$;

revoke execute on function public.start_arena_run(text, text, text) from public;
revoke execute on function public.submit_verified_arena_run(uuid, integer, integer, integer, text) from public;
grant execute on function public.start_arena_run(text, text, text) to authenticated;
grant execute on function public.submit_verified_arena_run(uuid, integer, integer, integer, text) to authenticated;
