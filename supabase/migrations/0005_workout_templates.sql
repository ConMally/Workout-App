-- Phase 4A: reusable, user-authored workout templates — distinct from
-- workout_plans (the currently-active, AI-generated weekly plan). A
-- template is a saved blueprint a user can create from scratch, edit, or
-- generate a fresh plan from at any time.
--
-- Every child table carries its own user_id (not just template_id/
-- template_day_id) and its own created_at/updated_at + trigger, matching
-- every other child table in this schema (see workout_plan_days /
-- workout_plan_exercises in 0001_init.sql) — RLS policies never need to
-- join through a parent table to find the owning user.

create table public.workout_templates (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 120),
  description text check (description is null or char_length(description) <= 1000),
  goal text not null,
  days_per_week integer not null check (days_per_week between 1 and 7),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index workout_templates_user_id_idx on public.workout_templates (user_id);

create trigger set_workout_templates_updated_at
  before update on public.workout_templates
  for each row execute function public.set_updated_at();

create table public.workout_template_days (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  template_id uuid not null references public.workout_templates (id) on delete cascade,
  day_number integer not null check (day_number >= 0),
  day_name text not null,
  focus text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (template_id, day_number)
);

create index workout_template_days_template_id_idx on public.workout_template_days (template_id);
create index workout_template_days_user_id_idx on public.workout_template_days (user_id);

create trigger set_workout_template_days_updated_at
  before update on public.workout_template_days
  for each row execute function public.set_updated_at();

create table public.workout_template_exercises (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  template_day_id uuid not null references public.workout_template_days (id) on delete cascade,
  exercise_name text not null,
  sets integer not null check (sets between 1 and 10),
  reps text not null,
  rest_seconds integer not null check (rest_seconds between 0 and 600),
  notes text not null default '',
  order_index integer not null check (order_index >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (template_day_id, order_index)
);

create index workout_template_exercises_template_day_id_idx on public.workout_template_exercises (template_day_id);
create index workout_template_exercises_user_id_idx on public.workout_template_exercises (user_id);

create trigger set_workout_template_exercises_updated_at
  before update on public.workout_template_exercises
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Row Level Security — same auth.uid() = user_id pattern as every other
-- owned table (see 0001_init.sql's top-level RLS comment).
-- ---------------------------------------------------------------------------

alter table public.workout_templates enable row level security;
alter table public.workout_template_days enable row level security;
alter table public.workout_template_exercises enable row level security;

create policy "workout_templates_select_own" on public.workout_templates
  for select using (auth.uid() = user_id);
create policy "workout_templates_insert_own" on public.workout_templates
  for insert with check (auth.uid() = user_id);
create policy "workout_templates_update_own" on public.workout_templates
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "workout_templates_delete_own" on public.workout_templates
  for delete using (auth.uid() = user_id);

create policy "workout_template_days_select_own" on public.workout_template_days
  for select using (auth.uid() = user_id);
create policy "workout_template_days_insert_own" on public.workout_template_days
  for insert with check (auth.uid() = user_id);
create policy "workout_template_days_update_own" on public.workout_template_days
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "workout_template_days_delete_own" on public.workout_template_days
  for delete using (auth.uid() = user_id);

create policy "workout_template_exercises_select_own" on public.workout_template_exercises
  for select using (auth.uid() = user_id);
create policy "workout_template_exercises_insert_own" on public.workout_template_exercises
  for insert with check (auth.uid() = user_id);
create policy "workout_template_exercises_update_own" on public.workout_template_exercises
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "workout_template_exercises_delete_own" on public.workout_template_exercises
  for delete using (auth.uid() = user_id);
