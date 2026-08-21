# GankByte XP v0.2 setup

The public site is ready for Supabase plus Discord OAuth. These values are intentionally not committed yet.

1. Create a Supabase project.
2. Open the SQL Editor and run `xp-schema.sql`.
3. If the base schema already exists, run `XP_MIGRATION_002.sql` and then `XP_MIGRATION_003.sql` instead. Migration 003 adds contribution categories and the expanded challenge choices used by the XP form.
4. Copy the project URL and publishable/anon key into `xp-config.js`.
5. In Supabase Authentication, enable Discord and copy its callback URL.
6. Create a Discord Developer Application and add the Supabase callback URL under OAuth2 redirects.
7. Copy the Discord client ID and secret into the Supabase Discord provider settings.
8. Add `https://gankbyte.com/xp.html` to the Supabase Auth URL allow list.
9. Sign in once with the GankByte owner Discord account, then mark that profile as admin in Supabase:

```sql
update public.profiles
set is_admin = true
where id = 'YOUR_AUTH_USER_ID';
```

When the schema changes, rerun the complete `xp-schema.sql` file. It is written to be safely rerunnable and includes the Glitch Dash score table, Arena events, weekly leaderboard views, contribution categories, and expanded XP challenges.

Never put a Supabase service-role key in the website. The browser only needs the public project URL and publishable/anon key.
