-- Phase 3B: support for reviewed, user-initiated localStorage -> Supabase
-- migration. Two changes:
--   1. migration_status grows the columns needed to track a staged,
--      retryable import (previously just a placeholder table nothing wrote
--      to yet).
--   2. plan_substitution_history is a new singleton-per-user table so the
--      "don't immediately repeat a swapped exercise" memory (previously
--      local-only, see lib/storage.ts's SUBSTITUTIONS_KEY) has a cloud home
--      to migrate into and to keep using while signed in.

-- ---------------------------------------------------------------------------
-- migration_status
-- ---------------------------------------------------------------------------

alter table public.migration_status drop constraint migration_status_status_check;

alter table public.migration_status
  alter column status set default 'not_started',
  add constraint migration_status_status_check check (
    status in ('not_started', 'offered', 'deferred', 'importing', 'partially_failed', 'completed', 'declined')
  );

alter table public.migration_status
  add column batch_id uuid,
  add column source_storage_version integer,
  add column current_stage text,
  add column imported_counts jsonb,
  add column skipped_counts jsonb,
  add column failed_counts jsonb,
  add column retry_count integer not null default 0;

comment on column public.migration_status.error_message is
  'A short, user-safe summary only — never a raw Postgres/Supabase error object or SQL text.';

-- ---------------------------------------------------------------------------
-- plan_substitution_history — mirrors user_settings' one-row-per-user shape.
-- Keyed by "dayIndex:exerciseIndex" -> already-shown replacement names,
-- exactly matching lib/storage.ts's local SubstitutionHistory shape, stored
-- as-is rather than normalized (it's write-mostly, read-as-one-blob data).
-- ---------------------------------------------------------------------------

create table public.plan_substitution_history (
  user_id uuid primary key references auth.users (id) on delete cascade,
  history jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger set_plan_substitution_history_updated_at
  before update on public.plan_substitution_history
  for each row execute function public.set_updated_at();

alter table public.plan_substitution_history enable row level security;

create policy "plan_substitution_history_select_own" on public.plan_substitution_history
  for select using (auth.uid() = user_id);
create policy "plan_substitution_history_insert_own" on public.plan_substitution_history
  for insert with check (auth.uid() = user_id);
create policy "plan_substitution_history_update_own" on public.plan_substitution_history
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "plan_substitution_history_delete_own" on public.plan_substitution_history
  for delete using (auth.uid() = user_id);
