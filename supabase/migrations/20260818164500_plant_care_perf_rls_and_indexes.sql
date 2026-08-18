-- Performance advisories: wrap auth.uid() in a subselect so Postgres evaluates it
-- once per query instead of re-evaluating per row, and add the two missing
-- covering indexes on notifications' foreign keys.

create index notifications_plant_id_idx on plant_care.notifications(plant_id);
create index notifications_task_id_idx on plant_care.notifications(task_id);

-- plants
drop policy "plants_select_own" on plant_care.plants;
drop policy "plants_insert_own" on plant_care.plants;
drop policy "plants_update_own" on plant_care.plants;
drop policy "plants_delete_own" on plant_care.plants;

create policy "plants_select_own" on plant_care.plants for select to authenticated using (user_id = (select auth.uid()));
create policy "plants_insert_own" on plant_care.plants for insert to authenticated with check (user_id = (select auth.uid()));
create policy "plants_update_own" on plant_care.plants for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "plants_delete_own" on plant_care.plants for delete to authenticated using (user_id = (select auth.uid()));

-- care_tasks
drop policy "care_tasks_select_own" on plant_care.care_tasks;
drop policy "care_tasks_insert_own" on plant_care.care_tasks;
drop policy "care_tasks_update_own" on plant_care.care_tasks;
drop policy "care_tasks_delete_own" on plant_care.care_tasks;

create policy "care_tasks_select_own" on plant_care.care_tasks for select to authenticated using (user_id = (select auth.uid()));
create policy "care_tasks_insert_own" on plant_care.care_tasks for insert to authenticated with check (user_id = (select auth.uid()));
create policy "care_tasks_update_own" on plant_care.care_tasks for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "care_tasks_delete_own" on plant_care.care_tasks for delete to authenticated using (user_id = (select auth.uid()));

-- harvests
drop policy "harvests_select_own" on plant_care.harvests;
drop policy "harvests_insert_own" on plant_care.harvests;
drop policy "harvests_update_own" on plant_care.harvests;
drop policy "harvests_delete_own" on plant_care.harvests;

create policy "harvests_select_own" on plant_care.harvests for select to authenticated using (user_id = (select auth.uid()));
create policy "harvests_insert_own" on plant_care.harvests for insert to authenticated with check (user_id = (select auth.uid()));
create policy "harvests_update_own" on plant_care.harvests for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "harvests_delete_own" on plant_care.harvests for delete to authenticated using (user_id = (select auth.uid()));

-- weather_snapshots
drop policy "weather_snapshots_select_own" on plant_care.weather_snapshots;
drop policy "weather_snapshots_insert_own" on plant_care.weather_snapshots;
drop policy "weather_snapshots_update_own" on plant_care.weather_snapshots;
drop policy "weather_snapshots_delete_own" on plant_care.weather_snapshots;

create policy "weather_snapshots_select_own" on plant_care.weather_snapshots for select to authenticated using (user_id = (select auth.uid()));
create policy "weather_snapshots_insert_own" on plant_care.weather_snapshots for insert to authenticated with check (user_id = (select auth.uid()));
create policy "weather_snapshots_update_own" on plant_care.weather_snapshots for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "weather_snapshots_delete_own" on plant_care.weather_snapshots for delete to authenticated using (user_id = (select auth.uid()));

-- notifications
drop policy "notifications_select_own" on plant_care.notifications;
drop policy "notifications_insert_own" on plant_care.notifications;
drop policy "notifications_update_own" on plant_care.notifications;
drop policy "notifications_delete_own" on plant_care.notifications;

create policy "notifications_select_own" on plant_care.notifications for select to authenticated using (user_id = (select auth.uid()));
create policy "notifications_insert_own" on plant_care.notifications for insert to authenticated with check (user_id = (select auth.uid()));
create policy "notifications_update_own" on plant_care.notifications for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "notifications_delete_own" on plant_care.notifications for delete to authenticated using (user_id = (select auth.uid()));
