# Submit custom request

This Edge Function receives the FiveM custom-build form, saves the request in
`public.custom_script_requests`, and emails `contact@gankbyte.com` through
Resend. It never exposes a service-role key in the browser.

## Supabase setup

1. Run `sql/008_CUSTOM_SCRIPT_REQUESTS.sql` in the Supabase SQL Editor.
2. Deploy this function as `submit-custom-request`.
3. Add these Edge Function secrets:

```text
SUPABASE_SECRET_KEY=sb_secret_...
RESEND_API_KEY=re_...
RESEND_FROM=GankByte <contact@gankbyte.com>
```

Supabase provides `SUPABASE_URL` automatically. Add the project secret key
from Dashboard > Settings > API Keys as `SUPABASE_SECRET_KEY`; never put this
key in the website or commit it to GitHub. The sending domain/address must be
verified with the email provider before production use.

With the Supabase CLI from this repository:

```powershell
supabase functions deploy submit-custom-request --no-verify-jwt
supabase secrets set SUPABASE_SECRET_KEY="sb_secret_..." RESEND_API_KEY="re_..." RESEND_FROM="GankByte <contact@gankbyte.com>"
```

`--no-verify-jwt` is intentional because the public generator must accept a
request before a visitor signs in. The function validates the submitted fields
and the database table remains private behind Row Level Security.
