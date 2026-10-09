-- Run once in the Supabase SQL editor against your LIVE project.
-- Stores the two things the admin Orders screen needs that weren't being
-- saved: the customer's email, and which size/colour they picked. Safe to
-- run more than once. Orders placed before this have neither — the admin
-- screen falls back to the variant's current label for those.
alter table orders add column if not exists email text;
alter table order_items add column if not exists variant_label text;
