-- Packet Siege leaderboard, XP, profile history, and challenge registration.
-- Run after xp-schema.sql and the existing game score migrations.
-- Safe to rerun.

create table if not exists public.packet_siege_scores (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.profiles(id) on delete cascade,
  score integer not null check (score between 0 and 1000000),
  wave integer not null check (wave between 1 and 10000),
  best_combo integer not null check (best_combo between 1 and 100),
  packets_destroyed integer not null check (packets_destroyed between 0 and 1000000),
  core_health integer not null check (core_health between 0 and 100),
  run_seconds integer not null default 0 check (run_seconds between 0 and 86400),
  xp_earned integer not null default 0 check (xp_earned between 0 and 500),
  status text not null default 'approved' check (status in ('pending', 'approved', 'rejected')),
  reviewer_id uuid references public.profiles(id),
  reviewer_note text,
  created_at timestamptz not null default now(),
  reviewed_at timestamptz
);

create index if not exists packet_siege_scores_board_idx on public.packet_siege_scores(status, score desc, wave desc, packets_destroyed desc, created_at desc);
create index if not exists packet_siege_scores_user_idx on public.packet_siege_scores(user_id, score desc, created_at desc);

alter table public.packet_siege_scores enable row level security;
grant select on public.packet_siege_scores to authenticated;
grant insert on public.packet_siege_scores to authenticated;
grant update on public.packet_siege_scores to authenticated;

drop policy if exists "Players submit Packet Siege scores" on public.packet_siege_scores;
create policy "Players submit Packet Siege scores" on public.packet_siege_scores for insert to authenticated
  with check (auth.uid() = user_id and status = 'approved');
drop policy if exists "Players see their Packet Siege scores" on public.packet_siege_scores;
create policy "Players see their Packet Siege scores" on public.packet_siege_scores for select to authenticated
  using (auth.uid() = user_id or exists (select 1 from public.profiles where id = auth.uid() and is_admin));
drop policy if exists "Admins review Packet Siege scores" on public.packet_siege_scores;
create policy "Admins review Packet Siege scores" on public.packet_siege_scores for update to authenticated
  using (exists (select 1 from public.profiles where id = auth.uid() and is_admin))
  with check (exists (select 1 from public.profiles where id = auth.uid() and is_admin));

drop view if exists public.packet_siege_leaderboard;
create view public.packet_siege_leaderboard as
select p.id, p.display_name,
       best.score as best_score,
       best.wave as best_wave,
       best.best_combo,
       best.packets_destroyed as best_destroyed,
       best.core_health as best_core_health,
       best.created_at as latest_run
from public.profiles p
join lateral (
  select s.score, s.wave, s.best_combo, s.packets_destroyed, s.core_health, s.created_at
  from public.packet_siege_scores s
  where s.user_id = p.id and s.status = 'approved'
  order by s.score desc, s.wave desc, s.packets_destroyed desc, s.created_at desc
  limit 1
) best on true;
grant select on public.packet_siege_leaderboard to anon, authenticated;

create or replace function public.award_packet_siege_xp()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.status = 'approved' and new.xp_earned > 0 then
    insert into public.xp_ledger (user_id, amount, reason, source_type, source_id, approved, created_by)
    values (new.user_id, new.xp_earned, 'Packet Siege run', 'game', new.id, true, new.user_id);
  end if;
  return new;
end;
$$;

drop trigger if exists packet_siege_award_xp on public.packet_siege_scores;
create trigger packet_siege_award_xp after insert on public.packet_siege_scores for each row execute function public.award_packet_siege_xp();

insert into public.challenges (slug, title, category, base_xp, bonus_xp, active)
values ('packet-siege-run', 'Packet Siege Run', 'play', 50, 250, true)
on conflict (slug) do update set title = excluded.title, category = excluded.category, base_xp = excluded.base_xp, bonus_xp = excluded.bonus_xp, active = true;
