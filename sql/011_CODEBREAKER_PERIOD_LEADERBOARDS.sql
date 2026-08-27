-- Codebreaker period boards
-- Run after 010_COMMUNITY_REVIEWS_ADMIN_DELETE.sql.
-- These views keep daily and weekly tabs database-backed.

drop view if exists public.codebreaker_daily_leaderboard;
create view public.codebreaker_daily_leaderboard as
select p.id, p.display_name, best.score, best.mode, best.level, best.combo,
       best.trace, best.lives, best.created_at as latest_run
from public.profiles p
join lateral (
  select s.score, s.mode, s.level, s.combo, s.trace, s.lives, s.created_at
  from public.codebreaker_scores s
  where s.user_id = p.id and s.status = 'approved'
    and s.created_at >= now() - interval '24 hours'
  order by s.score desc, s.level desc, s.combo desc, s.created_at desc
  limit 1
) best on true;
grant select on public.codebreaker_daily_leaderboard to anon, authenticated;

drop view if exists public.codebreaker_weekly_leaderboard;
create view public.codebreaker_weekly_leaderboard as
select p.id, p.display_name, best.score, best.mode, best.level, best.combo,
       best.trace, best.lives, best.created_at as latest_run
from public.profiles p
join lateral (
  select s.score, s.mode, s.level, s.combo, s.trace, s.lives, s.created_at
  from public.codebreaker_scores s
  where s.user_id = p.id and s.status = 'approved'
    and s.created_at >= now() - interval '7 days'
  order by s.score desc, s.level desc, s.combo desc, s.created_at desc
  limit 1
) best on true;
grant select on public.codebreaker_weekly_leaderboard to anon, authenticated;
