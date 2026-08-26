-- GankByte community reviews
-- Run once in the Supabase SQL Editor.

create table if not exists public.community_reviews (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.profiles(id) on delete cascade,
  review_type text not null check (review_type in ('player', 'developer')),
  display_name text not null default 'GankByte Player' check (char_length(display_name) between 2 and 80),
  review_text text not null check (char_length(review_text) between 20 and 500),
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  reviewer_id uuid references public.profiles(id),
  reviewer_note text check (reviewer_note is null or char_length(reviewer_note) <= 500),
  created_at timestamptz not null default now(),
  reviewed_at timestamptz
);

create index if not exists community_reviews_public_idx
  on public.community_reviews (status, review_type, created_at desc);

alter table public.community_reviews enable row level security;

grant select on public.community_reviews to anon, authenticated;
grant insert on public.community_reviews to authenticated;
grant update on public.community_reviews to authenticated;

drop policy if exists "Approved community reviews are public" on public.community_reviews;
create policy "Approved community reviews are public"
  on public.community_reviews
  for select
  using (
    status = 'approved'
    or auth.uid() = user_id
    or exists (select 1 from public.profiles where id = auth.uid() and is_admin)
  );

drop policy if exists "Members submit pending community reviews" on public.community_reviews;
create policy "Members submit pending community reviews"
  on public.community_reviews
  for insert to authenticated
  with check (auth.uid() = user_id and status = 'pending');

drop policy if exists "Admins moderate community reviews" on public.community_reviews;
create policy "Admins moderate community reviews"
  on public.community_reviews
  for update to authenticated
  using (exists (select 1 from public.profiles where id = auth.uid() and is_admin))
  with check (exists (select 1 from public.profiles where id = auth.uid() and is_admin));
