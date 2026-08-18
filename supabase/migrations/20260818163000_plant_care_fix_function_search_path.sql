-- Fixes the "Function Search Path Mutable" security advisory: pin search_path
-- explicitly so the trigger function can't be hijacked via a mutable search_path.
create or replace function plant_care.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;
