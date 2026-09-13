-- Run this once in the Supabase SQL editor against your LIVE project to add
-- the three new categories without re-running the full seed file. Safe to
-- run more than once (no-ops if a slug already exists).
insert into categories (id, slug, name, image_key, parent_id, featured, position)
values ('c759a822-710a-591b-9ce7-3890cc4619ce', 'phones-accessories', 'Phones & Accessories', 'phone', null, true, 0)
on conflict (slug) do nothing;

insert into categories (id, slug, name, image_key, parent_id, featured, position)
values ('02df5b4b-172f-54ac-a091-e92ea474ec44', 'home-kitchen', 'Home & Kitchen', 'cookware', null, true, 0)
on conflict (slug) do nothing;

insert into categories (id, slug, name, image_key, parent_id, featured, position)
values ('37f12991-1e1d-500f-aaed-ec47c82fe1d2', 'fashion-beauty', 'Fashion & Beauty', 'beauty', null, true, 0)
on conflict (slug) do nothing;
