-- Byte Stack leaderboard, XP, profile history, and challenge registration.
-- Run after xp-schema.sql and the existing game score migrations.
-- Safe to rerun.

create table if not exists public.byte_stack_scores (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.profiles(id) on delete cascade,
  score integer not null check (score between 0 and 1000000),
  level integer not null check (level between 1 and 10000),
  lines integer not null check (lines between 0 and 1000000),
  best_combo integer not null check (best_combo between 0 and 1000),
  biggest_clear integer not null check (biggest_clear between 0 and 4),
  overdrives integer not null default 0 check (overdrives between 0 and 1000000),
  xp_earned integer not null default 0 check (xp_earned between 0 and 500),
  status text not null default 'approved' check (status in ('pending', 'approved', 'rejected')),
  reviewer_id uuid references public.profiles(id),
  reviewer_note text,
  created_at timestamptz not null default now(),
  reviewed_at timestamptz
);

create index if not exists byte_stack_scores_board_idx on public.byte_stack_scores(status, score desc, level desc, lines desc, created_at desc);
create index if not exists byte_stack_scores_user_idx on public.byte_stack_scores(user_id, score desc, created_at desc);

alter table public.byte_stack_scores enable row level security;
grant select on public.byte_stack_scores to authenticated;
grant insert on public.byte_stack_scores to authenticated;
grant update on public.byte_stack_scores to authenticated;

drop policy if exists "Players submit Byte Stack scores" on public.byte_stack_scores;
create policy "Players submit Byte Stack scores" on public.byte_stack_scores for insert to authenticated
  with check (auth.uid() = user_id and status = 'approved');
drop policy if exists "Players see their Byte Stack scores" on public.byte_stack_scores;
create policy "Players see their Byte Stack scores" on public.byte_stack_scores for select to authenticated
  using (auth.uid() = user_id or exists (select 1 from public.profiles where id = auth.uid() and is_admin));
drop policy if exists "Admins review Byte Stack scores" on public.byte_stack_scores;
create policy "Admins review Byte Stack scores" on public.byte_stack_scores for update to authenticated
  using (exists (select 1 from public.profiles where id = auth.uid() and is_admin))
  with check (exists (select 1 from public.profiles where id = auth.uid() and is_admin));

drop view if exists public.byte_stack_leaderboard;
create view public.byte_stack_leaderboard as
select p.id, p.display_name,
       best.score as best_score,
       best.level as best_level,
       best.lines as best_lines,
       best.best_combo,
       best.biggest_clear,
       best.overdrives,
       best.created_at as latest_run
from public.profiles p
join lateral (
  select s.score, s.level, s.lines, s.best_combo, s.biggest_clear, s.overdrives, s.created_at
  from public.byte_stack_scores s
  where s.user_id = p.id and s.status = 'approved'
  order by s.score desc, s.level desc, s.lines desc, s.created_at desc
  limit 1
) best on true;
grant select on public.byte_stack_leaderboard to anon, authenticated;

create or replace function public.award_byte_stack_xp()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.status = 'approved' and new.xp_earned > 0 then
    insert into public.xp_ledger (user_id, amount, reason, source_type, source_id, approved, created_by)
    values (new.user_id, new.xp_earned, 'Byte Stack run', 'game', new.id, true, new.user_id);
  end if;
  return new;
end;
$$;

drop trigger if exists byte_stack_award_xp on public.byte_stack_scores;
create trigger byte_stack_award_xp after insert on public.byte_stack_scores for each row execute function public.award_byte_stack_xp();

insert into public.challenges (slug, title, category, base_xp, bonus_xp, active)
values ('byte-stack-run', 'Byte Stack Run', 'play', 50, 250, true)
on conflict (slug) do update set title = excluded.title, category = excluded.category, base_xp = excluded.base_xp, bonus_xp = excluded.bonus_xp, active = true;
