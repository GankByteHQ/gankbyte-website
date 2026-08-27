-- Null Ninja leaderboard, XP, profile history, and challenge registration.
-- Run after xp-schema.sql and the existing game score migrations.
-- Safe to rerun.

create table if not exists public.null_ninja_scores (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.profiles(id) on delete cascade,
  score integer not null check (score between 0 and 10000000),
  distance integer not null check (distance between 0 and 10000000),
  kills integer not null check (kills between 0 and 1000000),
  best_combo integer not null check (best_combo between 0 and 1000),
  perfect_kills integer not null default 0 check (perfect_kills between 0 and 1000000),
  bosses_defeated integer not null default 0 check (bosses_defeated between 0 and 10000),
  flow_states integer not null default 0 check (flow_states between 0 and 1000000),
  xp_earned integer not null default 0 check (xp_earned between 0 and 500),
  status text not null default 'approved' check (status in ('pending', 'approved', 'rejected')),
  reviewer_id uuid references public.profiles(id),
  reviewer_note text,
  created_at timestamptz not null default now(),
  reviewed_at timestamptz
);

create index if not exists null_ninja_scores_board_idx on public.null_ninja_scores(status, score desc, distance desc, kills desc, created_at desc);
create index if not exists null_ninja_scores_user_idx on public.null_ninja_scores(user_id, score desc, created_at desc);

alter table public.null_ninja_scores enable row level security;
grant select on public.null_ninja_scores to authenticated;
grant insert on public.null_ninja_scores to authenticated;
grant update on public.null_ninja_scores to authenticated;

drop policy if exists "Players submit Null Ninja scores" on public.null_ninja_scores;
create policy "Players submit Null Ninja scores" on public.null_ninja_scores for insert to authenticated
  with check (auth.uid() = user_id and status = 'approved');
drop policy if exists "Players see their Null Ninja scores" on public.null_ninja_scores;
create policy "Players see their Null Ninja scores" on public.null_ninja_scores for select to authenticated
  using (auth.uid() = user_id or exists (select 1 from public.profiles where id = auth.uid() and is_admin));
drop policy if exists "Admins review Null Ninja scores" on public.null_ninja_scores;
create policy "Admins review Null Ninja scores" on public.null_ninja_scores for update to authenticated
  using (exists (select 1 from public.profiles where id = auth.uid() and is_admin))
  with check (exists (select 1 from public.profiles where id = auth.uid() and is_admin));

drop view if exists public.null_ninja_leaderboard;
create view public.null_ninja_leaderboard as
select p.id, p.display_name,
       best.score as best_score,
       best.distance as best_distance,
       best.kills as best_kills,
       best.best_combo,
       best.perfect_kills,
       best.bosses_defeated,
       best.flow_states,
       best.created_at as latest_run
from public.profiles p
join lateral (
  select s.score, s.distance, s.kills, s.best_combo, s.perfect_kills, s.bosses_defeated, s.flow_states, s.created_at
  from public.null_ninja_scores s
  where s.user_id = p.id and s.status = 'approved'
  order by s.score desc, s.distance desc, s.kills desc, s.created_at desc
  limit 1
) best on true;
grant select on public.null_ninja_leaderboard to anon, authenticated;

create or replace function public.award_null_ninja_xp()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.status = 'approved' and new.xp_earned > 0 then
    insert into public.xp_ledger (user_id, amount, reason, source_type, source_id, approved, created_by)
    values (new.user_id, new.xp_earned, 'Null Ninja run', 'game', new.id, true, new.user_id);
  end if;
  return new;
end;
$$;

drop trigger if exists null_ninja_award_xp on public.null_ninja_scores;
create trigger null_ninja_award_xp after insert on public.null_ninja_scores for each row execute function public.award_null_ninja_xp();

insert into public.challenges (slug, title, category, base_xp, bonus_xp, active)
values ('null-ninja-run', 'Null Ninja Run', 'play', 50, 250, true)
on conflict (slug) do update set title = excluded.title, category = excluded.category, base_xp = excluded.base_xp, bonus_xp = excluded.bonus_xp, active = true;
