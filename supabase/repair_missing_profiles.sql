-- Ensure the schema actually landed in full.
--
-- Use this if the app ever says "Signed in, but your profile row was not
-- found," or any Supabase request comes back "permission denied for table
-- X" — the usual cause is schema.sql erroring out partway through its first
-- run (Supabase's SQL editor buries the error in small red text, easy to
-- miss) and never reaching later statements: the base table grants, RLS
-- policies, or the handle_new_user trigger at the very bottom. (Base table
-- grants are a separate, more basic layer than RLS — Postgres checks them
-- FIRST, so even flawless RLS policies do nothing without them.)
--
-- This is the entire "Row Level Security" + "Triggers" section of
-- schema.sql, rewritten to be safe to re-run any number of times
-- (`drop ... if exists` before every `create`), plus a one-time backfill of
-- any auth.users row that's missing its profiles row. Running this does
-- NOT touch table structure or existing data — only grants, policies,
-- triggers, and missing profile rows.
--
-- If you get a "relation ... does not exist" error running this, the table
-- creation itself didn't complete — re-paste the full schema.sql first
-- (every statement in it is safe to re-run except plain `create table` /
-- `create type`, which just error harmlessly with "already exists").

-- ── RLS: enable on every table (no-op if already enabled) ───────────────────
alter table profiles            enable row level security;
alter table categories          enable row level security;
alter table products            enable row level security;
alter table product_variants    enable row level security;
alter table inventory_movements enable row level security;
alter table deals               enable row level security;
alter table deal_products       enable row level security;
alter table reviews             enable row level security;
alter table orders              enable row level security;
alter table order_items         enable row level security;
alter table order_events        enable row level security;
alter table chat_sessions       enable row level security;
alter table chat_messages       enable row level security;
alter table settings            enable row level security;
alter table role_audit          enable row level security;

-- ── Base table grants (a separate layer from RLS — Postgres checks these
--    FIRST, and without them every request fails with "permission denied
--    for table X" no matter how correct the RLS policies are). service_role
--    needs this too — it's what Edge Functions use with the service key to
--    bypass RLS by design, and a hand-run schema.sql doesn't grant it
--    anything automatically the way a dashboard-scaffolded project does ────
grant usage on schema public to anon, authenticated, service_role;
grant select, insert, update, delete on all tables in schema public to anon, authenticated, service_role;
grant usage, select on all sequences in schema public to anon, authenticated, service_role;
alter default privileges in schema public grant select, insert, update, delete on tables to anon, authenticated, service_role;
alter default privileges in schema public grant usage, select on sequences to anon, authenticated, service_role;

-- ── role_audit foreign keys: "on delete set null" not the default ──────────
-- Without this, deleting a user from auth.users cascades to their profiles
-- row and then hits role_audit's default (blocking) FK behavior — the
-- delete fails with a foreign-key violation instead of going through, and
-- Supabase's dashboard surfaces that as a generic "failed to delete user"
-- error. Switching to "set null" lets the delete succeed while keeping the
-- audit row itself (from_role/to_role/created_at) — only the actor/subject
-- link goes null.
alter table role_audit drop constraint if exists role_audit_actor_id_fkey;
alter table role_audit drop constraint if exists role_audit_subject_id_fkey;
alter table role_audit
  add constraint role_audit_actor_id_fkey
  foreign key (actor_id) references profiles(id) on delete set null;
alter table role_audit
  add constraint role_audit_subject_id_fkey
  foreign key (subject_id) references profiles(id) on delete set null;

-- ── Helper function every policy below depends on ────────────────────────────
create or replace function current_role_is(roles app_role[])
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from profiles p where p.id = auth.uid() and p.role = any(roles));
$$;

-- ── Policies (drop-then-create, so this block is safe to re-run) ────────────
drop policy if exists profiles_self_read on profiles;
create policy profiles_self_read on profiles for select
  using (id = auth.uid() or current_role_is(array['owner','admin','support_agent']::app_role[]));
drop policy if exists profiles_self_update on profiles;
create policy profiles_self_update on profiles for update
  using (id = auth.uid()) with check (id = auth.uid() and role = (select role from profiles where id = auth.uid()));
drop policy if exists profiles_owner_manage on profiles;
create policy profiles_owner_manage on profiles for update
  using (current_role_is(array['owner']::app_role[]));

drop policy if exists categories_public_read on categories;
create policy categories_public_read on categories for select using (true);
drop policy if exists categories_staff_write on categories;
create policy categories_staff_write on categories for all
  using (current_role_is(array['owner','admin','catalog_manager']::app_role[]))
  with check (current_role_is(array['owner','admin','catalog_manager']::app_role[]));

drop policy if exists products_public_read on products;
create policy products_public_read on products for select using (active or current_role_is(array['owner','admin','catalog_manager']::app_role[]));
drop policy if exists products_staff_write on products;
create policy products_staff_write on products for all
  using (current_role_is(array['owner','admin','catalog_manager']::app_role[]))
  with check (current_role_is(array['owner','admin','catalog_manager']::app_role[]));

drop policy if exists variants_public_read on product_variants;
create policy variants_public_read on product_variants for select using (true);
drop policy if exists variants_staff_write on product_variants;
create policy variants_staff_write on product_variants for all
  using (current_role_is(array['owner','admin','catalog_manager']::app_role[]))
  with check (current_role_is(array['owner','admin','catalog_manager']::app_role[]));

drop policy if exists inventory_staff_only on inventory_movements;
create policy inventory_staff_only on inventory_movements for all
  using (current_role_is(array['owner','admin','catalog_manager']::app_role[]))
  with check (current_role_is(array['owner','admin','catalog_manager']::app_role[]));

drop policy if exists deals_public_read on deals;
create policy deals_public_read on deals for select using (active);
drop policy if exists deals_staff_write on deals;
create policy deals_staff_write on deals for all
  using (current_role_is(array['owner','admin','catalog_manager']::app_role[]))
  with check (current_role_is(array['owner','admin','catalog_manager']::app_role[]));
drop policy if exists deal_products_public_read on deal_products;
create policy deal_products_public_read on deal_products for select using (true);
drop policy if exists deal_products_staff_write on deal_products;
create policy deal_products_staff_write on deal_products for all
  using (current_role_is(array['owner','admin','catalog_manager']::app_role[]))
  with check (current_role_is(array['owner','admin','catalog_manager']::app_role[]));

drop policy if exists reviews_public_read on reviews;
create policy reviews_public_read on reviews for select
  using (approved or author_id = auth.uid() or current_role_is(array['owner','admin','support_agent']::app_role[]));
drop policy if exists reviews_own_insert on reviews;
create policy reviews_own_insert on reviews for insert with check (author_id = auth.uid());
drop policy if exists reviews_staff_moderate on reviews;
create policy reviews_staff_moderate on reviews for update
  using (current_role_is(array['owner','admin','support_agent']::app_role[]));

drop policy if exists orders_own_read on orders;
create policy orders_own_read on orders for select
  using (customer_id = auth.uid() or current_role_is(array['owner','admin','support_agent']::app_role[]));
drop policy if exists orders_staff_update on orders;
create policy orders_staff_update on orders for update
  using (current_role_is(array['owner','admin','support_agent']::app_role[]));
drop policy if exists order_items_read on order_items;
create policy order_items_read on order_items for select
  using (exists (select 1 from orders o where o.id = order_id
    and (o.customer_id = auth.uid() or current_role_is(array['owner','admin','support_agent']::app_role[]))));
drop policy if exists order_events_read on order_events;
create policy order_events_read on order_events for select
  using (exists (select 1 from orders o where o.id = order_id
    and (o.customer_id = auth.uid() or current_role_is(array['owner','admin','support_agent']::app_role[]))));

drop policy if exists chat_sessions_own on chat_sessions;
create policy chat_sessions_own on chat_sessions for all
  using (customer_id = auth.uid() or current_role_is(array['owner','admin','support_agent']::app_role[]))
  with check (customer_id = auth.uid() or current_role_is(array['owner','admin','support_agent']::app_role[]));
drop policy if exists chat_messages_own on chat_messages;
create policy chat_messages_own on chat_messages for all
  using (exists (select 1 from chat_sessions s where s.id = session_id
    and (s.customer_id = auth.uid() or current_role_is(array['owner','admin','support_agent']::app_role[]))))
  with check (true);

drop policy if exists settings_public_read on settings;
create policy settings_public_read on settings for select using (true);
drop policy if exists settings_owner_write on settings;
create policy settings_owner_write on settings for all
  using (current_role_is(array['owner']::app_role[]))
  with check (current_role_is(array['owner']::app_role[]));

drop policy if exists role_audit_owner_read on role_audit;
create policy role_audit_owner_read on role_audit for select
  using (current_role_is(array['owner']::app_role[]));
drop policy if exists role_audit_owner_insert on role_audit;
create policy role_audit_owner_insert on role_audit for insert
  with check (current_role_is(array['owner']::app_role[]));

-- ── Storage: product-images bucket (public read, staff upload) ─────────────
-- A project that started before this bucket existed won't have it — this is
-- the piece that lets the admin console actually attach a real photo to a
-- product instead of only the built-in illustration.
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

-- ── Triggers (drop-then-create) ──────────────────────────────────────────────
create or replace function handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare first_user boolean;
begin
  select count(*) = 0 into first_user from profiles;
  insert into profiles (id, email, full_name, role)
  values (new.id, new.email, coalesce(new.raw_user_meta_data->>'full_name',''),
          case when first_user then 'owner'::app_role else 'customer'::app_role end)
  on conflict (id) do nothing;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users for each row execute function handle_new_user();

create or replace function apply_inventory_movement()
returns trigger language plpgsql as $$
begin
  if new.variant_id is not null then
    update product_variants set stock = stock + new.delta where id = new.variant_id;
  end if;
  update products set stock = stock + new.delta, updated_at = now() where id = new.product_id;
  return new;
end $$;

drop trigger if exists inventory_movement_applied on inventory_movements;
create trigger inventory_movement_applied
  after insert on inventory_movements for each row execute function apply_inventory_movement();

create or replace function log_order_status()
returns trigger language plpgsql as $$
begin
  if new.status is distinct from old.status then
    insert into order_events (order_id, status, actor_id) values (new.id, new.status, auth.uid());
  end if;
  return new;
end $$;

drop trigger if exists order_status_logged on orders;
create trigger order_status_logged
  after update on orders for each row execute function log_order_status();

-- ── Backfill: any auth.users row still missing a profiles row ───────────────
-- (No-op if you already ran the narrower version of this fix — `on conflict
-- do nothing` above and the `left join ... where p.id is null` below both
-- make this safe to run again.)
with missing as (
  select u.id, u.email, u.created_at,
         row_number() over (order by u.created_at) as rn
  from auth.users u
  left join profiles p on p.id = u.id
  where p.id is null
),
existing_count as (
  select count(*) as n from profiles
)
insert into profiles (id, email, full_name, role)
select m.id, m.email, '',
       case when existing_count.n = 0 and m.rn = 1 then 'owner'::app_role else 'customer'::app_role end
from missing m cross join existing_count;

-- Sanity check — should show every account you've created, with the first
-- one as 'owner'.
select id, email, role, created_at from profiles order by created_at;
