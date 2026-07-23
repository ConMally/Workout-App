-- Adds the profile fields needed for account/profile management. Additive
-- only — every new column has a default, so the existing
-- public.handle_new_user() trigger (from 0001_init.sql) keeps working
-- unchanged and continues to populate a full, valid profiles row the
-- instant someone signs up.

alter table public.profiles
  add column preferred_weight_unit text not null default 'lbs' check (preferred_weight_unit in ('lbs', 'kg')),
  add column experience_level text check (experience_level in ('beginner', 'intermediate', 'advanced')),
  add column weekly_training_target integer check (weekly_training_target is null or weekly_training_target between 1 and 7),
  add column onboarding_completed boolean not null default false;

comment on column public.profiles.preferred_weight_unit is
  'Mirrors user_settings.weight_unit today by design — both exist while the app is localStorage-first; a future phase should decide which one is the source of truth.';
