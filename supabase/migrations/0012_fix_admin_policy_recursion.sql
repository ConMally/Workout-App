-- Repair migration for 0011_beta_program.sql: fixes
-- "infinite recursion detected in policy for relation \"profiles\""
-- (Postgres error 42P17).
--
-- Every statement in this file is idempotent — safe to run more than once,
-- and safe to run regardless of exactly how much of 0011 committed before
-- the recursion error started surfacing (see the audit note near the
-- bottom of this file).

-- ---------------------------------------------------------------------------
-- Root cause
--
-- Eight policies created by 0011 checked admin status with an inline
-- subquery against public.profiles:
--
--   exists (
--     select 1 from public.profiles p
--     where p.id = auth.uid() and p.is_admin
--   )
--
-- One of those eight — profiles_select_admin — lives ON public.profiles
-- itself. Evaluating a SELECT against profiles requires evaluating every
-- SELECT policy on profiles, including profiles_select_admin; evaluating
-- *that* policy runs the subquery above, which is itself a SELECT against
-- profiles — requiring profiles_select_admin to be evaluated again, and
-- again, unbounded. Postgres detects this and rejects the query outright
-- with SQLSTATE 42P17 rather than actually recursing forever.
--
-- The other seven policies below don't reference themselves, but every one
-- of them still queries public.profiles to check is_admin, so every one of
-- them re-enters profiles' own (recursive) policy evaluation and fails the
-- exact same way:
--
--   1. profiles_select_admin                          on public.profiles
--   2. workout_plans_select_admin                      on public.workout_plans
--   3. completed_workouts_select_admin                 on public.completed_workouts
--   4. completed_workout_exercises_select_admin        on public.completed_workout_exercises
--   5. feedback_select_own_or_admin                    on public.feedback
--   6. analytics_events_select_admin                   on public.analytics_events
--   7. crash_reports_select_admin                      on public.crash_reports
--   8. feedback_screenshots_select_own_or_admin        on storage.objects
-- ---------------------------------------------------------------------------

-- ---------------------------------------------------------------------------
-- The fix: a SECURITY DEFINER helper function.
--
-- A SECURITY DEFINER function runs with the privileges of its owner — the
-- migration role, which owns public.profiles and (having never had FORCE
-- ROW LEVEL SECURITY set on that table) is not itself subject to profiles'
-- row-level security. So the `select ... from public.profiles` inside this
-- function never re-enters RLS evaluation on profiles at all — there is
-- nothing left to recurse into, which is what actually breaks the cycle
-- (wrapping the same subquery in a plain, non-definer function would not
-- fix this).
--
-- `set search_path = ''` plus fully schema-qualified identifiers
-- (public.profiles, auth.uid()) prevent search-path hijacking. `stable`
-- lets the planner evaluate it once per statement rather than once per row.
-- It deliberately takes no user-id argument — it only ever answers "is the
-- current session's authenticated user an admin," so it can never be
-- called with a client-supplied identity to check someone else's admin
-- status.
-- ---------------------------------------------------------------------------

create or replace function public.is_current_user_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    (select p.is_admin from public.profiles p where p.id = auth.uid()),
    false
  );
$$;

-- Newly created functions are PUBLIC-executable by default in Postgres;
-- tighten that down to signed-in users only.
revoke execute on function public.is_current_user_admin() from public;
grant execute on function public.is_current_user_admin() to authenticated;

-- ---------------------------------------------------------------------------
-- Audit / defensive re-assertion of 0011's non-destructive objects.
--
-- The recursion error is a *query-time* error, not a DDL-time one —
-- CREATE POLICY with a self-referential subquery is syntactically valid
-- and commits fine; the error only fires later when something actually
-- SELECTs from the protected table. That means 0011's CREATE TABLE/
-- CREATE INDEX/CREATE POLICY statements most likely all committed
-- successfully, and nothing here is expected to actually change anything.
-- Every statement below is included anyway, guarded with IF NOT EXISTS /
-- ON CONFLICT DO NOTHING, so this migration alone is sufficient to bring
-- the database to the correct final state even if 0011 had stopped partway
-- through for some other reason. Nothing here drops or alters existing
-- data.
-- ---------------------------------------------------------------------------

alter table public.profiles
  add column if not exists is_admin boolean not null default false,
  add column if not exists feedback_prompt_dismissed_at timestamptz;

create table if not exists public.feedback (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  type text not null check (type in ('bug', 'feature', 'general', 'rating')),
  message text check (message is null or char_length(message) <= 4000),
  rating integer check (rating is null or (rating between 1 and 5)),
  page text,
  app_version text,
  user_agent text,
  screenshot_path text,
  created_at timestamptz not null default now()
);

create index if not exists feedback_user_id_idx on public.feedback (user_id);
create index if not exists feedback_created_at_idx on public.feedback (created_at desc);
create index if not exists feedback_type_idx on public.feedback (type);

alter table public.feedback enable row level security;

create table if not exists public.analytics_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users (id) on delete set null,
  event_name text not null,
  properties jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists analytics_events_user_id_idx on public.analytics_events (user_id);
create index if not exists analytics_events_event_name_idx on public.analytics_events (event_name);
create index if not exists analytics_events_created_at_idx on public.analytics_events (created_at desc);

alter table public.analytics_events enable row level security;

create table if not exists public.crash_reports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users (id) on delete set null,
  message text not null,
  stack text,
  component_name text,
  created_at timestamptz not null default now()
);

create index if not exists crash_reports_user_id_idx on public.crash_reports (user_id);
create index if not exists crash_reports_created_at_idx on public.crash_reports (created_at desc);

alter table public.crash_reports enable row level security;

insert into storage.buckets (id, name, public)
values ('feedback-screenshots', 'feedback-screenshots', false)
on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- Replace every recursive admin-check policy with one that calls
-- public.is_current_user_admin() instead of inlining the subquery — same
-- policy names, same access rules, only the recursion-triggering
-- implementation changes. drop-then-create is the standard idempotent
-- pattern for policies (Postgres has no CREATE POLICY IF NOT EXISTS /
-- CREATE OR REPLACE POLICY).
--
-- Ordinary per-owner policies (profiles_select_own, profiles_insert_own,
-- workout_plans_select_own, etc. from 0001_init.sql, and every other
-- table's owner-only policies) are untouched — none of them reference
-- profiles or is_admin, so none of them were ever part of this recursion.
-- ---------------------------------------------------------------------------

drop policy if exists "profiles_select_admin" on public.profiles;
create policy "profiles_select_admin" on public.profiles
  for select using (public.is_current_user_admin());

drop policy if exists "workout_plans_select_admin" on public.workout_plans;
create policy "workout_plans_select_admin" on public.workout_plans
  for select using (public.is_current_user_admin());

drop policy if exists "completed_workouts_select_admin" on public.completed_workouts;
create policy "completed_workouts_select_admin" on public.completed_workouts
  for select using (public.is_current_user_admin());

drop policy if exists "completed_workout_exercises_select_admin" on public.completed_workout_exercises;
create policy "completed_workout_exercises_select_admin" on public.completed_workout_exercises
  for select using (public.is_current_user_admin());

drop policy if exists "feedback_select_own_or_admin" on public.feedback;
create policy "feedback_select_own_or_admin" on public.feedback
  for select using (auth.uid() = user_id or public.is_current_user_admin());

drop policy if exists "analytics_events_select_admin" on public.analytics_events;
create policy "analytics_events_select_admin" on public.analytics_events
  for select using (public.is_current_user_admin());

drop policy if exists "crash_reports_select_admin" on public.crash_reports;
create policy "crash_reports_select_admin" on public.crash_reports
  for select using (public.is_current_user_admin());

drop policy if exists "feedback_screenshots_select_own_or_admin" on storage.objects;
create policy "feedback_screenshots_select_own_or_admin" on storage.objects
  for select using (
    bucket_id = 'feedback-screenshots'
    and (
      auth.uid()::text = (storage.foldername(name))[1]
      or public.is_current_user_admin()
    )
  );

-- ---------------------------------------------------------------------------
-- Re-assert the non-admin, non-recursive policies from 0011 too (insert-
-- own policies never referenced profiles and were never part of the
-- recursion), purely so this migration alone is sufficient to reach the
-- correct final state regardless of exactly how far 0011 got.
-- ---------------------------------------------------------------------------

drop policy if exists "feedback_insert_own" on public.feedback;
create policy "feedback_insert_own" on public.feedback
  for insert with check (auth.uid() = user_id);

drop policy if exists "analytics_events_insert_own" on public.analytics_events;
create policy "analytics_events_insert_own" on public.analytics_events
  for insert with check (auth.uid() = user_id);

drop policy if exists "crash_reports_insert_own" on public.crash_reports;
create policy "crash_reports_insert_own" on public.crash_reports
  for insert with check (auth.uid() = user_id);

drop policy if exists "feedback_screenshots_insert_own" on storage.objects;
create policy "feedback_screenshots_insert_own" on storage.objects
  for insert with check (
    bucket_id = 'feedback-screenshots' and auth.uid()::text = (storage.foldername(name))[1]
  );
