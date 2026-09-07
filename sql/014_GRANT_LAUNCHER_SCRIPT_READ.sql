grant select on table public.launcher_scripts to anon, authenticated;

drop policy if exists "Published launcher scripts are readable" on public.launcher_scripts;
create policy "Published launcher scripts are readable"
  on public.launcher_scripts
  for select
  to anon, authenticated
  using (is_published = true);
