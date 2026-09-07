create table if not exists public.launcher_scripts (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  version text not null default '0.1.0',
  game text,
  status text not null default 'Published',
  download_url text,
  is_published boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.launcher_scripts enable row level security;

drop policy if exists "Published launcher scripts are readable" on public.launcher_scripts;
create policy "Published launcher scripts are readable"
  on public.launcher_scripts for select to anon, authenticated
  using (is_published = true);
