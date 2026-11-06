-- Isaly App Foundation: "Radera mina uppgifter" that never touches the shared auth user.
--
-- auth.users is shared by every Isaly app. Deleting the auth user would cascade into the other
-- apps' data, so this function deletes ONLY Plant Care Assistant's own rows for the caller, in one
-- transaction. The shared login is removed by a separate central process (not defined yet).
-- Idempotent: running it again finds nothing to delete.
--
-- Files in Storage are NOT deleted here (deleting storage.objects rows in SQL leaves the files in
-- the object store). The client removes the user's files first in the buckets plant-care-photos,
-- plant-identification-photos and plant-diagnosis-photos (src/lib/account.ts), then calls this.
--
-- plant_species is shared reference data (no user column) and is kept.
-- Keep the table list in sync with every table in plant_care that references auth.users
-- (src/lib/account.test.ts fails otherwise).
-- Rollback: docs/delete-account-app-data-rollback.sql.
begin;

create or replace function plant_care.delete_account_app_data()
returns void
language plpgsql
security definer
set search_path = plant_care, pg_temp
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    raise exception 'not_authenticated';
  end if;

  delete from plant_care.ai_identification_log where user_id = v_uid;
  delete from plant_care.ai_diagnosis_log where user_id = v_uid;
  delete from plant_care.plant_identifications where user_id = v_uid;
  delete from plant_care.plant_diagnoses where user_id = v_uid;
  delete from plant_care.notifications where user_id = v_uid;
  delete from plant_care.weather_snapshots where user_id = v_uid;
  delete from plant_care.harvests where user_id = v_uid;
  delete from plant_care.care_tasks where user_id = v_uid;
  delete from plant_care.plants where user_id = v_uid;
end;
$$;

revoke all on function plant_care.delete_account_app_data() from public, anon;
grant execute on function plant_care.delete_account_app_data() to authenticated;

commit;
