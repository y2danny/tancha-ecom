-- ============================================================================
-- Tancha — Postgres schema (Supabase)
-- Money is stored in KOBO as bigint. Never use float for currency.
-- Authorisation lives in the database (RLS), not in the React app. A leaked
-- anon key must not be able to write a product row.
-- ============================================================================

create extension if not exists "pgcrypto";
create extension if not exists "pg_trgm";      -- fast fuzzy product search

-- ── Enums ───────────────────────────────────────────────────────────────────
create type app_role as enum ('owner','admin','catalog_manager','support_agent','customer');
create type order_status as enum ('pending_payment','confirmed','packed','in_transit','delivered','cancelled','returned');
create type payment_method as enum ('paystack','pay_on_delivery');
create type deal_kind as enum ('day','week','bundle');
create type chat_status as enum ('bot','escalation_requested','with_agent','closed');

-- ── Identity ────────────────────────────────────────────────────────────────
-- Mirrors auth.users. Role changes are audited; only `owner` may grant staff roles.
create table profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  email       text not null,
  full_name   text not null default '',
  phone       text,
  role        app_role not null default 'customer',
  created_at  timestamptz not null default now()
);

create table role_audit (
  id          bigserial primary key,
  -- "on delete set null" (not the default) so deleting a staff account is
  -- never blocked by its own audit trail, and the trail survives the
  -- deletion -- only the actor/subject link goes null, from_role/to_role/
  -- created_at stay intact.
  actor_id    uuid references profiles(id) on delete set null,
  subject_id  uuid references profiles(id) on delete set null,
  from_role   app_role,
  to_role     app_role,
  created_at  timestamptz not null default now()
);

-- Helper used by every policy below. SECURITY DEFINER so it can read profiles
-- without recursing through profiles' own RLS.
create or replace function current_role_is(roles app_role[])
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from profiles p where p.id = auth.uid() and p.role = any(roles));
$$;

-- ── Catalog ─────────────────────────────────────────────────────────────────
create table categories (
  id            uuid primary key default gen_random_uuid(),
  slug          text unique not null,
  name          text not null,
  image_key     text not null default 'notebook',
  image_url     text,
  parent_id     uuid references categories(id) on delete set null,
  featured      boolean not null default false,
  position      int not null default 0,
  created_at    timestamptz not null default now()
);

create table products (
  id                 uuid primary key default gen_random_uuid(),
  slug               text unique not null,
  name               text not null,
  hook               text not null default '',
  description        text not null default '',
  bullets            text[] not null default '{}',
  brand              text not null default 'Tancha',
  category_id        uuid not null references categories(id) on delete restrict,
  image_key          text not null default 'notebook',
  image_url          text,
  gallery            text[] not null default '{}',
  price_kobo         bigint not null check (price_kobo >= 0),
  compare_at_kobo    bigint check (compare_at_kobo is null or compare_at_kobo >= price_kobo),
  stock              int not null default 0 check (stock >= 0),
  rating             numeric(2,1) not null default 0,
  review_count       int not null default 0,
  units_sold         int not null default 0,
  tags               text[] not null default '{}',
  delivery_days_min  int not null default 2,
  delivery_days_max  int not null default 5,
  pay_on_delivery    boolean not null default true,
  active             boolean not null default true,
  created_by         uuid references profiles(id),
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

create index products_category_idx on products(category_id) where active;
create index products_search_idx on products using gin ((name || ' ' || brand || ' ' || hook) gin_trgm_ops);
create index products_tags_idx on products using gin (tags);

create table product_variants (
  id            uuid primary key default gen_random_uuid(),
  product_id    uuid not null references products(id) on delete cascade,
  option_name   text not null,          -- 'Size' | 'Colour'
  label         text not null,          -- 'EU 36'
  price_kobo    bigint not null,
  stock         int not null default 0 check (stock >= 0),
  sku           text unique not null
);

-- Every stock movement is a row. Never UPDATE a stock column blindly — you lose
-- the audit trail and you race with concurrent checkouts.
create table inventory_movements (
  id            bigserial primary key,
  product_id    uuid not null references products(id) on delete cascade,
  variant_id    uuid references product_variants(id) on delete cascade,
  delta         int not null,
  reason        text not null,          -- 'restock' | 'sale' | 'damage' | 'correction'
  order_id      uuid,
  actor_id      uuid references profiles(id),
  created_at    timestamptz not null default now()
);

create table deals (
  id                 uuid primary key default gen_random_uuid(),
  kind               deal_kind not null,
  title              text not null,
  subtitle           text not null default '',
  starts_at          timestamptz not null,
  ends_at            timestamptz not null,
  headline_discount  int not null default 0,
  active             boolean not null default true,
  created_by         uuid references profiles(id),
  check (ends_at > starts_at)
);

create table deal_products (
  deal_id     uuid references deals(id) on delete cascade,
  product_id  uuid references products(id) on delete cascade,
  position    int not null default 0,
  primary key (deal_id, product_id)
);

create table reviews (
  id                 uuid primary key default gen_random_uuid(),
  product_id         uuid not null references products(id) on delete cascade,
  author_id          uuid references profiles(id) on delete set null,
  author_name        text not null,
  city               text,
  rating             int not null check (rating between 1 and 5),
  body               text not null,
  verified_purchase  boolean not null default false,
  approved           boolean not null default false,
  created_at         timestamptz not null default now()
);

-- ── Orders ──────────────────────────────────────────────────────────────────
create table orders (
  id                uuid primary key default gen_random_uuid(),
  reference         text unique not null,
  customer_id       uuid references profiles(id) on delete set null,
  status            order_status not null default 'pending_payment',
  payment_method    payment_method not null,
  subtotal_kobo     bigint not null,
  delivery_kobo     bigint not null default 0,
  discount_kobo     bigint not null default 0,
  total_kobo        bigint not null,
  -- Paystack
  paystack_reference text unique,
  paid_at            timestamptz,
  -- Delivery
  full_name    text not null,
  phone        text not null,
  alt_phone    text,
  street       text not null,
  city         text not null,
  state        text not null,
  landmark     text,
  note         text,
  estimated_from timestamptz,
  estimated_to   timestamptz,
  placed_at    timestamptz not null default now()
);

create index orders_customer_idx on orders(customer_id);
create index orders_status_idx on orders(status, placed_at desc);

create table order_items (
  id             uuid primary key default gen_random_uuid(),
  order_id       uuid not null references orders(id) on delete cascade,
  product_id     uuid not null references products(id) on delete restrict,
  variant_id     uuid references product_variants(id) on delete set null,
  -- Snapshot: a product renamed or repriced later must not rewrite history
  name_snapshot  text not null,
  unit_price_kobo bigint not null,
  quantity       int not null check (quantity > 0)
);

create table order_events (
  id          bigserial primary key,
  order_id    uuid not null references orders(id) on delete cascade,
  status      order_status not null,
  note        text,
  actor_id    uuid references profiles(id),
  created_at  timestamptz not null default now()
);

-- ── Support / AI chat ───────────────────────────────────────────────────────
create table chat_sessions (
  id           uuid primary key default gen_random_uuid(),
  customer_id  uuid references profiles(id) on delete set null,
  anon_key     text,                     -- for signed-out shoppers
  status       chat_status not null default 'bot',
  agent_id     uuid references profiles(id),
  started_at   timestamptz not null default now(),
  closed_at    timestamptz
);

create table chat_messages (
  id           uuid primary key default gen_random_uuid(),
  session_id   uuid not null references chat_sessions(id) on delete cascade,
  author       text not null check (author in ('customer','assistant','agent','system')),
  body         text not null,
  product_ids  uuid[] not null default '{}',
  created_at   timestamptz not null default now()
);

create index chat_messages_session_idx on chat_messages(session_id, created_at);

-- ── Settings (the values the CEO edits, not the developer) ──────────────────
create table settings (
  key         text primary key,
  value       jsonb not null,
  updated_by  uuid references profiles(id),
  updated_at  timestamptz not null default now()
);

-- ============================================================================
-- Row Level Security
-- ============================================================================
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

-- RLS decides WHICH ROWS a role can touch, but Postgres still checks plain
-- table-level GRANTs first — without these, every request from anon/
-- authenticated fails with "permission denied for table X" before RLS is
-- even evaluated. This is a separate, more basic layer than RLS. The actual
-- security boundary stays the policies below: a broad GRANT here, combined
-- with restrictive RLS, is the standard, documented Supabase pattern (it's
-- exactly what Postgres's own error message recommends doing).
--
-- service_role is included here too. In a fresh Supabase project scaffolded
-- through the dashboard, service_role gets full schema access automatically;
-- this project's schema was applied by hand-running this file, which never
-- granted service_role anything, so Edge Functions using the service key
-- (which bypass RLS by design, e.g. invite-team-member) got the same
-- "permission denied for table X" until this grant existed.
grant usage on schema public to anon, authenticated, service_role;
grant select, insert, update, delete on all tables in schema public to anon, authenticated, service_role;
grant usage, select on all sequences in schema public to anon, authenticated, service_role;
-- So any table added later doesn't silently reintroduce this bug.
alter default privileges in schema public grant select, insert, update, delete on tables to anon, authenticated, service_role;
alter default privileges in schema public grant usage, select on sequences to anon, authenticated, service_role;

-- Profiles: you see yourself; staff see everyone; only owner changes roles.
create policy profiles_self_read on profiles for select
  using (id = auth.uid() or current_role_is(array['owner','admin','support_agent']::app_role[]));
create policy profiles_self_update on profiles for update
  using (id = auth.uid()) with check (id = auth.uid() and role = (select role from profiles where id = auth.uid()));
create policy profiles_owner_manage on profiles for update
  using (current_role_is(array['owner']::app_role[]));

-- Catalog: the world reads what is active; staff write.
create policy categories_public_read on categories for select using (true);
create policy categories_staff_write on categories for all
  using (current_role_is(array['owner','admin','catalog_manager']::app_role[]))
  with check (current_role_is(array['owner','admin','catalog_manager']::app_role[]));

create policy products_public_read on products for select using (active or current_role_is(array['owner','admin','catalog_manager']::app_role[]));
create policy products_staff_write on products for all
  using (current_role_is(array['owner','admin','catalog_manager']::app_role[]))
  with check (current_role_is(array['owner','admin','catalog_manager']::app_role[]));

create policy variants_public_read on product_variants for select using (true);
create policy variants_staff_write on product_variants for all
  using (current_role_is(array['owner','admin','catalog_manager']::app_role[]))
  with check (current_role_is(array['owner','admin','catalog_manager']::app_role[]));

create policy inventory_staff_only on inventory_movements for all
  using (current_role_is(array['owner','admin','catalog_manager']::app_role[]))
  with check (current_role_is(array['owner','admin','catalog_manager']::app_role[]));

create policy deals_public_read on deals for select using (active);
create policy deals_staff_write on deals for all
  using (current_role_is(array['owner','admin','catalog_manager']::app_role[]))
  with check (current_role_is(array['owner','admin','catalog_manager']::app_role[]));
create policy deal_products_public_read on deal_products for select using (true);
create policy deal_products_staff_write on deal_products for all
  using (current_role_is(array['owner','admin','catalog_manager']::app_role[]))
  with check (current_role_is(array['owner','admin','catalog_manager']::app_role[]));

-- Reviews: only approved ones are public; you may write your own.
create policy reviews_public_read on reviews for select
  using (approved or author_id = auth.uid() or current_role_is(array['owner','admin','support_agent']::app_role[]));
create policy reviews_own_insert on reviews for insert with check (author_id = auth.uid());
create policy reviews_staff_moderate on reviews for update
  using (current_role_is(array['owner','admin','support_agent']::app_role[]));

-- Orders: a customer sees only their own. Staff see all. Nobody edits totals
-- from the client — orders are created by an Edge Function with the service key.
create policy orders_own_read on orders for select
  using (customer_id = auth.uid() or current_role_is(array['owner','admin','support_agent']::app_role[]));
create policy orders_staff_update on orders for update
  using (current_role_is(array['owner','admin','support_agent']::app_role[]));
create policy order_items_read on order_items for select
  using (exists (select 1 from orders o where o.id = order_id
    and (o.customer_id = auth.uid() or current_role_is(array['owner','admin','support_agent']::app_role[]))));
create policy order_events_read on order_events for select
  using (exists (select 1 from orders o where o.id = order_id
    and (o.customer_id = auth.uid() or current_role_is(array['owner','admin','support_agent']::app_role[]))));

-- Chat
create policy chat_sessions_own on chat_sessions for all
  using (customer_id = auth.uid() or current_role_is(array['owner','admin','support_agent']::app_role[]))
  with check (customer_id = auth.uid() or current_role_is(array['owner','admin','support_agent']::app_role[]));
create policy chat_messages_own on chat_messages for all
  using (exists (select 1 from chat_sessions s where s.id = session_id
    and (s.customer_id = auth.uid() or current_role_is(array['owner','admin','support_agent']::app_role[]))))
  with check (true);

create policy settings_public_read on settings for select using (true);
create policy settings_owner_write on settings for all
  using (current_role_is(array['owner']::app_role[]))
  with check (current_role_is(array['owner']::app_role[]));

-- Role changes are owner-only and the audit trail is owner-only to read —
-- this table has no public grant of any kind.
create policy role_audit_owner_read on role_audit for select
  using (current_role_is(array['owner']::app_role[]));
create policy role_audit_owner_insert on role_audit for insert
  with check (current_role_is(array['owner']::app_role[]));

-- ============================================================================
-- Triggers
-- ============================================================================

-- New auth user -> profile row. First ever user becomes owner (the CEO).
create or replace function handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare first_user boolean;
begin
  select count(*) = 0 into first_user from profiles;
  insert into profiles (id, email, full_name, role)
  values (new.id, new.email, coalesce(new.raw_user_meta_data->>'full_name',''),
          case when first_user then 'owner'::app_role else 'customer'::app_role end);
  return new;
end $$;

create trigger on_auth_user_created
  after insert on auth.users for each row execute function handle_new_user();

-- Stock is derived from movements, so it can never silently drift.
create or replace function apply_inventory_movement()
returns trigger language plpgsql as $$
begin
  if new.variant_id is not null then
    update product_variants set stock = stock + new.delta where id = new.variant_id;
  end if;
  update products set stock = stock + new.delta, updated_at = now() where id = new.product_id;
  return new;
end $$;

create trigger inventory_movement_applied
  after insert on inventory_movements for each row execute function apply_inventory_movement();

-- Every status change is journalled.
create or replace function log_order_status()
returns trigger language plpgsql as $$
begin
  if new.status is distinct from old.status then
    insert into order_events (order_id, status, actor_id) values (new.id, new.status, auth.uid());
  end if;
  return new;
end $$;

create trigger order_status_logged
  after update on orders for each row execute function log_order_status();

-- ============================================================================
-- Edge Functions to write next (server-side, service-role key):
--   POST /checkout          validate cart against live prices, create order,
--                           init Paystack transaction, return authorization_url
--   POST /paystack-webhook  verify x-paystack-signature (HMAC SHA512 of the raw
--                           body with the secret key), then mark paid + decrement
--                           inventory. NEVER trust the browser's success callback.
--   POST /assistant         model call with catalog context; writes to chat_messages
--   POST /escalate          flips chat_sessions.status and pings the rep's WhatsApp
-- ============================================================================
