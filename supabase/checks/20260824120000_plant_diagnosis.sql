select
  (
    select count(*)
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'plant_care'
      and c.relname in ('plant_diagnoses', 'ai_diagnosis_log')
      and c.relkind = 'r' and c.relrowsecurity
  ) = 2
  and exists (
    select 1 from pg_policies
    where schemaname = 'storage' and tablename = 'objects'
      and policyname = 'plant_diagnosis_photos_insert_own'
  );
