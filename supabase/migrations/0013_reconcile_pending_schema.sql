-- Reconciliation migration. 0008-0011 apparently already applied
-- successfully against the live database (re-running them now fails with
-- "already exists"-style errors, which is exactly the symptom of trying to
-- CREATE something that's already there) and 0012 has already been applied
-- on top of them successfully. This migration does not assume that history
-- is correct, though — every statement below is a self-determining,
-- idempotent guard ("create if missing, otherwise no-op") so it reaches
-- the same correct end state regardless of exactly what already exists.
--
-- Per instruction: this does NOT modify or re-execute 0008_exercise_favorites.sql,
-- 0009_active_workout_focus_index.sql, 0010_settings_personalization.sql,
-- 0011_beta_program.sql, or 0012_fix_admin_policy_recursion.sql — those
-- files are left exactly as they are. This is new SQL that reconciles the
-- live schema with what the current application code
-- (types/database.ts + lib/repositories/**) expects.
--
-- Nothing here drops a table, column, bucket, or row, and
-- public.profiles/public.active_workouts/public.user_settings (all
-- pre-existing core tables) are only ever ALTERed for a missing column or
-- policy, never CREATEd or redefined.
--
-- See the accompanying report for the full audit: exactly which objects
-- this expects to already be present vs. is here purely as a safety net.

-- ---------------------------------------------------------------------------
-- 0008 — exercise_favorites (lib/repositories/supabase/exercise-favorite-repository.ts,
-- types/database.ts's `exercise_favorites` block). The (user_id, exercise_id)
-- unique constraint is required for that repository's
-- `.upsert(..., { onConflict: "user_id,exercise_id" })` call to work.
-- ---------------------------------------------------------------------------

create table if not exists public.exercise_favorites (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  exercise_id text not null check (char_length(exercise_id) between 1 and 200),
  created_at timestamptz not null default now(),
  unique (user_id, exercise_id)
);

create index if not exists exercise_favorites_user_id_idx on public.exercise_favorites (user_id);

alter table public.exercise_favorites enable row level security;

drop policy if exists "exercise_favorites_select_own" on public.exercise_favorites;
create policy "exercise_favorites_select_own" on public.exercise_favorites
  for select using (auth.uid() = user_id);

drop policy if exists "exercise_favorites_insert_own" on public.exercise_favorites;
create policy "exercise_favorites_insert_own" on public.exercise_favorites
  for insert with check (auth.uid() = user_id);

drop policy if exists "exercise_favorites_delete_own" on public.exercise_favorites;
create policy "exercise_favorites_delete_own" on public.exercise_favorites
  for delete using (auth.uid() = user_id);

-- No update policy — matches 0008's original design (a favorite is either
-- present or absent; toggling is insert/delete, never update).

-- ---------------------------------------------------------------------------
-- 0009 — active_workouts.active_exercise_index
-- (types/workout-log.ts's ActiveWorkout#activeExerciseIndex,
-- lib/repositories/supabase/active-workout-repository.ts). Postgres has no
-- `ADD CONSTRAINT IF NOT EXISTS`, so the check constraint is guarded with a
-- duplicate_object exception instead — the standard idempotent pattern for
-- named constraints.
-- ---------------------------------------------------------------------------

alter table public.active_workouts
  add column if not exists active_exercise_index integer;

do $$
begin
  alter table public.active_workouts
    add constraint active_workouts_active_exercise_index_check
    check (active_exercise_index is null or active_exercise_index >= 0);
exception
  when duplicate_object then null;
end $$;

-- ---------------------------------------------------------------------------
-- 0010 — user_settings personalization columns (types/workout-log.ts's
-- AppSettings, lib/repositories/supabase/settings-repository.ts). Each
-- ADD COLUMN IF NOT EXISTS carries its original default/check so a column
-- created fresh here ends up identical to one created by 0010.
-- ---------------------------------------------------------------------------

alter table public.user_settings
  add column if not exists timer_sound boolean not null default true,
  add column if not exists vibration boolean not null default true,
  add column if not exists default_rest_seconds integer not null default 90
    check (default_rest_seconds between 0 and 600),
  add column if not exists show_exercise_guide_automatically boolean not null default true,
  add column if not exists dark_mode boolean not null default false,
  add column if not exists compact_mode boolean not null default false,
  add column if not exists larger_text boolean not null default false,
  add column if not exists workout_reminders boolean not null default false,
  add column if not exists weekly_summary boolean not null default false,
  add column if not exists streak_reminders boolean not null default false;

-- ---------------------------------------------------------------------------
-- 0011 — profiles admin/feedback-prompt columns
-- (lib/repositories/profile-repository.ts's Profile#isAdmin/
-- feedback_prompt_dismissed_at). public.profiles itself is a pre-existing
-- core table (0001_init.sql) and is only ever ALTERed here, never recreated.
-- ---------------------------------------------------------------------------

alter table public.profiles
  add column if not exists is_admin boolean not null default false,
  add column if not exists feedback_prompt_dismissed_at timestamptz;

-- ---------------------------------------------------------------------------
-- 0012 — the non-recursive admin-check helper. `create or replace function`
-- is naturally idempotent. Included here so 0013 is a complete, correct
-- statement of the current desired end state on its own — this is the same
-- definition 0012 already applied successfully, not a new or different
-- one, and never the broken pre-0012 inline-subquery version.
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

revoke execute on function public.is_current_user_admin() from public;
grant execute on function public.is_current_user_admin() to authenticated;

-- ---------------------------------------------------------------------------
-- 0011 — feedback / analytics_events / crash_reports tables + indexes +
-- RLS enable, and the feedback-screenshots storage bucket.
-- ---------------------------------------------------------------------------

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
-- Admin-bypass and owner policies for the 0011 tables/bucket, plus the
-- profiles/workout_plans/completed_workouts/completed_workout_exercises
-- admin-bypass policies. Every admin check below calls
-- public.is_current_user_admin() — the fixed, non-recursive form from
-- 0012 — never the original inline subquery. This section intentionally
-- reproduces 0012's already-applied policy definitions (guarded, so
-- reapplying them is a safe no-op) rather than skipping them, so this
-- migration alone is sufficient to reach the correct end state even if run
-- in isolation.
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

drop policy if exists "feedback_insert_own" on public.feedback;
create policy "feedback_insert_own" on public.feedback
  for insert with check (auth.uid() = user_id);

drop policy if exists "feedback_select_own_or_admin" on public.feedback;
create policy "feedback_select_own_or_admin" on public.feedback
  for select using (auth.uid() = user_id or public.is_current_user_admin());

drop policy if exists "analytics_events_insert_own" on public.analytics_events;
create policy "analytics_events_insert_own" on public.analytics_events
  for insert with check (auth.uid() = user_id);

drop policy if exists "analytics_events_select_admin" on public.analytics_events;
create policy "analytics_events_select_admin" on public.analytics_events
  for select using (public.is_current_user_admin());

drop policy if exists "crash_reports_insert_own" on public.crash_reports;
create policy "crash_reports_insert_own" on public.crash_reports
  for insert with check (auth.uid() = user_id);

drop policy if exists "crash_reports_select_admin" on public.crash_reports;
create policy "crash_reports_select_admin" on public.crash_reports
  for select using (public.is_current_user_admin());

drop policy if exists "feedback_screenshots_insert_own" on storage.objects;
create policy "feedback_screenshots_insert_own" on storage.objects
  for insert with check (
    bucket_id = 'feedback-screenshots' and auth.uid()::text = (storage.foldername(name))[1]
  );

drop policy if exists "feedback_screenshots_select_own_or_admin" on storage.objects;
create policy "feedback_screenshots_select_own_or_admin" on storage.objects
  for select using (
    bucket_id = 'feedback-screenshots'
    and (
      auth.uid()::text = (storage.foldername(name))[1]
      or public.is_current_user_admin()
    )
  );
