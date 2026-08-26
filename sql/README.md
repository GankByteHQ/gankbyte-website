# GankByte database setup

Run these files in Supabase SQL Editor, in this order:

1. `xp-schema.sql`
2. `XP_MIGRATION_002.sql`
3. `XP_MIGRATION_003.sql`
4. `XP_MIGRATION_004_ARENA_VNEXT.sql`
5. `XP_MIGRATION_005_SYMBOL_CATCH.sql`
6. `XP_MIGRATION_006_GAME_MODE_LEADERBOARDS.sql`
7. `BYTE_SNATCH_MIGRATION.sql`
8. `007_GAME_SCORE_SYNC.sql`
9. `008_CUSTOM_SCRIPT_REQUESTS.sql`

The final migration adds Codebreaker’s saved scores, completes Byte Snatch’s weekly board, adds indexes, and installs automatic XP triggers for every connected game. Leaderboards are views over the score tables, so new approved scores appear automatically without a refresh job.

All game pages publish successful signed-in runs with `status = 'approved'`. The browser never contains a service-role key.

`008_CUSTOM_SCRIPT_REQUESTS.sql` creates the private request table used by the custom FiveM script form. Inserts are performed by the `submit-custom-request` Supabase Edge Function; admins can read and update requests through authenticated Supabase access.
