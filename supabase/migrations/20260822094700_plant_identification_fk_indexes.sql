-- Covering indexes for the two foreign keys added by plant_identification,
-- caught by the performance advisor right after that migration — same class
-- of gap the 20260818173623 migration already fixed once for notifications'
-- foreign keys.
create index ai_identification_log_identification_id_idx
  on plant_care.ai_identification_log(identification_id);

create index plants_plant_identification_id_idx
  on plant_care.plants(plant_identification_id);
