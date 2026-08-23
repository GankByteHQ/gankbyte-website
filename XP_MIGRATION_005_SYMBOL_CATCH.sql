-- Symbol Catch Arena integration. Safe to run after xp-schema.sql.
alter table public.moderation_notice_dismissals drop constraint if exists moderation_notice_dismissals_notice_type_check;
alter table public.moderation_notice_dismissals add constraint moderation_notice_dismissals_notice_type_check check (notice_type in ('submission', 'arena', 'glitch', 'symbol'));

create table if not exists public.symbol_catch_scores (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.profiles(id) on delete cascade,
  score integer not null check (score between 0 and 1000000),
  best_streak integer not null check (best_streak between 0 and 10000),
  mode text not null default 'classic' check (mode in ('classic', 'switch')),
  run_seconds integer not null check (run_seconds between 0 and 3600),
  status text not null default 'approved' check (status in ('pending', 'approved', 'rejected')),
  reviewer_id uuid references public.profiles(id),
  reviewer_note text,
  created_at timestamptz not null default now(),
  reviewed_at timestamptz
);

alter table public.symbol_catch_scores enable row level security;
grant select, insert, update on public.symbol_catch_scores to authenticated;

drop policy if exists "Players submit their own Symbol Catch scores" on public.symbol_catch_scores;
create policy "Players submit their own Symbol Catch scores" on public.symbol_catch_scores for insert to authenticated with check (auth.uid() = user_id and status = 'approved');
drop policy if exists "Players see their own Symbol Catch scores" on public.symbol_catch_scores;
create policy "Players see their own Symbol Catch scores" on public.symbol_catch_scores for select to authenticated using (auth.uid() = user_id or exists (select 1 from public.profiles where id = auth.uid() and is_admin));
drop policy if exists "Admins review Symbol Catch scores" on public.symbol_catch_scores;
create policy "Admins review Symbol Catch scores" on public.symbol_catch_scores for update to authenticated using (exists (select 1 from public.profiles where id = auth.uid() and is_admin)) with check (exists (select 1 from public.profiles where id = auth.uid() and is_admin));

create or replace view public.symbol_catch_leaderboard as
select p.id, p.display_name, best.score as best_score, best.best_streak, best.mode, best.created_at as latest_run
from public.profiles p
join lateral (
  select s.score, s.best_streak, s.mode, s.created_at
  from public.symbol_catch_scores s
  where s.user_id = p.id and s.status = 'approved'
  order by s.score desc, s.best_streak desc, s.created_at desc
  limit 1
) best on true;
grant select on public.symbol_catch_leaderboard to anon, authenticated;

create or replace view public.symbol_catch_weekly_leaderboard as
select p.id, p.display_name, best.score as best_score, best.best_streak, best.mode, best.created_at as latest_run
from public.profiles p
join lateral (
  select s.score, s.best_streak, s.mode, s.created_at
  from public.symbol_catch_scores s
  where s.user_id = p.id and s.status = 'approved' and s.created_at >= now() - interval '7 days'
  order by s.score desc, s.best_streak desc, s.created_at desc
  limit 1
) best on true;
grant select on public.symbol_catch_weekly_leaderboard to anon, authenticated;

