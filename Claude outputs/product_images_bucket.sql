-- Run this once in the Supabase SQL Editor to add the storage bucket the
-- new "Upload photo" button in Products needs. schema.sql and
-- repair_missing_profiles.sql are also updated with this so it's not lost
-- on a future fresh install, but your live project needs it applied by hand.

insert into storage.buckets (id, name, public)
values ('product-images', 'product-images', true)
on conflict (id) do nothing;

drop policy if exists product_images_public_read on storage.objects;
create policy product_images_public_read on storage.objects for select
  using (bucket_id = 'product-images');

drop policy if exists product_images_staff_upload on storage.objects;
create policy product_images_staff_upload on storage.objects for insert
  with check (bucket_id = 'product-images' and current_role_is(array['owner','admin','catalog_manager']::app_role[]));

drop policy if exists product_images_staff_update on storage.objects;
create policy product_images_staff_update on storage.objects for update
  using (bucket_id = 'product-images' and current_role_is(array['owner','admin','catalog_manager']::app_role[]));

drop policy if exists product_images_staff_delete on storage.objects;
create policy product_images_staff_delete on storage.objects for delete
  using (bucket_id = 'product-images' and current_role_is(array['owner','admin','catalog_manager']::app_role[]));
