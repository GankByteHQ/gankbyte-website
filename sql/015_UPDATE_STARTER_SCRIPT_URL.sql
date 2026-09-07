update public.launcher_scripts
set
  description = 'Download the first GankByte Java script template.',
  version = '0.1.0',
  status = 'Starter template',
  download_url = 'https://raw.githubusercontent.com/GankByteHQ/gankbyte-website/main/scripts/GankByteStarterScript.java',
  is_published = true
where name = 'GankByte Test Script';
