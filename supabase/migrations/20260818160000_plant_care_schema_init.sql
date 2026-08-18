-- Plant Care Assistant: dedicated schema, isolated from the public schema used by other Isaly apps.
create schema if not exists plant_care;

grant usage on schema plant_care to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- Reference data: plant species / varieties catalogue (shared, read-only to users)
-- ---------------------------------------------------------------------------
create table plant_care.plant_species (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  category text not null check (category in ('indoor', 'mediterranean', 'flower', 'fruit_tree', 'berry', 'other')),
  emoji text not null default '🌱',
  watering_interval_days int not null default 7 check (watering_interval_days > 0),
  fertilizing_interval_days int check (fertilizing_interval_days > 0),
  pruning_period text,
  planting_period text,
  harvest_start_month int check (harvest_start_month between 1 and 12),
  harvest_end_month int check (harvest_end_month between 1 and 12),
  min_temperature_c numeric,
  frost_sensitive boolean not null default false,
  winter_strategy text,
  indoor_outdoor text not null default 'both' check (indoor_outdoor in ('indoor', 'outdoor', 'both')),
  description text,
  created_at timestamptz not null default now()
);

alter table plant_care.plant_species enable row level security;

create policy "plant_species_select_authenticated"
  on plant_care.plant_species for select
  to authenticated
  using (true);

-- ---------------------------------------------------------------------------
-- Plants owned by a user
-- ---------------------------------------------------------------------------
create table plant_care.plants (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  species_id uuid references plant_care.plant_species(id) on delete set null,
  name text not null,
  species text,
  variety text,
  photo_url text,
  location text,
  indoor_outdoor text not null default 'outdoor' check (indoor_outdoor in ('indoor', 'outdoor')),
  container_type text check (container_type in ('pot', 'ground')),
  purchase_date date,
  approximate_age_years numeric,
  notes text,
  custom_watering_interval_days int check (custom_watering_interval_days > 0),
  custom_fertilizing_interval_days int check (custom_fertilizing_interval_days > 0),
  custom_min_temperature_c numeric,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index plants_user_id_idx on plant_care.plants(user_id);
create index plants_species_id_idx on plant_care.plants(species_id);

alter table plant_care.plants enable row level security;

create policy "plants_select_own"
  on plant_care.plants for select to authenticated using (user_id = auth.uid());
create policy "plants_insert_own"
  on plant_care.plants for insert to authenticated with check (user_id = auth.uid());
create policy "plants_update_own"
  on plant_care.plants for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "plants_delete_own"
  on plant_care.plants for delete to authenticated using (user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- Care tasks (vattning, gödsling, beskärning, omplantering, övrigt, ...)
-- ---------------------------------------------------------------------------
create table plant_care.care_tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  plant_id uuid not null references plant_care.plants(id) on delete cascade,
  task_type text not null check (task_type in ('watering', 'fertilizing', 'pruning', 'repotting', 'winter_protection', 'harvest_check', 'other')),
  title text not null,
  description text,
  due_date date not null,
  completed_at timestamptz,
  priority text not null default 'medium' check (priority in ('high', 'medium', 'low')),
  source text not null default 'manual' check (source in ('rule_engine', 'manual', 'weather')),
  created_at timestamptz not null default now()
);

create index care_tasks_user_id_idx on plant_care.care_tasks(user_id);
create index care_tasks_plant_id_idx on plant_care.care_tasks(plant_id);
create index care_tasks_due_date_idx on plant_care.care_tasks(due_date);

alter table plant_care.care_tasks enable row level security;

create policy "care_tasks_select_own"
  on plant_care.care_tasks for select to authenticated using (user_id = auth.uid());
create policy "care_tasks_insert_own"
  on plant_care.care_tasks for insert to authenticated with check (user_id = auth.uid());
create policy "care_tasks_update_own"
  on plant_care.care_tasks for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "care_tasks_delete_own"
  on plant_care.care_tasks for delete to authenticated using (user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- Harvests
-- ---------------------------------------------------------------------------
create table plant_care.harvests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  plant_id uuid not null references plant_care.plants(id) on delete cascade,
  harvest_date date not null default current_date,
  crop_name text,
  quantity numeric check (quantity >= 0),
  unit text check (unit in ('kg', 'g', 'st', 'liter', 'other')),
  notes text,
  photo_url text,
  created_at timestamptz not null default now()
);

create index harvests_user_id_idx on plant_care.harvests(user_id);
create index harvests_plant_id_idx on plant_care.harvests(plant_id);

alter table plant_care.harvests enable row level security;

create policy "harvests_select_own"
  on plant_care.harvests for select to authenticated using (user_id = auth.uid());
create policy "harvests_insert_own"
  on plant_care.harvests for insert to authenticated with check (user_id = auth.uid());
create policy "harvests_update_own"
  on plant_care.harvests for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "harvests_delete_own"
  on plant_care.harvests for delete to authenticated using (user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- Weather snapshots (mocked in MVP, real API later — see WeatherService)
-- ---------------------------------------------------------------------------
create table plant_care.weather_snapshots (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  location text not null,
  temperature numeric,
  minimum_temperature numeric,
  maximum_temperature numeric,
  precipitation numeric,
  forecast_date date not null,
  source text not null default 'mock' check (source in ('mock', 'api')),
  created_at timestamptz not null default now()
);

create index weather_snapshots_user_id_idx on plant_care.weather_snapshots(user_id);
create unique index weather_snapshots_user_date_idx on plant_care.weather_snapshots(user_id, location, forecast_date);

alter table plant_care.weather_snapshots enable row level security;

create policy "weather_snapshots_select_own"
  on plant_care.weather_snapshots for select to authenticated using (user_id = auth.uid());
create policy "weather_snapshots_insert_own"
  on plant_care.weather_snapshots for insert to authenticated with check (user_id = auth.uid());
create policy "weather_snapshots_update_own"
  on plant_care.weather_snapshots for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "weather_snapshots_delete_own"
  on plant_care.weather_snapshots for delete to authenticated using (user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- Notifications (structure for future real push notifications)
-- ---------------------------------------------------------------------------
create table plant_care.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  plant_id uuid references plant_care.plants(id) on delete cascade,
  task_id uuid references plant_care.care_tasks(id) on delete cascade,
  title text not null,
  message text not null,
  priority text not null default 'medium' check (priority in ('high', 'medium', 'low')),
  type text not null default 'general' check (type in ('frost', 'watering', 'fertilizing', 'pruning', 'harvest', 'general')),
  status text not null default 'pending' check (status in ('pending', 'sent', 'read')),
  scheduled_at timestamptz not null default now(),
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index notifications_user_id_idx on plant_care.notifications(user_id);

alter table plant_care.notifications enable row level security;

create policy "notifications_select_own"
  on plant_care.notifications for select to authenticated using (user_id = auth.uid());
create policy "notifications_insert_own"
  on plant_care.notifications for insert to authenticated with check (user_id = auth.uid());
create policy "notifications_update_own"
  on plant_care.notifications for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "notifications_delete_own"
  on plant_care.notifications for delete to authenticated using (user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- updated_at trigger for plants
-- ---------------------------------------------------------------------------
create or replace function plant_care.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger plants_set_updated_at
  before update on plant_care.plants
  for each row execute function plant_care.set_updated_at();

-- ---------------------------------------------------------------------------
-- Expose the schema to PostgREST (the Supabase client talks to it directly)
-- ---------------------------------------------------------------------------
alter role authenticator set pgrst.db_schemas = 'public, plant_care';
notify pgrst, 'reload config';
