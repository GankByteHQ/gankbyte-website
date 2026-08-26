-- GankByte game score and leaderboard completion migration.
-- Run after xp-schema.sql and migrations 002 through 006.
-- Safe to rerun. Scores are published automatically; the views read live rows.

alter table public.moderation_notice_dismissals drop constraint if exists moderation_notice_dismissals_notice_type_check;
alter table public.moderation_notice_dismissals add constraint moderation_notice_dismissals_notice_type_check
  check (notice_type in ('submission', 'arena', 'glitch', 'symbol', 'snatch', 'codebreaker'));

create table if not exists public.codebreaker_scores (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.profiles(id) on delete cascade,
  score integer not null check (score between 0 and 1000000),
  mode text not null default 'campaign',
  level integer not null check (level between 0 and 100),
  combo integer not null default 0 check (combo between 0 and 10000),
  trace integer not null default 0 check (trace between 0 and 100),
  lives integer not null default 0 check (lives between 0 and 10),
  run_seconds integer not null default 0 check (run_seconds between 0 and 7200),
  status text not null default 'approved' check (status in ('pending', 'approved', 'rejected')),
  reviewer_id uuid references public.profiles(id),
  reviewer_note text,
  created_at timestamptz not null default now(),
  reviewed_at timestamptz
);

alter table public.codebreaker_scores enable row level security;
grant select on public.codebreaker_scores to authenticated;
grant insert on public.codebreaker_scores to authenticated;
grant update on public.codebreaker_scores to authenticated;

drop policy if exists "Players submit Codebreaker scores" on public.codebreaker_scores;
create policy "Players submit Codebreaker scores" on public.codebreaker_scores
  for insert to authenticated with check (auth.uid() = user_id and status = 'approved');
drop policy if exists "Players see their Codebreaker scores" on public.codebreaker_scores;
create policy "Players see their Codebreaker scores" on public.codebreaker_scores
  for select to authenticated using (auth.uid() = user_id or exists (select 1 from public.profiles where id = auth.uid() and is_admin));
drop policy if exists "Admins review Codebreaker scores" on public.codebreaker_scores;
create policy "Admins review Codebreaker scores" on public.codebreaker_scores
  for update to authenticated using (exists (select 1 from public.profiles where id = auth.uid() and is_admin))
  with check (exists (select 1 from public.profiles where id = auth.uid() and is_admin));

create index if not exists codebreaker_scores_user_idx on public.codebreaker_scores(user_id, score desc, created_at desc);
create index if not exists byte_snatch_scores_user_idx on public.byte_snatch_scores(user_id, score desc, created_at desc);
create index if not exists arena_scores_board_idx on public.arena_scores(status, mode, score desc, created_at desc);
create index if not exists glitch_dash_scores_board_idx on public.glitch_dash_scores(status, score desc, created_at desc);
create index if not exists symbol_catch_scores_board_idx on public.symbol_catch_scores(status, mode, score desc, created_at desc);

drop view if exists public.codebreaker_leaderboard;
create view public.codebreaker_leaderboard as
select p.id, p.display_name, best.score, best.mode, best.level, best.combo, best.trace, best.lives, best.created_at as latest_run
from public.profiles p
join lateral (
  select s.score, s.mode, s.level, s.combo, s.trace, s.lives, s.created_at
  from public.codebreaker_scores s
  where s.user_id = p.id and s.status = 'approved'
  order by s.score desc, s.level desc, s.combo desc, s.created_at desc
  limit 1
) best on true;
grant select on public.codebreaker_leaderboard to anon, authenticated;

drop view if exists public.byte_snatch_weekly_leaderboard;
create view public.byte_snatch_weekly_leaderboard as
select p.id, p.display_name, best.score as best_score, best.best_multiplier, best.created_at as latest_run
from public.profiles p
join lateral (
  select s.score, s.best_multiplier, s.created_at
  from public.byte_snatch_scores s
  where s.user_id = p.id and s.status = 'approved' and s.created_at >= now() - interval '7 days'
  order by s.score desc, s.best_multiplier desc, s.created_at desc
  limit 1
) best on true;
grant select on public.byte_snatch_weekly_leaderboard to anon, authenticated;

create or replace function public.award_game_score_xp()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  earned integer;
begin
  earned := case
    when tg_table_name = 'arena_scores' then least(250, greatest(10, floor(new.score / 100)::integer))
    when tg_table_name = 'glitch_dash_scores' then least(250, greatest(10, floor(new.score / 100)::integer))
    when tg_table_name = 'symbol_catch_scores' then least(250, greatest(10, floor(new.score / 20)::integer))
    when tg_table_name = 'byte_snatch_scores' then coalesce(new.xp_earned, least(250, greatest(10, floor(new.score / 100)::integer)))
    when tg_table_name = 'codebreaker_scores' then least(250, greatest(10, floor(new.score / 100)::integer))
    else 0
  end;
  if new.status = 'approved' and earned > 0 then
    insert into public.xp_ledger (user_id, amount, reason, source_type, source_id, approved, created_by)
    values (new.user_id, earned, initcap(replace(tg_table_name, '_scores', '')) || ' run', 'game', new.id, true, new.user_id);
  end if;
  return new;
end;
$$;

drop trigger if exists arena_score_award_xp on public.arena_scores;
create trigger arena_score_award_xp after insert on public.arena_scores for each row execute function public.award_game_score_xp();
drop trigger if exists glitch_score_award_xp on public.glitch_dash_scores;
create trigger glitch_score_award_xp after insert on public.glitch_dash_scores for each row execute function public.award_game_score_xp();
drop trigger if exists symbol_score_award_xp on public.symbol_catch_scores;
create trigger symbol_score_award_xp after insert on public.symbol_catch_scores for each row execute function public.award_game_score_xp();
drop trigger if exists byte_snatch_award_xp on public.byte_snatch_scores;
drop trigger if exists snatch_score_award_xp on public.byte_snatch_scores;
create trigger snatch_score_award_xp after insert on public.byte_snatch_scores for each row execute function public.award_game_score_xp();
drop trigger if exists codebreaker_score_award_xp on public.codebreaker_scores;
create trigger codebreaker_score_award_xp after insert on public.codebreaker_scores for each row execute function public.award_game_score_xp();
