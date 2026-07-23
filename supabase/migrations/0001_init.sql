-- AI Workout Plan Generator — initial cloud schema
--
-- Mirrors the existing localStorage domain (lib/storage.ts, types/*.ts) so a
-- future repository implementation can move data 1:1. Nothing in the app
-- reads or writes these tables yet — see docs/SUPABASE.md.
--
-- Run this once against a fresh Supabase project, either by pasting it into
-- the SQL Editor in the dashboard, or with `supabase db push` (see
-- docs/SUPABASE.md for both paths).

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- updated_at helper — attached as a BEFORE UPDATE trigger to every table
-- below that has an updated_at column.
-- ---------------------------------------------------------------------------

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- profiles — one row per authenticated user, id IS the auth.users id.
-- ---------------------------------------------------------------------------

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger set_profiles_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- workout_plans / workout_plan_days / workout_plan_exercises
-- Mirrors OnboardingInput + WorkoutPlan (lib/schemas.ts). warmup/cooldown
-- are simple {name, duration}[] display lists, stored as JSONB rather than
-- a further relational table.
-- ---------------------------------------------------------------------------

create table public.workout_plans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  goal text not null,
  experience_level text not null,
  days_per_week integer not null check (days_per_week between 1 and 7),
  equipment text[] not null default '{}',
  session_duration_minutes integer not null check (session_duration_minutes between 10 and 180),
  injuries_or_limitations text not null default '',
  exercise_preferences text not null default '',
  progression_guidance text[] not null default '{}',
  safety_notes text[] not null default '{}',
  injury_warning text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Only one active plan per user at a time (mirrors the localStorage model,
-- which only ever holds a single saved plan).
create unique index workout_plans_one_active_per_user
  on public.workout_plans (user_id)
  where is_active;

create index workout_plans_user_id_idx on public.workout_plans (user_id);

create trigger set_workout_plans_updated_at
  before update on public.workout_plans
  for each row execute function public.set_updated_at();

create table public.workout_plan_days (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  workout_plan_id uuid not null references public.workout_plans (id) on delete cascade,
  day_index integer not null check (day_index >= 0),
  day_label text not null,
  title text not null,
  focus text not null,
  estimated_duration_minutes integer not null check (estimated_duration_minutes > 0),
  warmup jsonb not null default '[]',
  cooldown jsonb not null default '[]',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workout_plan_id, day_index)
);

create index workout_plan_days_plan_id_idx on public.workout_plan_days (workout_plan_id);
create index workout_plan_days_user_id_idx on public.workout_plan_days (user_id);

create trigger set_workout_plan_days_updated_at
  before update on public.workout_plan_days
  for each row execute function public.set_updated_at();

create table public.workout_plan_exercises (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  workout_plan_day_id uuid not null references public.workout_plan_days (id) on delete cascade,
  sort_order integer not null check (sort_order >= 0),
  name text not null,
  sets integer not null check (sets between 1 and 10),
  reps text not null,
  rest_seconds integer not null check (rest_seconds between 0 and 600),
  notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workout_plan_day_id, sort_order)
);

create index workout_plan_exercises_day_id_idx on public.workout_plan_exercises (workout_plan_day_id);
create index workout_plan_exercises_user_id_idx on public.workout_plan_exercises (user_id);

create trigger set_workout_plan_exercises_updated_at
  before update on public.workout_plan_exercises
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- active_workouts / active_workout_exercises / active_workout_sets
-- Mirrors ActiveWorkout (types/workout-log.ts). At most one per user, same
-- as the localStorage model.
-- ---------------------------------------------------------------------------

create table public.active_workouts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users (id) on delete cascade,
  workout_plan_id uuid references public.workout_plans (id) on delete set null,
  day_index integer not null check (day_index >= 0),
  day_label text not null,
  day_title text not null,
  day_focus text not null,
  started_at timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger set_active_workouts_updated_at
  before update on public.active_workouts
  for each row execute function public.set_updated_at();

create table public.active_workout_exercises (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  active_workout_id uuid not null references public.active_workouts (id) on delete cascade,
  sort_order integer not null check (sort_order >= 0),
  name text not null,
  target_sets integer not null check (target_sets >= 1),
  target_reps text not null,
  target_rest_seconds integer not null check (target_rest_seconds >= 0),
  completed boolean not null default false,
  note text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (active_workout_id, sort_order)
);

create index active_workout_exercises_workout_id_idx on public.active_workout_exercises (active_workout_id);
create index active_workout_exercises_user_id_idx on public.active_workout_exercises (user_id);

create trigger set_active_workout_exercises_updated_at
  before update on public.active_workout_exercises
  for each row execute function public.set_updated_at();

create table public.active_workout_sets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  active_workout_exercise_id uuid not null references public.active_workout_exercises (id) on delete cascade,
  set_number integer not null check (set_number >= 1),
  weight numeric(7, 2) check (weight is null or (weight >= 0 and weight <= 2000)),
  reps integer check (reps is null or (reps >= 0 and reps <= 200)),
  completed boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (active_workout_exercise_id, set_number)
);

create index active_workout_sets_exercise_id_idx on public.active_workout_sets (active_workout_exercise_id);
create index active_workout_sets_user_id_idx on public.active_workout_sets (user_id);

create trigger set_active_workout_sets_updated_at
  before update on public.active_workout_sets
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- completed_workouts / completed_workout_exercises / completed_workout_sets
-- Mirrors CompletedWorkout (types/workout-log.ts).
-- ---------------------------------------------------------------------------

create table public.completed_workouts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  workout_plan_id uuid references public.workout_plans (id) on delete set null,
  day_index integer not null check (day_index >= 0),
  day_label text not null,
  day_title text not null,
  day_focus text not null,
  completed_at timestamptz not null,
  duration_seconds integer check (duration_seconds is null or duration_seconds >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- The primary access pattern is "list my history, newest first".
create index completed_workouts_user_completed_at_idx
  on public.completed_workouts (user_id, completed_at desc);

create trigger set_completed_workouts_updated_at
  before update on public.completed_workouts
  for each row execute function public.set_updated_at();

create table public.completed_workout_exercises (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  completed_workout_id uuid not null references public.completed_workouts (id) on delete cascade,
  sort_order integer not null check (sort_order >= 0),
  name text not null,
  target_sets integer not null check (target_sets >= 1),
  target_reps text not null,
  target_rest_seconds integer not null check (target_rest_seconds >= 0),
  completed boolean not null default false,
  note text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (completed_workout_id, sort_order)
);

-- Exercise-history lookups (Strength Progress, Exercise Progress Detail)
-- filter by name across all of a user's completed workouts.
create index completed_workout_exercises_user_name_idx
  on public.completed_workout_exercises (user_id, name);
create index completed_workout_exercises_workout_id_idx
  on public.completed_workout_exercises (completed_workout_id);

create trigger set_completed_workout_exercises_updated_at
  before update on public.completed_workout_exercises
  for each row execute function public.set_updated_at();

create table public.completed_workout_sets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  completed_workout_exercise_id uuid not null references public.completed_workout_exercises (id) on delete cascade,
  set_number integer not null check (set_number >= 1),
  weight numeric(7, 2) check (weight is null or (weight >= 0 and weight <= 2000)),
  reps integer check (reps is null or (reps >= 0 and reps <= 200)),
  completed boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (completed_workout_exercise_id, set_number)
);

create index completed_workout_sets_exercise_id_idx
  on public.completed_workout_sets (completed_workout_exercise_id);
create index completed_workout_sets_user_id_idx on public.completed_workout_sets (user_id);

create trigger set_completed_workout_sets_updated_at
  before update on public.completed_workout_sets
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- personal_records — currently recomputed on the fly by
-- lib/progression.ts#detectPersonalRecords; this table is where a future
-- cloud implementation would persist that same output instead of
-- recalculating over full history on every load. Nothing writes here yet.
-- ---------------------------------------------------------------------------

create table public.personal_records (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  completed_workout_id uuid references public.completed_workouts (id) on delete cascade,
  exercise_name text not null,
  record_type text not null check (record_type in ('heaviest_weight', 'most_reps_at_weight', 'estimated_one_rep_max')),
  value numeric(8, 2) not null,
  previous_value numeric(8, 2) not null default 0,
  achieved_at timestamptz not null,
  created_at timestamptz not null default now()
);

create index personal_records_user_achieved_idx
  on public.personal_records (user_id, achieved_at desc);
create index personal_records_user_exercise_idx
  on public.personal_records (user_id, exercise_name, achieved_at desc);
create index personal_records_workout_id_idx
  on public.personal_records (completed_workout_id);

-- ---------------------------------------------------------------------------
-- goals — mirrors GoalSchema (types/goals.ts). Deliberately does not store
-- current value or progress percentage: those are always computed live
-- from completed_workouts, matching lib/goals.ts's existing philosophy.
-- ---------------------------------------------------------------------------

create table public.goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  type text not null check (type in ('exercise_weight', 'exercise_one_rep_max', 'workout_count', 'weekly_frequency', 'streak')),
  title text not null check (char_length(title) between 1 and 120),
  exercise_name text,
  target_value numeric(8, 2) not null check (target_value > 0),
  target_date date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index goals_user_id_idx on public.goals (user_id);

create trigger set_goals_updated_at
  before update on public.goals
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- readiness_checkins — mirrors ReadinessSchema (types/workout-log.ts),
-- normalized out of completed_workouts into its own 1:1 table.
-- ---------------------------------------------------------------------------

create table public.readiness_checkins (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  completed_workout_id uuid not null unique references public.completed_workouts (id) on delete cascade,
  difficulty integer check (difficulty is null or difficulty between 1 and 10),
  energy integer check (energy is null or energy between 1 and 10),
  soreness integer check (soreness is null or soreness between 1 and 10),
  sleep_quality integer check (sleep_quality is null or sleep_quality between 1 and 10),
  satisfaction integer check (satisfaction is null or satisfaction between 1 and 10),
  created_at timestamptz not null default now()
);

create index readiness_checkins_user_id_idx on public.readiness_checkins (user_id);

-- ---------------------------------------------------------------------------
-- exercise_notes — new concept, not used by any current app feature yet.
-- A standalone per-exercise journal, distinct from the per-set "note" field
-- already embedded on logged exercises.
-- ---------------------------------------------------------------------------

create table public.exercise_notes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  exercise_name text not null,
  note text not null check (char_length(note) <= 2000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index exercise_notes_user_exercise_idx on public.exercise_notes (user_id, exercise_name);

create trigger set_exercise_notes_updated_at
  before update on public.exercise_notes
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- user_settings — mirrors AppSettings (types/workout-log.ts). One row per
-- user; user_id is the primary key.
-- ---------------------------------------------------------------------------

create table public.user_settings (
  user_id uuid primary key references auth.users (id) on delete cascade,
  auto_start_rest_timer boolean not null default true,
  weight_unit text not null default 'lbs' check (weight_unit in ('lbs', 'kg')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger set_user_settings_updated_at
  before update on public.user_settings
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- migration_status — tracks each user's future one-time localStorage ->
-- cloud import. Not written to by anything yet; this phase does not move
-- any data.
-- ---------------------------------------------------------------------------

create table public.migration_status (
  user_id uuid primary key references auth.users (id) on delete cascade,
  status text not null default 'not_started' check (status in ('not_started', 'in_progress', 'completed', 'failed')),
  started_at timestamptz,
  completed_at timestamptz,
  item_counts jsonb,
  error_message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger set_migration_status_updated_at
  before update on public.migration_status
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Row Level Security — every table above holds only per-user data. Every
-- policy checks auth.uid() against a user_id (or id, for the tables keyed
-- directly by user id) column already present on that same row — no joins
-- through parent tables, and WITH CHECK means a client can never insert or
-- update a row claiming a different owner than their own session.
-- ---------------------------------------------------------------------------

alter table public.profiles enable row level security;
alter table public.workout_plans enable row level security;
alter table public.workout_plan_days enable row level security;
alter table public.workout_plan_exercises enable row level security;
alter table public.active_workouts enable row level security;
alter table public.active_workout_exercises enable row level security;
alter table public.active_workout_sets enable row level security;
alter table public.completed_workouts enable row level security;
alter table public.completed_workout_exercises enable row level security;
alter table public.completed_workout_sets enable row level security;
alter table public.personal_records enable row level security;
alter table public.goals enable row level security;
alter table public.readiness_checkins enable row level security;
alter table public.exercise_notes enable row level security;
alter table public.user_settings enable row level security;
alter table public.migration_status enable row level security;

-- profiles (owner column is `id`, not `user_id`)
create policy "profiles_select_own" on public.profiles for select using (auth.uid() = id);
create policy "profiles_insert_own" on public.profiles for insert with check (auth.uid() = id);
create policy "profiles_update_own" on public.profiles for update using (auth.uid() = id) with check (auth.uid() = id);
create policy "profiles_delete_own" on public.profiles for delete using (auth.uid() = id);

-- user_settings (owner column is `user_id`, which is also the primary key)
create policy "user_settings_select_own" on public.user_settings for select using (auth.uid() = user_id);
create policy "user_settings_insert_own" on public.user_settings for insert with check (auth.uid() = user_id);
create policy "user_settings_update_own" on public.user_settings for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "user_settings_delete_own" on public.user_settings for delete using (auth.uid() = user_id);

-- migration_status (owner column is `user_id`, which is also the primary key)
create policy "migration_status_select_own" on public.migration_status for select using (auth.uid() = user_id);
create policy "migration_status_insert_own" on public.migration_status for insert with check (auth.uid() = user_id);
create policy "migration_status_update_own" on public.migration_status for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "migration_status_delete_own" on public.migration_status for delete using (auth.uid() = user_id);

-- Every remaining table follows the identical `user_id` pattern.
do $$
declare
  target text;
  owned_tables text[] := array[
    'workout_plans',
    'workout_plan_days',
    'workout_plan_exercises',
    'active_workouts',
    'active_workout_exercises',
    'active_workout_sets',
    'completed_workouts',
    'completed_workout_exercises',
    'completed_workout_sets',
    'personal_records',
    'goals',
    'readiness_checkins',
    'exercise_notes'
  ];
begin
  foreach target in array owned_tables loop
    execute format(
      'create policy "%1$s_select_own" on public.%1$s for select using (auth.uid() = user_id);',
      target
    );
    execute format(
      'create policy "%1$s_insert_own" on public.%1$s for insert with check (auth.uid() = user_id);',
      target
    );
    execute format(
      'create policy "%1$s_update_own" on public.%1$s for update using (auth.uid() = user_id) with check (auth.uid() = user_id);',
      target
    );
    execute format(
      'create policy "%1$s_delete_own" on public.%1$s for delete using (auth.uid() = user_id);',
      target
    );
  end loop;
end $$;

-- ---------------------------------------------------------------------------
-- New-user bootstrap — creates a profile, default settings, and a
-- migration_status row the moment someone signs up via Supabase Auth.
-- Dormant until a login page starts calling supabase.auth.signUp().
-- ---------------------------------------------------------------------------

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id) values (new.id);
  insert into public.user_settings (user_id) values (new.id);
  insert into public.migration_status (user_id) values (new.id);
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
