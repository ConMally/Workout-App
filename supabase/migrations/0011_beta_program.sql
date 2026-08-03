-- Phase 9: beta feedback, lightweight product analytics, crash reporting,
-- and a hidden admin dashboard. Additive only (every new column has a
-- default), so public.handle_new_user() (0001_init.sql) keeps working
-- unchanged and every existing row stays valid.

-- ---------------------------------------------------------------------------
-- profiles: admin flag + "never ask again" flag for the rating prompt.
-- Reuses the existing onboarding_completed convention (0002_profile_fields.sql)
-- rather than a new table for either of these single booleans/timestamps.
-- ---------------------------------------------------------------------------

alter table public.profiles
  add column is_admin boolean not null default false,
  add column feedback_prompt_dismissed_at timestamptz;

-- Lets an admin's own dashboard queries (app/admin/page.tsx) see every
-- user's profile/plan/history rows, which the base per-owner RLS from
-- 0001_init.sql otherwise restricts to "your own rows only." Safe against
-- recursion: the subquery resolves against the caller's own profiles row,
-- already visible via the pre-existing profiles_select_own policy, not by
-- re-invoking this same policy.
create policy "profiles_select_admin" on public.profiles
  for select using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin));
create policy "workout_plans_select_admin" on public.workout_plans
  for select using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin));
create policy "completed_workouts_select_admin" on public.completed_workouts
  for select using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin));
create policy "completed_workout_exercises_select_admin" on public.completed_workout_exercises
  for select using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin));

-- ---------------------------------------------------------------------------
-- feedback — bug reports, feature requests, general feedback, and star
-- ratings all share one table (distinguished by `type`) since they're the
-- same shape: who, what kind, optional message/rating, and where/when it
-- was submitted from. `screenshot_path` points into the feedback-screenshots
-- storage bucket below rather than storing the image itself.
-- ---------------------------------------------------------------------------

create table public.feedback (
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

create index feedback_user_id_idx on public.feedback (user_id);
create index feedback_created_at_idx on public.feedback (created_at desc);
create index feedback_type_idx on public.feedback (type);

alter table public.feedback enable row level security;

create policy "feedback_insert_own" on public.feedback
  for insert with check (auth.uid() = user_id);
create policy "feedback_select_own_or_admin" on public.feedback
  for select using (
    auth.uid() = user_id
    or exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin)
  );

-- ---------------------------------------------------------------------------
-- analytics_events — anonymous-in-content product usage events (PART 3:
-- "Do NOT collect personal workout data"). `properties` is a free-form
-- jsonb bag of small structural facts (counts, categories) — application
-- code is responsible for never putting exercise names, weights, or other
-- workout content into it. `event_name` is intentionally not constrained to
-- a fixed list (no check constraint) so new event types don't need a
-- migration — the canonical list lives in code
-- (types/analytics-events.ts#AnalyticsEventName).
-- ---------------------------------------------------------------------------

create table public.analytics_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users (id) on delete set null,
  event_name text not null,
  properties jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index analytics_events_user_id_idx on public.analytics_events (user_id);
create index analytics_events_event_name_idx on public.analytics_events (event_name);
create index analytics_events_created_at_idx on public.analytics_events (created_at desc);

alter table public.analytics_events enable row level security;

create policy "analytics_events_insert_own" on public.analytics_events
  for insert with check (auth.uid() = user_id);
create policy "analytics_events_select_admin" on public.analytics_events
  for select using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin));

-- ---------------------------------------------------------------------------
-- crash_reports — PART 6. One row per uncaught error an ErrorBoundary
-- catches. Never blocks the recovery UI on write success — see
-- components/ErrorBoundary.tsx.
-- ---------------------------------------------------------------------------

create table public.crash_reports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users (id) on delete set null,
  message text not null,
  stack text,
  component_name text,
  created_at timestamptz not null default now()
);

create index crash_reports_user_id_idx on public.crash_reports (user_id);
create index crash_reports_created_at_idx on public.crash_reports (created_at desc);

alter table public.crash_reports enable row level security;

create policy "crash_reports_insert_own" on public.crash_reports
  for insert with check (auth.uid() = user_id);
create policy "crash_reports_select_admin" on public.crash_reports
  for select using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin));

-- ---------------------------------------------------------------------------
-- Storage bucket for optional feedback screenshots (PART 2: "future-ready
-- architecture"). Private bucket — objects are namespaced by uploader id
-- (`{user_id}/{filename}`) so the same per-user + admin-read RLS shape as
-- every table above applies to files too.
-- ---------------------------------------------------------------------------

insert into storage.buckets (id, name, public)
values ('feedback-screenshots', 'feedback-screenshots', false)
on conflict (id) do nothing;

create policy "feedback_screenshots_insert_own" on storage.objects
  for insert with check (
    bucket_id = 'feedback-screenshots' and auth.uid()::text = (storage.foldername(name))[1]
  );
create policy "feedback_screenshots_select_own_or_admin" on storage.objects
  for select using (
    bucket_id = 'feedback-screenshots'
    and (
      auth.uid()::text = (storage.foldername(name))[1]
      or exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin)
    )
  );
