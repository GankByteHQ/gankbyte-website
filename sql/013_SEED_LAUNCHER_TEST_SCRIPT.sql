insert into public.launcher_scripts
  (name, description, version, game, status, is_published)
select
  'GankByte Test Script',
  'A demo entry used to verify the launcher connection.',
  '0.1.0',
  'GankByte Client',
  'Ready',
  true
where not exists (
  select 1
  from public.launcher_scripts
  where name = 'GankByte Test Script'
);
