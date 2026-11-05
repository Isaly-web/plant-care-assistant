# Retention of uploaded files (backlog B3)

Plant photos (buckets `plant-care-photos`, `plant-diagnosis-photos`, `plant-identification-photos`) are kept until the user deletes them or the account is deleted,
and are removed automatically after 12 months of inactivity. **The period must be confirmed by a
lawyer** (and whether a warning e-mail is required) — it is marked `<Todo>` on `/privacy`.

- Edge function `purge-inactive-files` (`supabase/functions/purge-inactive-files/`): service-role
  bearer only. Body `{"dryRun": true}` only reports counts.
- Removes the files, clears `photo_url` on plants and harvests and deletes the diagnosis/identification rows (the AI observation of the removed photo). Plants, harvests and care tasks stay; the shared
  `auth.users` record is never touched.
- Activity = latest of shared `last_sign_in_at` / `created_at` and the newest plant, harvest, diagnosis or identification write. Activity in any
  other Isaly app (shared login) also keeps the photos. Unreadable activity deletes nothing.
- Handles up to 200 user folders per run.
- **Not scheduled.** Deploy, run a dry run, then schedule weekly with pg_cron + Vault
  (`net.http_post` to `/functions/v1/purge-inactive-files` with the service-role key from Vault).
