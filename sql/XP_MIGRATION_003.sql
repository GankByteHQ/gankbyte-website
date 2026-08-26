-- GankByte XP expansion: contribution categories and clearer challenge choices.
-- Run this once in the Supabase SQL Editor after XP_MIGRATION_002.sql.

alter table public.challenges
  add column if not exists category text not null default 'community';

insert into public.challenges (slug, title, category, base_xp, bonus_xp, active)
values
  ('community-contribution', 'Community contribution', 'community', 100, 500, true),
  ('play-and-improve', 'Play and improve', 'play', 100, 250, true),
  ('useful-bug-report', 'Useful bug report', 'help', 100, 300, true),
  ('creative-contribution', 'Creative contribution', 'create', 100, 400, true),
  ('ship-a-project', 'Ship a project', 'build', 250, 750, true)
on conflict (slug) do update
set title = excluded.title,
    category = excluded.category,
    base_xp = excluded.base_xp,
    bonus_xp = excluded.bonus_xp,
    active = true;

create index if not exists challenges_category_idx on public.challenges(category);
