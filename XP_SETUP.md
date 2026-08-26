# GankByte XP v0.2 setup

The public site is ready for Supabase plus Discord OAuth. These values are intentionally not committed yet.

1. Create a Supabase project.
2. Open the SQL Editor and run the ordered files in [`sql/README.md`](sql/README.md).
3. The ordered set includes the base schema, XP and Arena migrations, Byte Snatch, and the final game score-sync migration. Migration 007 adds Codebreaker storage, Byte Snatch weekly scores, indexes, and automatic XP triggers for every connected game.
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

When the schema changes, use the ordered files in `sql/README.md`. The migrations are written to be rerunnable; the final score-sync migration keeps the public boards live because they are database views over the score tables.

Never put a Supabase service-role key in the website. The browser only needs the public project URL and publishable/anon key.
