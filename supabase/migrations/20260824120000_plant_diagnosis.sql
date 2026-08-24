-- Plant disease/pest/nutrient-deficiency diagnosis (AI vision): lets a user
-- photograph an *existing* plant that looks unwell and get an AI-suggested
-- diagnosis. Deliberately separate from plant_identifications (species
-- identification, supabase/migrations/20260821170000_plant_identification.sql)
-- per the original spec — same AI pattern (Gemini vision, structured output,
-- append-only cost/debug log), different table, different edge function
-- (supabase/functions/diagnose-plant), different private storage bucket.
-- Unlike identification, a diagnosis always belongs to an already-saved plant.

-- ---------------------------------------------------------------------------
-- plant_diagnoses: one row per photo (+ optional free-text symptom
-- description) the user submits for AI diagnosis of an existing plant. Holds
-- what the AI observed (ai_*) — never edited by the client after the edge
-- function writes it. There is no "confirmed" identity to correct here (unlike
-- plant_identifications) since a diagnosis doesn't create or rename anything;
-- the user instead acknowledges (keeps as history) or discards it.
-- ---------------------------------------------------------------------------
create table plant_care.plant_diagnoses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  plant_id uuid not null references plant_care.plants(id) on delete cascade,
  storage_path text not null,
  symptom_description text,
  status text not null default 'pending'
    check (status in ('pending', 'completed', 'failed', 'acknowledged', 'discarded')),

  -- What the AI observed.
  ai_issue_type text
    check (ai_issue_type in ('disease', 'pest', 'nutrient_deficiency', 'environmental', 'healthy', 'unknown')),
  ai_name text,
  ai_severity text check (ai_severity in ('low', 'medium', 'high')),
  ai_confidence numeric check (ai_confidence between 0 and 1),
  ai_description text,
  ai_recommended_actions jsonb not null default '[]'::jsonb,
  ai_alternatives jsonb not null default '[]'::jsonb,
  ai_observations jsonb not null default '[]'::jsonb,
  ai_provider text,
  ai_model text,
  ai_raw_response jsonb,
  diagnosed_at timestamptz,
  error_message text,

  acknowledged_at timestamptz,
  created_at timestamptz not null default now()
);

create index plant_diagnoses_user_id_idx on plant_care.plant_diagnoses(user_id, created_at desc);
create index plant_diagnoses_plant_id_idx on plant_care.plant_diagnoses(plant_id, created_at desc);

alter table plant_care.plant_diagnoses enable row level security;

-- The edge function runs with the caller's own JWT (not the service role, see
-- diagnose-plant/index.ts), so it needs the same insert/update access a
-- regular authenticated user has — never broader.
create policy "plant_diagnoses_select_own"
  on plant_care.plant_diagnoses for select to authenticated using (user_id = (select auth.uid()));
create policy "plant_diagnoses_insert_own"
  on plant_care.plant_diagnoses for insert to authenticated with check (user_id = (select auth.uid()));
create policy "plant_diagnoses_update_own"
  on plant_care.plant_diagnoses for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "plant_diagnoses_delete_own"
  on plant_care.plant_diagnoses for delete to authenticated using (user_id = (select auth.uid()));

-- ---------------------------------------------------------------------------
-- ai_diagnosis_log: append-only cost/debugging log, written on every attempt
-- (success or failure) by the edge function. Deliberately separate from
-- plant_diagnoses so a failed/malformed AI call is never lost even if the
-- diagnosis row itself couldn't be updated. Mirrors ai_identification_log.
-- ---------------------------------------------------------------------------
create table plant_care.ai_diagnosis_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  diagnosis_id uuid references plant_care.plant_diagnoses(id) on delete set null,
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

create index ai_diagnosis_log_user_id_idx on plant_care.ai_diagnosis_log(user_id, created_at desc);
-- Covering index for the diagnosis_id foreign key — the sibling
-- plant_identification migration shipped without this and needed a follow-up
-- fix (20260822094700), so it's included here from the start.
create index ai_diagnosis_log_diagnosis_id_idx on plant_care.ai_diagnosis_log(diagnosis_id);

alter table plant_care.ai_diagnosis_log enable row level security;

create policy "ai_diagnosis_log_select_own"
  on plant_care.ai_diagnosis_log for select to authenticated using (user_id = (select auth.uid()));
create policy "ai_diagnosis_log_insert_own"
  on plant_care.ai_diagnosis_log for insert to authenticated with check (user_id = (select auth.uid()));

-- Explicit table grants, not just RLS — see 20260821170000_plant_identification.sql
-- for why this can't be assumed to already hold via ALTER DEFAULT PRIVILEGES.
grant select, insert, update, delete on plant_care.plant_diagnoses, plant_care.ai_diagnosis_log
  to authenticated;

-- ---------------------------------------------------------------------------
-- Storage: private, user-scoped bucket for diagnosis photos — never public,
-- same reasoning as plant-identification-photos (a photo of a struggling
-- plant is not something to expose before the user has even seen the
-- result). Path: {user_id}/{diagnosis_id}/photo.jpg. Unlike identification
-- photos, these are never copied anywhere public afterwards.
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('plant-diagnosis-photos', 'plant-diagnosis-photos', false)
on conflict (id) do nothing;

create policy "plant_diagnosis_photos_select_own"
  on storage.objects for select
  to authenticated
  using (bucket_id = 'plant-diagnosis-photos' and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy "plant_diagnosis_photos_insert_own"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'plant-diagnosis-photos' and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy "plant_diagnosis_photos_update_own"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'plant-diagnosis-photos' and (storage.foldername(name))[1] = (select auth.uid())::text)
  with check (bucket_id = 'plant-diagnosis-photos' and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy "plant_diagnosis_photos_delete_own"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'plant-diagnosis-photos' and (storage.foldername(name))[1] = (select auth.uid())::text);
