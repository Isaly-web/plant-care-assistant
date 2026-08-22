-- Plant identification (AI vision): lets a user photograph a plant and get an
-- AI-suggested species before manually confirming it. Mirrors the Snap & Savor
-- (calorie_tracker) analyze-meal pattern: a private per-user Storage bucket, a
-- draft-first row the edge function fills in, and a separate append-only log
-- for cost/debugging. See supabase/functions/identify-plant.

-- ---------------------------------------------------------------------------
-- plant_identifications: one row per photo the user submits for AI
-- identification. Holds what the AI observed (ai_*) separately from what the
-- user ultimately confirmed (confirmed_*) — the AI never overwrites the
-- user's correction, and a wrong AI guess stays visible for debugging.
-- ---------------------------------------------------------------------------
create table plant_care.plant_identifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  plant_id uuid references plant_care.plants(id) on delete set null,
  storage_path text not null,
  status text not null default 'pending'
    check (status in ('pending', 'completed', 'failed', 'confirmed', 'discarded')),

  -- What the AI observed (never edited by the client after the edge function writes it).
  ai_scientific_name text,
  ai_common_name text,
  ai_confidence numeric check (ai_confidence between 0 and 1),
  ai_alternatives jsonb not null default '[]'::jsonb,
  ai_observations jsonb not null default '[]'::jsonb,
  ai_provider text,
  ai_model text,
  ai_raw_response jsonb,
  identified_at timestamptz,
  error_message text,

  -- What the user actually confirmed — the final source of truth, which may
  -- differ from the AI's suggestion (a different alternative, or a manual
  -- correction typed by the user).
  confirmed_scientific_name text,
  confirmed_common_name text,
  confirmed_at timestamptz,

  created_at timestamptz not null default now()
);

create index plant_identifications_user_id_idx on plant_care.plant_identifications(user_id, created_at desc);
create index plant_identifications_plant_id_idx on plant_care.plant_identifications(plant_id);

alter table plant_care.plant_identifications enable row level security;

-- The edge function runs with the caller's own JWT (not the service role, see
-- identify-plant/index.ts), so it needs the same insert/update access a
-- regular authenticated user has — never broader.
create policy "plant_identifications_select_own"
  on plant_care.plant_identifications for select to authenticated using (user_id = (select auth.uid()));
create policy "plant_identifications_insert_own"
  on plant_care.plant_identifications for insert to authenticated with check (user_id = (select auth.uid()));
create policy "plant_identifications_update_own"
  on plant_care.plant_identifications for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "plant_identifications_delete_own"
  on plant_care.plant_identifications for delete to authenticated using (user_id = (select auth.uid()));

-- ---------------------------------------------------------------------------
-- ai_identification_log: append-only cost/debugging log, written on every
-- attempt (success or failure) by the edge function. Deliberately separate
-- from plant_identifications so a failed/malformed AI call is never lost even
-- if the identification row itself couldn't be updated.
-- ---------------------------------------------------------------------------
create table plant_care.ai_identification_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  identification_id uuid references plant_care.plant_identifications(id) on delete set null,
  provider text not null,
  model text not null,
  input_tokens integer,
  output_tokens integer,
  processing_time_ms integer,
  status text not null check (status in ('success', 'error')),
  error_type text,
  error text,
  created_at timestamptz not null default now()
);

create index ai_identification_log_user_id_idx on plant_care.ai_identification_log(user_id, created_at desc);

alter table plant_care.ai_identification_log enable row level security;

create policy "ai_identification_log_select_own"
  on plant_care.ai_identification_log for select to authenticated using (user_id = (select auth.uid()));
create policy "ai_identification_log_insert_own"
  on plant_care.ai_identification_log for insert to authenticated with check (user_id = (select auth.uid()));

-- Explicit table grants, not just RLS: the 20260821150000 migration found that
-- plant_care's original schema-init only ever granted USAGE on the schema,
-- never table-level privileges, so every authenticated-role query failed
-- with "permission denied" regardless of RLS (Postgres checks grants before
-- RLS). Its ALTER DEFAULT PRIVILEGES should cover tables created after it by
-- the same migration role, but these are granted explicitly too so that
-- assumption is never load-bearing for this feature.
grant select, insert, update, delete on plant_care.plant_identifications, plant_care.ai_identification_log
  to authenticated;

-- ---------------------------------------------------------------------------
-- plants: link back to the identification that produced this plant (if any),
-- plus a cheap read of the confirmed confidence/timestamp without a join.
-- The scientific/common name themselves reuse the existing `species`/`name`
-- free-text fields — no need to duplicate them.
-- ---------------------------------------------------------------------------
alter table plant_care.plants
  add column identification_source text not null default 'manual'
    check (identification_source in ('manual', 'ai')),
  add column plant_identification_id uuid references plant_care.plant_identifications(id) on delete set null,
  add column identification_confidence numeric check (identification_confidence between 0 and 1),
  add column identified_at timestamptz;

-- ---------------------------------------------------------------------------
-- Storage: private, user-scoped bucket for identification photos (not shown
-- publicly — only used server-side by the AI call and briefly by the client
-- to preview the result). Path: {user_id}/{identification_id}/photo.jpg.
-- Once a user confirms, the client re-uploads the same photo to the existing
-- public `plant-care-photos` bucket as the plant's photo_url — this bucket
-- itself is never made public.
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('plant-identification-photos', 'plant-identification-photos', false)
on conflict (id) do nothing;

create policy "plant_identification_photos_select_own"
  on storage.objects for select
  to authenticated
  using (bucket_id = 'plant-identification-photos' and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy "plant_identification_photos_insert_own"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'plant-identification-photos' and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy "plant_identification_photos_update_own"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'plant-identification-photos' and (storage.foldername(name))[1] = (select auth.uid())::text)
  with check (bucket_id = 'plant-identification-photos' and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy "plant_identification_photos_delete_own"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'plant-identification-photos' and (storage.foldername(name))[1] = (select auth.uid())::text);
