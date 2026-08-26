-- Allow admins to remove approved community reviews after moderation or testing.
-- Run once in the Supabase SQL Editor after 009_COMMUNITY_REVIEWS.sql.

grant delete on public.community_reviews to authenticated;

drop policy if exists "Admins remove community reviews" on public.community_reviews;
create policy "Admins remove community reviews"
  on public.community_reviews
  for delete to authenticated
  using (
    exists (select 1 from public.profiles where id = auth.uid() and is_admin)
  );
