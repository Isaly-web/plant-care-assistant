insert into storage.buckets (id, name, public)
values ('plant-care-photos', 'plant-care-photos', true)
on conflict (id) do nothing;

create policy "plant_care_photos_public_read"
  on storage.objects for select
  to public
  using (bucket_id = 'plant-care-photos');

create policy "plant_care_photos_own_insert"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'plant-care-photos' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "plant_care_photos_own_update"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'plant-care-photos' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "plant_care_photos_own_delete"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'plant-care-photos' and (storage.foldername(name))[1] = auth.uid()::text);
