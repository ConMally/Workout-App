-- Phase 6: exercise favorites. The exercise library itself
-- (lib/exercises/data.ts) is static reference data compiled into the app —
-- like lib/workout-generator.ts's exercise pools and
-- lib/exercise-substitutions.ts's SUBSTITUTION_POOLS before it, it does
-- not get a table. Only which exercises a user has favorited is
-- per-account state worth syncing to Supabase (PART 8: "Favorites should
-- sync to Supabase").
--
-- exercise_id here is lib/exercises/data.ts's ExerciseDefinition.id — a
-- stable string slug, not a foreign key into another table (there's no
-- exercises table to reference), so it's stored as plain text.

create table public.exercise_favorites (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  exercise_id text not null check (char_length(exercise_id) between 1 and 200),
  created_at timestamptz not null default now(),
  unique (user_id, exercise_id)
);

create index exercise_favorites_user_id_idx on public.exercise_favorites (user_id);

alter table public.exercise_favorites enable row level security;

create policy "exercise_favorites_select_own" on public.exercise_favorites
  for select using (auth.uid() = user_id);
create policy "exercise_favorites_insert_own" on public.exercise_favorites
  for insert with check (auth.uid() = user_id);
create policy "exercise_favorites_delete_own" on public.exercise_favorites
  for delete using (auth.uid() = user_id);

-- No update policy — a favorite is either present or absent; toggling off
-- is a delete, toggling on is an insert, so there's never a legitimate
-- update to this table (same pattern as every other pure-membership table
-- in this schema).
