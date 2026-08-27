-- Stick Fighter leaderboard, XP, and profile history.
-- Run after the main GankByte XP schema. Safe to rerun.

create table if not exists public.stick_fighter_scores (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.profiles(id) on delete cascade,
  score integer not null check (score between 0 and 10000000),
  rounds_won integer not null default 0 check (rounds_won between 0 and 20),
  levels_cleared integer not null default 0 check (levels_cleared between 0 and 20),
  hits_landed integer not null check (hits_landed between 0 and 1000000),
  best_combo integer not null check (best_combo between 1 and 100),
  perfect_blocks integer not null default 0 check (perfect_blocks between 0 and 1000000),
  specials integer not null default 0 check (specials between 0 and 1000000),
  level_reached integer not null default 1 check (level_reached between 1 and 20),
  xp_earned integer not null default 0 check (xp_earned between 0 and 500),
  status text not null default 'approved' check (status in ('pending', 'approved', 'rejected')),
  reviewer_id uuid references public.profiles(id),
  reviewer_note text,
  created_at timestamptz not null default now(),
  reviewed_at timestamptz
);

alter table public.stick_fighter_scores add column if not exists level_reached integer not null default 1;
alter table public.stick_fighter_scores add column if not exists levels_cleared integer not null default 0;
alter table public.stick_fighter_scores drop constraint if exists stick_fighter_scores_rounds_won_check;
alter table public.stick_fighter_scores add constraint stick_fighter_scores_rounds_won_check check (rounds_won between 0 and 20);
alter table public.stick_fighter_scores drop constraint if exists stick_fighter_scores_levels_cleared_check;
alter table public.stick_fighter_scores add constraint stick_fighter_scores_levels_cleared_check check (levels_cleared between 0 and 20);
alter table public.stick_fighter_scores drop constraint if exists stick_fighter_scores_level_reached_check;
alter table public.stick_fighter_scores add constraint stick_fighter_scores_level_reached_check check (level_reached between 1 and 20);
update public.stick_fighter_scores set levels_cleared = greatest(0, least(20, rounds_won)) where levels_cleared = 0 and rounds_won > 0;

create index if not exists stick_fighter_scores_board_idx on public.stick_fighter_scores(status, score desc, levels_cleared desc, hits_landed desc, created_at desc);
create index if not exists stick_fighter_scores_user_idx on public.stick_fighter_scores(user_id, score desc, created_at desc);

alter table public.stick_fighter_scores enable row level security;
grant select on public.stick_fighter_scores to authenticated;
grant insert on public.stick_fighter_scores to authenticated;
grant update on public.stick_fighter_scores to authenticated;

drop policy if exists "Players submit Stick Fighter scores" on public.stick_fighter_scores;
create policy "Players submit Stick Fighter scores" on public.stick_fighter_scores for insert to authenticated
  with check (auth.uid() = user_id and status = 'approved');
drop policy if exists "Players see their Stick Fighter scores" on public.stick_fighter_scores;
create policy "Players see their Stick Fighter scores" on public.stick_fighter_scores for select to authenticated
  using (auth.uid() = user_id or exists (select 1 from public.profiles where id = auth.uid() and is_admin));
drop policy if exists "Admins review Stick Fighter scores" on public.stick_fighter_scores;
create policy "Admins review Stick Fighter scores" on public.stick_fighter_scores for update to authenticated
  using (exists (select 1 from public.profiles where id = auth.uid() and is_admin))
  with check (exists (select 1 from public.profiles where id = auth.uid() and is_admin));

drop view if exists public.stick_fighter_leaderboard;
create view public.stick_fighter_leaderboard as
select p.id, p.display_name,
       best.score as best_score,
       best.levels_cleared as best_wins,
       best.hits_landed as best_hits,
       best.best_combo,
       best.perfect_blocks,
       best.specials,
       best.level_reached,
       best.created_at as latest_match
from public.profiles p
join lateral (
  select s.score, s.levels_cleared, s.hits_landed, s.best_combo, s.perfect_blocks, s.specials, s.level_reached, s.created_at
  from public.stick_fighter_scores s
  where s.user_id = p.id and s.status = 'approved'
  order by s.score desc, s.levels_cleared desc, s.hits_landed desc, s.created_at desc
  limit 1
) best on true;
grant select on public.stick_fighter_leaderboard to anon, authenticated;

create or replace function public.award_stick_fighter_xp()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.status = 'approved' and new.xp_earned > 0 then
    insert into public.xp_ledger (user_id, amount, reason, source_type, source_id, approved, created_by)
    values (new.user_id, new.xp_earned, 'Stick Fighter match', 'game', new.id, true, new.user_id);
  end if;
  return new;
end;
$$;

drop trigger if exists stick_fighter_award_xp on public.stick_fighter_scores;
create trigger stick_fighter_award_xp after insert on public.stick_fighter_scores for each row execute function public.award_stick_fighter_xp();

insert into public.challenges (slug, title, category, base_xp, bonus_xp, active)
values ('stick-fighter-match', 'Stick Fighter Match', 'play', 50, 250, true)
on conflict (slug) do update set title = excluded.title, category = excluded.category, base_xp = excluded.base_xp, bonus_xp = excluded.bonus_xp, active = true;
