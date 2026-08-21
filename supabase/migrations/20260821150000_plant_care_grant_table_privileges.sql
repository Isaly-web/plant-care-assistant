-- The 2026-08-18 schema-init migration granted USAGE on the plant_care
-- schema to authenticated/service_role, but never granted table-level
-- privileges — so every query from a real signed-in user (via PostgREST,
-- role `authenticated`) has been failing with "permission denied for
-- table ..." since the schema was created, regardless of RLS policies
-- (Postgres checks table grants before RLS). Confirmed empirically: 0 rows
-- in plant_care.plants despite RLS/app code being correct, and every other
-- Isaly app's schema (e.g. calorie_tracker) already has this grant.
--
-- Mirrors calorie_tracker's schema migration exactly: only `authenticated`
-- gets access (the app requires sign-in before rendering any screen; `anon`
-- has no legitimate reason to touch per-user data, including the shared
-- plant_species reference table).
grant select, insert, update, delete on all tables in schema plant_care
  to authenticated;

alter default privileges in schema plant_care
  grant select, insert, update, delete on tables to authenticated;
