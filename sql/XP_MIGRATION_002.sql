-- Add the generic XP contribution challenge required by the website form.
-- Run this once in the Supabase SQL Editor if the original XP schema was already applied.

insert into public.challenges (slug, title, base_xp, bonus_xp, active)
values ('community-contribution', 'Community Contribution', 100, 500, true)
on conflict (slug) do update
set title = excluded.title,
    base_xp = excluded.base_xp,
    bonus_xp = excluded.bonus_xp,
    active = true;

alter table public.arena_scores
  add column if not exists reviewer_note text;

alter table public.glitch_dash_scores
  add column if not exists reviewer_note text;

create table if not exists public.moderation_notice_dismissals (
  user_id uuid not null references public.profiles(id) on delete cascade,
  notice_type text not null check (notice_type in ('submission', 'arena', 'glitch')),
  notice_id bigint not null,
  dismissed_at timestamptz not null default now(),
  primary key (user_id, notice_type, notice_id)
);

alter table public.moderation_notice_dismissals enable row level security;
grant select, insert, delete on public.moderation_notice_dismissals to authenticated;

drop policy if exists "Players see their own dismissed notices" on public.moderation_notice_dismissals;
create policy "Players see their own dismissed notices" on public.moderation_notice_dismissals for select to authenticated using (auth.uid() = user_id);

drop policy if exists "Players dismiss their own notices" on public.moderation_notice_dismissals;
create policy "Players dismiss their own notices" on public.moderation_notice_dismissals for insert to authenticated with check (auth.uid() = user_id);

drop policy if exists "Players remove their own dismissals" on public.moderation_notice_dismissals;
create policy "Players remove their own dismissals" on public.moderation_notice_dismissals for delete to authenticated using (auth.uid() = user_id);

create or replace function public.update_display_name(p_display_name text)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  cleaned_name text := btrim(coalesce(p_display_name, ''));
  saved_name text;
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
