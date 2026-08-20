-- GankByte XP v0.2
-- Run this once in Supabase SQL Editor. Never put a service-role key in the website.

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default 'GankByte Player',
  avatar_url text,
  is_admin boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.challenges (
  slug text primary key,
  title text not null,
  base_xp integer not null check (base_xp > 0),
  bonus_xp integer not null default 0 check (bonus_xp >= 0),
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.challenge_submissions (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.profiles(id) on delete cascade,
  challenge_slug text not null references public.challenges(slug),
  proof_url text not null check (char_length(proof_url) between 8 and 2048),
  note text check (note is null or char_length(note) <= 500),
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  reviewer_id uuid references public.profiles(id),
  reviewer_note text,
  created_at timestamptz not null default now(),
  reviewed_at timestamptz
);

create table if not exists public.xp_ledger (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.profiles(id) on delete cascade,
  amount integer not null check (amount > 0 and amount <= 5000),
  reason text not null,
  source_type text not null default 'manual',
  source_id bigint,
  approved boolean not null default true,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now()
);

create table if not exists public.arena_scores (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.profiles(id) on delete cascade,
  score integer not null check (score between 0 and 1000000),
  wave integer not null check (wave between 1 and 4),
  run_seconds integer not null check (run_seconds between 0 and 600),
  status text not null default 'approved' check (status in ('pending', 'approved', 'rejected')),
  reviewer_id uuid references public.profiles(id),
  reviewer_note text,
  created_at timestamptz not null default now(),
  reviewed_at timestamptz
);

create table if not exists public.glitch_dash_scores (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.profiles(id) on delete cascade,
  score integer not null check (score between 0 and 1000000),
  streak integer not null check (streak between 0 and 10000),
  run_seconds integer not null check (run_seconds between 0 and 600),
  status text not null default 'approved' check (status in ('pending', 'approved', 'rejected')),
  reviewer_id uuid references public.profiles(id),
  reviewer_note text,
  created_at timestamptz not null default now(),
  reviewed_at timestamptz
);

create table if not exists public.moderation_notice_dismissals (
  user_id uuid not null references public.profiles(id) on delete cascade,
  notice_type text not null check (notice_type in ('submission', 'arena', 'glitch')),
  notice_id bigint not null,
  dismissed_at timestamptz not null default now(),
  primary key (user_id, notice_type, notice_id)
);

create table if not exists public.arena_events (
  slug text primary key,
  title text not null,
  game text not null,
  description text not null,
  rules_url text,
  status text not null default 'upcoming' check (status in ('upcoming', 'live', 'closed')),
  starts_at timestamptz,
  ends_at timestamptz,
  created_at timestamptz not null default now()
);

-- Arena scores are published automatically for the launch leaderboard.
update public.arena_scores set status = 'approved' where status = 'pending';
update public.glitch_dash_scores set status = 'approved' where status = 'pending';

insert into public.challenges (slug, title, base_xp, bonus_xp)
values ('weekend-challenge-001', 'Weekend Challenge #001', 100, 500)
on conflict (slug) do update set title = excluded.title, base_xp = excluded.base_xp, bonus_xp = excluded.bonus_xp;

insert into public.challenges (slug, title, base_xp, bonus_xp)
values ('community-contribution', 'Community Contribution', 100, 500)
on conflict (slug) do update set title = excluded.title, base_xp = excluded.base_xp, bonus_xp = excluded.bonus_xp, active = true;

insert into public.arena_events (slug, title, game, description, rules_url, status)
values ('weekend-challenge-001', 'Weekend Challenge #001', 'Byte Rush', 'Chase the highest Byte Rush score, share proof, and help test the first Arena event.', 'https://gankbyte.com/community.html', 'live')
on conflict (slug) do update set title = excluded.title, game = excluded.game, description = excluded.description, rules_url = excluded.rules_url, status = excluded.status;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, display_name, avatar_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'global_name', new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name', 'GankByte Player'),
    new.raw_user_meta_data ->> 'avatar_url'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_user();

alter table public.profiles enable row level security;
alter table public.challenges enable row level security;
alter table public.challenge_submissions enable row level security;
alter table public.xp_ledger enable row level security;
alter table public.arena_scores enable row level security;
alter table public.glitch_dash_scores enable row level security;
alter table public.moderation_notice_dismissals enable row level security;
alter table public.arena_events enable row level security;

-- The project uses explicit Data API exposure, so grant only the access this site needs.
grant usage on schema public to anon, authenticated;
grant select on public.profiles to anon, authenticated;
grant select on public.challenges to anon, authenticated;
grant select, insert, update on public.challenge_submissions to authenticated;
grant select on public.xp_ledger to anon, authenticated;
grant select, insert, update on public.arena_scores to authenticated;
grant select, insert, update on public.glitch_dash_scores to authenticated;
grant select, insert, delete on public.moderation_notice_dismissals to authenticated;
grant select on public.arena_events to anon, authenticated;

drop policy if exists "Public profiles are visible" on public.profiles;
create policy "Public profiles are visible" on public.profiles for select using (true);

drop policy if exists "Active challenges are visible" on public.challenges;
create policy "Active challenges are visible" on public.challenges for select using (active = true);

drop policy if exists "Users submit their own challenges" on public.challenge_submissions;
create policy "Users submit their own challenges" on public.challenge_submissions for insert to authenticated with check (auth.uid() = user_id);

drop policy if exists "Users see their own submissions" on public.challenge_submissions;
create policy "Users see their own submissions" on public.challenge_submissions for select to authenticated using (auth.uid() = user_id or exists (select 1 from public.profiles where id = auth.uid() and is_admin));

drop policy if exists "Admins review submissions" on public.challenge_submissions;
create policy "Admins review submissions" on public.challenge_submissions for update to authenticated using (exists (select 1 from public.profiles where id = auth.uid() and is_admin)) with check (exists (select 1 from public.profiles where id = auth.uid() and is_admin));

drop policy if exists "Approved XP is visible" on public.xp_ledger;
create policy "Approved XP is visible" on public.xp_ledger for select using (approved = true or auth.uid() = user_id);

drop policy if exists "Players submit their own arena scores" on public.arena_scores;
create policy "Players submit their own arena scores" on public.arena_scores for insert to authenticated with check (auth.uid() = user_id and status = 'approved');

drop policy if exists "Players see their own arena scores" on public.arena_scores;
create policy "Players see their own arena scores" on public.arena_scores for select to authenticated using (auth.uid() = user_id or exists (select 1 from public.profiles where id = auth.uid() and is_admin));

drop policy if exists "Admins review arena scores" on public.arena_scores;
create policy "Admins review arena scores" on public.arena_scores for update to authenticated using (exists (select 1 from public.profiles where id = auth.uid() and is_admin)) with check (exists (select 1 from public.profiles where id = auth.uid() and is_admin));

drop policy if exists "Players submit their own Glitch Dash scores" on public.glitch_dash_scores;
create policy "Players submit their own Glitch Dash scores" on public.glitch_dash_scores for insert to authenticated with check (auth.uid() = user_id and status = 'approved');

drop policy if exists "Players see their own Glitch Dash scores" on public.glitch_dash_scores;
create policy "Players see their own Glitch Dash scores" on public.glitch_dash_scores for select to authenticated using (auth.uid() = user_id or exists (select 1 from public.profiles where id = auth.uid() and is_admin));

drop policy if exists "Admins review Glitch Dash scores" on public.glitch_dash_scores;
create policy "Admins review Glitch Dash scores" on public.glitch_dash_scores for update to authenticated using (exists (select 1 from public.profiles where id = auth.uid() and is_admin)) with check (exists (select 1 from public.profiles where id = auth.uid() and is_admin));

drop policy if exists "Players see their own dismissed notices" on public.moderation_notice_dismissals;
create policy "Players see their own dismissed notices" on public.moderation_notice_dismissals for select to authenticated using (auth.uid() = user_id);

drop policy if exists "Players dismiss their own notices" on public.moderation_notice_dismissals;
create policy "Players dismiss their own notices" on public.moderation_notice_dismissals for insert to authenticated with check (auth.uid() = user_id);

drop policy if exists "Players remove their own dismissals" on public.moderation_notice_dismissals;
create policy "Players remove their own dismissals" on public.moderation_notice_dismissals for delete to authenticated using (auth.uid() = user_id);

create or replace view public.xp_leaderboard as
select p.id, p.display_name, p.avatar_url, coalesce(sum(x.amount) filter (where x.approved = true), 0)::integer as xp_total
from public.profiles p
left join public.xp_ledger x on x.user_id = p.id
group by p.id, p.display_name, p.avatar_url;

grant select on public.xp_leaderboard to anon, authenticated;

create or replace function public.update_display_name(p_display_name text)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare cleaned_name text := btrim(coalesce(p_display_name, ''));
declare saved_name text;
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;
  if char_length(cleaned_name) < 2 or char_length(cleaned_name) > 32 then
    raise exception 'Display name must be between 2 and 32 characters';
  end if;
  update public.profiles
  set display_name = cleaned_name
  where id = auth.uid()
  returning display_name into saved_name;
  if saved_name is null then
    raise exception 'Profile not found';
  end if;
  return saved_name;
end;
$$;

revoke execute on function public.update_display_name(text) from public;
grant execute on function public.update_display_name(text) to authenticated;

create or replace view public.arena_leaderboard as
select p.id, p.display_name, best.score as best_score, best.wave as best_wave, best.created_at as latest_run
from public.profiles p
join lateral (
  select s.score, s.wave, s.created_at
  from public.arena_scores s
  where s.user_id = p.id and s.status = 'approved'
  order by s.score desc, s.created_at desc
  limit 1
) best on true;

grant select on public.arena_leaderboard to anon, authenticated;

create or replace view public.glitch_dash_leaderboard as
select p.id, p.display_name, best.score as best_score, best.streak as best_streak, best.created_at as latest_run
from public.profiles p
join lateral (
  select s.score, s.streak, s.created_at
  from public.glitch_dash_scores s
  where s.user_id = p.id and s.status = 'approved'
  order by s.score desc, s.created_at desc
  limit 1
) best on true;

grant select on public.glitch_dash_leaderboard to anon, authenticated;

create or replace view public.arena_weekly_leaderboard as
select p.id, p.display_name, best.score as best_score, best.wave as best_wave, best.created_at as latest_run
from public.profiles p
join lateral (
  select s.score, s.wave, s.created_at
  from public.arena_scores s
  where s.user_id = p.id and s.status = 'approved' and s.created_at >= now() - interval '7 days'
  order by s.score desc, s.created_at desc
  limit 1
) best on true;

grant select on public.arena_weekly_leaderboard to anon, authenticated;

create or replace view public.glitch_dash_weekly_leaderboard as
select p.id, p.display_name, best.score as best_score, best.streak as best_streak, best.created_at as latest_run
from public.profiles p
join lateral (
  select s.score, s.streak, s.created_at
  from public.glitch_dash_scores s
  where s.user_id = p.id and s.status = 'approved' and s.created_at >= now() - interval '7 days'
  order by s.score desc, s.created_at desc
  limit 1
) best on true;

grant select on public.glitch_dash_weekly_leaderboard to anon, authenticated;

drop policy if exists "Arena events are public" on public.arena_events;
create policy "Arena events are public" on public.arena_events for select using (true);

create or replace function public.approve_submission(p_submission_id bigint, p_xp integer, p_reviewer_note text default null)
returns void
language plpgsql
security definer set search_path = public
as $$
declare submission_row public.challenge_submissions;
begin
  if not exists (select 1 from public.profiles where id = auth.uid() and is_admin) then
    raise exception 'Admin access required';
  end if;
  if p_xp < 1 or p_xp > 5000 then
    raise exception 'XP amount is outside the allowed range';
  end if;
  select * into submission_row from public.challenge_submissions where id = p_submission_id and status = 'pending' for update;
  if not found then
    raise exception 'Pending submission not found';
  end if;
  update public.challenge_submissions
  set status = 'approved', reviewer_id = auth.uid(), reviewer_note = p_reviewer_note, reviewed_at = now()
  where id = p_submission_id;
  insert into public.xp_ledger (user_id, amount, reason, source_type, source_id, created_by)
  values (submission_row.user_id, p_xp, 'Approved: ' || submission_row.challenge_slug, 'challenge', submission_row.id, auth.uid());
end;
$$;

grant execute on function public.approve_submission(bigint, integer, text) to authenticated;

create or replace function public.approve_arena_score(p_score_id bigint)
returns void
language plpgsql
security definer set search_path = public
as $$
begin
  if not exists (select 1 from public.profiles where id = auth.uid() and is_admin) then
    raise exception 'Admin access required';
  end if;
  update public.arena_scores
  set status = 'approved', reviewer_id = auth.uid(), reviewed_at = now()
  where id = p_score_id and status = 'pending';
  if not found then
    raise exception 'Pending arena score not found';
  end if;
end;
$$;

grant execute on function public.approve_arena_score(bigint) to authenticated;
