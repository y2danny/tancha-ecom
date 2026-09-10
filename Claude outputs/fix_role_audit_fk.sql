-- Fixes: deleting a user from auth.users cascades to their profiles row,
-- but role_audit still referenced that row with the default (blocking) FK
-- behavior -- so the delete failed with a foreign-key violation instead of
-- going through. Switches both to "on delete set null" so deleting a staff
-- member's account no longer gets blocked by their own audit history, and
-- the history itself isn't lost (from_role/to_role/created_at survive --
-- just the actor/subject link goes null).

alter table role_audit drop constraint if exists role_audit_actor_id_fkey;
alter table role_audit drop constraint if exists role_audit_subject_id_fkey;

alter table role_audit
  add constraint role_audit_actor_id_fkey
  foreign key (actor_id) references profiles(id) on delete set null;

alter table role_audit
  add constraint role_audit_subject_id_fkey
  foreign key (subject_id) references profiles(id) on delete set null;
