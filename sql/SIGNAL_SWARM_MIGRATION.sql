-- Signal Swarm leaderboard, XP, profile history, and achievement storage.
-- Run after xp-schema.sql and the existing game score migrations.
-- Safe to rerun.

create table if not exists public.signal_swarm_scores (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.profiles(id) on delete cascade,
  score integer not null check (score between 0 and 1000000),
  signals_saved integer not null check (signals_saved between 0 and 10000),
  signals_lost integer not null check (signals_lost between 0 and 10000),
  best_combo integer not null check (best_combo between 1 and 10),
  fastest_rescue_ms integer not null default 0 check (fastest_rescue_ms between 0 and 60000),
  highest_phase integer not null default 3 check (highest_phase between 1 and 3),
  run_seconds integer not null default 60 check (run_seconds between 0 and 600),
  xp_earned integer not null default 0 check (xp_earned between 0 and 500),
  achievements text[] not null default '{}',
  status text not null default 'approved' check (status in ('pending', 'approved', 'rejected')),
  reviewer_id uuid references public.profiles(id),
  reviewer_note text,
  created_at timestamptz not null default now(),
  reviewed_at timestamptz
);

create index if not exists signal_swarm_scores_board_idx on public.signal_swarm_scores(status, score desc, signals_saved desc, created_at desc);
create index if not exists signal_swarm_scores_user_idx on public.signal_swarm_scores(user_id, score desc, created_at desc);

alter table public.signal_swarm_scores enable row level security;
grant select on public.signal_swarm_scores to authenticated;
grant insert on public.signal_swarm_scores to authenticated;
grant update on public.signal_swarm_scores to authenticated;

drop policy if exists "Players submit Signal Swarm scores" on public.signal_swarm_scores;
create policy "Players submit Signal Swarm scores" on public.signal_swarm_scores for insert to authenticated
  with check (auth.uid() = user_id and status = 'approved');
drop policy if exists "Players see their Signal Swarm scores" on public.signal_swarm_scores;
create policy "Players see their Signal Swarm scores" on public.signal_swarm_scores for select to authenticated
  using (auth.uid() = user_id or exists (select 1 from public.profiles where id = auth.uid() and is_admin));
drop policy if exists "Admins review Signal Swarm scores" on public.signal_swarm_scores;
create policy "Admins review Signal Swarm scores" on public.signal_swarm_scores for update to authenticated
  using (exists (select 1 from public.profiles where id = auth.uid() and is_admin))
  with check (exists (select 1 from public.profiles where id = auth.uid() and is_admin));

drop view if exists public.signal_swarm_leaderboard;
create view public.signal_swarm_leaderboard as
select p.id, p.display_name, best.score as best_score, best.signals_saved as best_saved,
       best.signals_lost as best_lost, best.best_combo, best.fastest_rescue_ms,
       best.highest_phase, best.created_at as latest_run
from public.profiles p
join lateral (
  select s.score, s.signals_saved, s.signals_lost, s.best_combo, s.fastest_rescue_ms, s.highest_phase, s.created_at
  from public.signal_swarm_scores s
  where s.user_id = p.id and s.status = 'approved'
  order by s.score desc, s.signals_saved desc, s.best_combo desc, s.created_at desc
  limit 1
) best on true;
grant select on public.signal_swarm_leaderboard to anon, authenticated;

create or replace function public.award_signal_swarm_xp()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.status = 'approved' and new.xp_earned > 0 then
    insert into public.xp_ledger (user_id, amount, reason, source_type, source_id, approved, created_by)
    values (new.user_id, new.xp_earned, 'Signal Swarm run', 'game', new.id, true, new.user_id);
  end if;
  return new;
end;
$$;

drop trigger if exists signal_swarm_award_xp on public.signal_swarm_scores;
create trigger signal_swarm_award_xp after insert on public.signal_swarm_scores for each row execute function public.award_signal_swarm_xp();

insert into public.challenges (slug, title, category, base_xp, bonus_xp, active)
values ('signal-swarm-run', 'Signal Swarm Run', 'play', 50, 250, true)
on conflict (slug) do update set title = excluded.title, category = excluded.category, base_xp = excluded.base_xp, bonus_xp = excluded.bonus_xp, active = true;
