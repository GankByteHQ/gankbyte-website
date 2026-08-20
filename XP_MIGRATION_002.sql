-- Add the generic XP contribution challenge required by the website form.
-- Run this once in the Supabase SQL Editor if the original XP schema was already applied.

insert into public.challenges (slug, title, base_xp, bonus_xp, active)
values ('community-contribution', 'Community Contribution', 100, 500, true)
on conflict (slug) do update
set title = excluded.title,
    base_xp = excluded.base_xp,
    bonus_xp = excluded.bonus_xp,
    active = true;
