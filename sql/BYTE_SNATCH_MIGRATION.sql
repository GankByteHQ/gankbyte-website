-- Byte Snatch Arena integration
create table if not exists public.byte_snatch_scores (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.profiles(id) on delete cascade,
  score integer not null check (score between 0 and 1000000),
  best_multiplier integer not null check (best_multiplier between 1 and 10),
  run_seconds integer not null check (run_seconds between 0 and 600),
  xp_earned integer not null default 0 check (xp_earned between 0 and 500),
  status text not null default 'approved' check (status in ('pending', 'approved', 'rejected')),
  reviewer_id uuid references public.profiles(id),
  reviewer_note text,
  created_at timestamptz not null default now(),
  reviewed_at timestamptz
);

alter table public.moderation_notice_dismissals drop constraint if exists moderation_notice_dismissals_notice_type_check;
alter table public.moderation_notice_dismissals add constraint moderation_notice_dismissals_notice_type_check check (notice_type in ('submission', 'arena', 'glitch', 'symbol', 'snatch'));

alter table public.byte_snatch_scores enable row level security;
grant select on public.byte_snatch_scores to anon, authenticated;
grant insert on public.byte_snatch_scores to authenticated;
grant update on public.byte_snatch_scores to authenticated;

drop policy if exists "Players submit Byte Snatch scores" on public.byte_snatch_scores;
create policy "Players submit Byte Snatch scores" on public.byte_snatch_scores for insert to authenticated
  with check (auth.uid() = user_id and status = 'approved');
drop policy if exists "Players see their Byte Snatch scores" on public.byte_snatch_scores;
create policy "Players see their Byte Snatch scores" on public.byte_snatch_scores for select to authenticated
  using (auth.uid() = user_id or exists (select 1 from public.profiles where id = auth.uid() and is_admin));
drop policy if exists "Admins review Byte Snatch scores" on public.byte_snatch_scores;
create policy "Admins review Byte Snatch scores" on public.byte_snatch_scores for update to authenticated
  using (exists (select 1 from public.profiles where id = auth.uid() and is_admin))
  with check (exists (select 1 from public.profiles where id = auth.uid() and is_admin));

drop view if exists public.byte_snatch_leaderboard;
create view public.byte_snatch_leaderboard as
select p.id, p.display_name, best.score as best_score, best.best_multiplier, best.created_at as latest_run
from public.profiles p
join lateral (
  select s.score, s.best_multiplier, s.created_at
  from public.byte_snatch_scores s
  where s.user_id = p.id and s.status = 'approved'
  order by s.score desc, s.best_multiplier desc, s.created_at desc
  limit 1
) best on true;
grant select on public.byte_snatch_leaderboard to anon, authenticated;

create or replace function public.award_byte_snatch_xp()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  if new.status = 'approved' and new.xp_earned > 0 then
    insert into public.xp_ledger (user_id, amount, reason, source_type, source_id, approved, created_by)
    values (new.user_id, new.xp_earned, 'Byte Snatch run', 'game', new.id, true, new.user_id);
  end if;
  return new;
end;
$$;
drop trigger if exists byte_snatch_award_xp on public.byte_snatch_scores;
create trigger byte_snatch_award_xp after insert on public.byte_snatch_scores for each row execute function public.award_byte_snatch_xp();

insert into public.challenges (slug, title, category, base_xp, bonus_xp)
values ('byte-snatch-run', 'Byte Snatch Run', 'play', 50, 250)
on conflict (slug) do update set title = excluded.title, category = excluded.category, base_xp = excluded.base_xp, bonus_xp = excluded.bonus_xp, active = true;
