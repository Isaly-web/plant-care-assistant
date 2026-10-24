select exists (
  select 1 from pg_attribute a
  join pg_class c on c.oid = a.attrelid
  join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'plant_care' and c.relname = 'plant_species'
    and a.attname = 'light_needs' and a.attnum > 0 and not a.attisdropped
);
