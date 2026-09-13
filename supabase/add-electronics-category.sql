-- Run this once in the Supabase SQL editor against your LIVE project to add
-- the new "Electronics & Gadgets" category without re-running the full seed
-- file. Safe to run more than once (no-ops if the slug already exists).
insert into categories (id, slug, name, image_key, parent_id, featured, position)
values ('7e8619d3-d5fb-5351-9ee7-762e2d6ed169', 'electronics-gadgets', 'Electronics & Gadgets', 'tablet', null, true, 0)
on conflict (slug) do nothing;
