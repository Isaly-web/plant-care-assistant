-- Personliga skötselråd: adds species-level light requirements so the rule-based
-- advice generator (src/services/careAdviceService.ts) can produce watering/light/
-- fertilizing guidance per plant, not just due-date tasks.
alter table plant_care.plant_species
  add column light_needs text
  check (light_needs in ('full_sun', 'partial_sun', 'shade', 'bright_indirect', 'low_light'));

-- Backfill existing catalogue rows from their known light preferences.
update plant_care.plant_species set light_needs = 'full_sun' where name in
  ('Aroma', 'Blåbär', 'Citronträd', 'Discovery', 'Fikon', 'Gravenstein', 'Hallon',
   'Ingrid Marie', 'Jordgubbar', 'Lager', 'Lavendel', 'Olivträd', 'Pelargon', 'Ros');

update plant_care.plant_species set light_needs = 'partial_sun' where name in
  ('Hortensia', 'Krusbär', 'Vinbär');

update plant_care.plant_species set light_needs = 'bright_indirect' where name in
  ('Benjaminfikus', 'Monstera');

update plant_care.plant_species set light_needs = 'low_light' where name in
  ('Fredskalla', 'Gullranka', 'Svärmorstunga');
