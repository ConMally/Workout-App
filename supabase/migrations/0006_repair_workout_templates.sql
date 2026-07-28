-- Phase 4A repair: 0005_workout_templates.sql apparently already ran
-- (fully or partially) against this database before this file existed.
-- Every statement below is idempotent and safe to run any number of times:
-- no table is dropped, no row is deleted, and no destructive rewrite is
-- performed. Existing objects that already match the intended definition
-- are left untouched (skipped); anything missing is created; policies and
-- triggers are replaced via drop-then-recreate so they can never drift
-- from the definition below, without touching table data.

-- ---------------------------------------------------------------------------
-- 0. Support function — created in 0001_init.sql; restated here with
-- create or replace (itself idempotent) so this repair file doesn't
-- silently depend on 0001 having run cleanly.
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
-- 1. Tables — created only if genuinely missing. If a table already
-- exists, Postgres created it atomically via a single successful CREATE
-- TABLE, so its originally-specified columns and inline constraints are
-- already present; this does not attempt to rewrite an existing table.
-- ---------------------------------------------------------------------------

create table if not exists public.workout_templates (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 120),
  description text check (description is null or char_length(description) <= 1000),
  goal text not null,
  days_per_week integer not null check (days_per_week between 1 and 7),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.workout_template_days (
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

create table if not exists public.workout_template_exercises (
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

-- ---------------------------------------------------------------------------
-- 2. Defensive column backfill — only for columns that carry a safe
-- default, so this can never fail against a table that already has rows.
-- Columns with no default (id/user_id/name/goal/... ) are guaranteed
-- present by step 1's atomic CREATE TABLE if the table exists at all, and
-- are not independently re-added here.
-- ---------------------------------------------------------------------------

alter table public.workout_templates
  add column if not exists created_at timestamptz not null default now();
alter table public.workout_templates
  add column if not exists updated_at timestamptz not null default now();

alter table public.workout_template_days
  add column if not exists focus text not null default '';
alter table public.workout_template_days
  add column if not exists created_at timestamptz not null default now();
alter table public.workout_template_days
  add column if not exists updated_at timestamptz not null default now();

alter table public.workout_template_exercises
  add column if not exists notes text not null default '';
alter table public.workout_template_exercises
  add column if not exists created_at timestamptz not null default now();
alter table public.workout_template_exercises
  add column if not exists updated_at timestamptz not null default now();

-- ---------------------------------------------------------------------------
-- 3. Foreign keys, checks, and unique constraints — added only if a
-- constraint on that exact table is genuinely missing. Named explicitly so
-- re-runs can check for them by name rather than guessing at
-- auto-generated names.
-- ---------------------------------------------------------------------------

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'workout_templates_user_id_fkey'
      and conrelid = 'public.workout_templates'::regclass
  ) then
    alter table public.workout_templates
      add constraint workout_templates_user_id_fkey
      foreign key (user_id) references auth.users (id) on delete cascade;
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'workout_templates_name_check'
      and conrelid = 'public.workout_templates'::regclass
  ) then
    alter table public.workout_templates
      add constraint workout_templates_name_check
      check (char_length(name) between 1 and 120);
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'workout_templates_description_check'
      and conrelid = 'public.workout_templates'::regclass
  ) then
    alter table public.workout_templates
      add constraint workout_templates_description_check
      check (description is null or char_length(description) <= 1000);
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'workout_templates_days_per_week_check'
      and conrelid = 'public.workout_templates'::regclass
  ) then
    alter table public.workout_templates
      add constraint workout_templates_days_per_week_check
      check (days_per_week between 1 and 7);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'workout_template_days_user_id_fkey'
      and conrelid = 'public.workout_template_days'::regclass
  ) then
    alter table public.workout_template_days
      add constraint workout_template_days_user_id_fkey
      foreign key (user_id) references auth.users (id) on delete cascade;
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'workout_template_days_template_id_fkey'
      and conrelid = 'public.workout_template_days'::regclass
  ) then
    alter table public.workout_template_days
      add constraint workout_template_days_template_id_fkey
      foreign key (template_id) references public.workout_templates (id) on delete cascade;
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'workout_template_days_day_number_check'
      and conrelid = 'public.workout_template_days'::regclass
  ) then
    alter table public.workout_template_days
      add constraint workout_template_days_day_number_check
      check (day_number >= 0);
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'workout_template_days_template_id_day_number_key'
      and conrelid = 'public.workout_template_days'::regclass
  ) then
    alter table public.workout_template_days
      add constraint workout_template_days_template_id_day_number_key
      unique (template_id, day_number);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'workout_template_exercises_user_id_fkey'
      and conrelid = 'public.workout_template_exercises'::regclass
  ) then
    alter table public.workout_template_exercises
      add constraint workout_template_exercises_user_id_fkey
      foreign key (user_id) references auth.users (id) on delete cascade;
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'workout_template_exercises_template_day_id_fkey'
      and conrelid = 'public.workout_template_exercises'::regclass
  ) then
    alter table public.workout_template_exercises
      add constraint workout_template_exercises_template_day_id_fkey
      foreign key (template_day_id) references public.workout_template_days (id) on delete cascade;
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'workout_template_exercises_sets_check'
      and conrelid = 'public.workout_template_exercises'::regclass
  ) then
    alter table public.workout_template_exercises
      add constraint workout_template_exercises_sets_check
      check (sets between 1 and 10);
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'workout_template_exercises_rest_seconds_check'
      and conrelid = 'public.workout_template_exercises'::regclass
  ) then
    alter table public.workout_template_exercises
      add constraint workout_template_exercises_rest_seconds_check
      check (rest_seconds between 0 and 600);
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'workout_template_exercises_order_index_check'
      and conrelid = 'public.workout_template_exercises'::regclass
  ) then
    alter table public.workout_template_exercises
      add constraint workout_template_exercises_order_index_check
      check (order_index >= 0);
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'workout_template_exercises_template_day_id_order_index_key'
      and conrelid = 'public.workout_template_exercises'::regclass
  ) then
    alter table public.workout_template_exercises
      add constraint workout_template_exercises_template_day_id_order_index_key
      unique (template_day_id, order_index);
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- 4. Indexes — CREATE INDEX IF NOT EXISTS is natively idempotent.
-- ---------------------------------------------------------------------------

create index if not exists workout_templates_user_id_idx
  on public.workout_templates (user_id);

create index if not exists workout_template_days_template_id_idx
  on public.workout_template_days (template_id);
create index if not exists workout_template_days_user_id_idx
  on public.workout_template_days (user_id);

create index if not exists workout_template_exercises_template_day_id_idx
  on public.workout_template_exercises (template_day_id);
create index if not exists workout_template_exercises_user_id_idx
  on public.workout_template_exercises (user_id);

-- ---------------------------------------------------------------------------
-- 5. updated_at triggers — dropped and recreated so they always match this
-- definition exactly, regardless of what (if anything) existed before.
-- ---------------------------------------------------------------------------

drop trigger if exists set_workout_templates_updated_at on public.workout_templates;
create trigger set_workout_templates_updated_at
  before update on public.workout_templates
  for each row execute function public.set_updated_at();

drop trigger if exists set_workout_template_days_updated_at on public.workout_template_days;
create trigger set_workout_template_days_updated_at
  before update on public.workout_template_days
  for each row execute function public.set_updated_at();

drop trigger if exists set_workout_template_exercises_updated_at on public.workout_template_exercises;
create trigger set_workout_template_exercises_updated_at
  before update on public.workout_template_exercises
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- 6. Row Level Security — enabling an already-enabled table is a no-op.
-- Policies are dropped and recreated so they always match this definition
-- exactly; this only ever changes policy definitions, never table data,
-- and never widens access (every policy still checks auth.uid() = user_id).
-- ---------------------------------------------------------------------------

alter table public.workout_templates enable row level security;
alter table public.workout_template_days enable row level security;
alter table public.workout_template_exercises enable row level security;

drop policy if exists "workout_templates_select_own" on public.workout_templates;
create policy "workout_templates_select_own" on public.workout_templates
  for select using (auth.uid() = user_id);
drop policy if exists "workout_templates_insert_own" on public.workout_templates;
create policy "workout_templates_insert_own" on public.workout_templates
  for insert with check (auth.uid() = user_id);
drop policy if exists "workout_templates_update_own" on public.workout_templates;
create policy "workout_templates_update_own" on public.workout_templates
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "workout_templates_delete_own" on public.workout_templates;
create policy "workout_templates_delete_own" on public.workout_templates
  for delete using (auth.uid() = user_id);

drop policy if exists "workout_template_days_select_own" on public.workout_template_days;
create policy "workout_template_days_select_own" on public.workout_template_days
  for select using (auth.uid() = user_id);
drop policy if exists "workout_template_days_insert_own" on public.workout_template_days;
create policy "workout_template_days_insert_own" on public.workout_template_days
  for insert with check (auth.uid() = user_id);
drop policy if exists "workout_template_days_update_own" on public.workout_template_days;
create policy "workout_template_days_update_own" on public.workout_template_days
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "workout_template_days_delete_own" on public.workout_template_days;
create policy "workout_template_days_delete_own" on public.workout_template_days
  for delete using (auth.uid() = user_id);

drop policy if exists "workout_template_exercises_select_own" on public.workout_template_exercises;
create policy "workout_template_exercises_select_own" on public.workout_template_exercises
  for select using (auth.uid() = user_id);
drop policy if exists "workout_template_exercises_insert_own" on public.workout_template_exercises;
create policy "workout_template_exercises_insert_own" on public.workout_template_exercises
  for insert with check (auth.uid() = user_id);
drop policy if exists "workout_template_exercises_update_own" on public.workout_template_exercises;
create policy "workout_template_exercises_update_own" on public.workout_template_exercises
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "workout_template_exercises_delete_own" on public.workout_template_exercises;
create policy "workout_template_exercises_delete_own" on public.workout_template_exercises
  for delete using (auth.uid() = user_id);
