-- GankByte custom FiveM script requests
-- Run after the existing XP/game migrations.

create table if not exists public.custom_script_requests (
  id bigint generated always as identity primary key,
  name text not null check (char_length(name) between 2 and 80),
  email text not null check (char_length(email) between 3 and 160),
  details text not null check (char_length(details) between 10 and 2000),
  plan jsonb not null default '{}'::jsonb,
  plan_markdown text not null check (char_length(plan_markdown) between 1 and 30000),
  source text not null default 'fivem-script-generator',
  status text not null default 'new' check (status in ('new', 'reviewing', 'quoted', 'accepted', 'closed', 'delivery_failed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists custom_script_requests_status_created_idx
  on public.custom_script_requests (status, created_at desc);

alter table public.custom_script_requests enable row level security;

drop policy if exists "Admins can read custom script requests" on public.custom_script_requests;
create policy "Admins can read custom script requests"
  on public.custom_script_requests for select
  to authenticated
  using (exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.is_admin = true
  ));

drop policy if exists "Admins can update custom script requests" on public.custom_script_requests;
create policy "Admins can update custom script requests"
  on public.custom_script_requests for update
  to authenticated
  using (exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.is_admin = true
  ))
  with check (exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.is_admin = true
  ));

revoke all on public.custom_script_requests from anon;
revoke all on public.custom_script_requests from authenticated;
grant select, update on public.custom_script_requests to authenticated;

comment on table public.custom_script_requests is
  'Private custom-build requests submitted through the GankByte FiveM script generator. Inserts are performed by the server-side Edge Function.';
