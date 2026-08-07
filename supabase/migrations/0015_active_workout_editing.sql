-- Phase 11B: Mid-Workout Exercise Editing.
--
-- Adds one additive column (active_workouts.active_exercise_id — a stable
-- row-id pointer that survives reordering, alongside the pre-existing
-- active_exercise_index from 0009_active_workout_focus_index.sql, which is
-- kept untouched for backward compatibility with any in-flight workout that
-- hasn't been touched by this phase's code yet — see
-- lib/workout-log.ts#resolveActiveExerciseId for the fallback chain that
-- makes both columns meaningful at once), plus four RPC functions so
-- add/replace/delete/reorder are each a single atomic transaction instead
-- of several sequential client round trips that could partially fail and
-- leave the workout's exercise list in a half-written state.
--
-- Every function below is `security invoker` (Postgres's default, stated
-- explicitly for clarity) — they run as the calling authenticated role, so
-- every insert/update/delete they perform is still subject to the normal
-- RLS policies from 0001_init.sql. None of them bypass RLS, and none use a
-- service-role credential. Each also derives the owner from auth.uid()
-- directly rather than trusting any client-supplied user id, and re-checks
-- that every row being modified already belongs to auth.uid() before
-- touching it (defense in depth on top of RLS) — never trusting a
-- client-supplied ownership claim.
--
-- The "shift into a safe high range, then reassign final values" two-phase
-- update pattern used throughout this file for sort_order/set_number is not
-- new — it's the same technique already proven in production by
-- reorder_template_days/reorder_template_exercises
-- (0007_template_favorites.sql). A single UPDATE statement adding a large
-- constant offset to a whole set of rows can never collide with the unique
-- (active_workout_id, sort_order) / any set's set_number ordering
-- constraint mid-statement, regardless of the order Postgres happens to
-- process rows in, because the shifted range (100000+) and the untouched
-- range (always small, single-digit-to-low-double-digit in practice) never
-- overlap.

-- ---------------------------------------------------------------------------
-- 1. active_workouts.active_exercise_id — nullable pointer to the
-- active_workout_exercises row currently focused. ON DELETE SET NULL so
-- deleting the focused exercise (delete_active_workout_exercise below)
-- never leaves a dangling reference — the client always re-resolves focus
-- afterward regardless, but this keeps the column itself consistent even
-- if it didn't.
-- ---------------------------------------------------------------------------

alter table public.active_workouts
  add column if not exists active_exercise_id uuid references public.active_workout_exercises (id) on delete set null;

-- ---------------------------------------------------------------------------
-- 2. add_active_workout_exercise — append a brand-new exercise (plus its
-- fresh, all-unlogged set rows) to an active workout in one transaction.
-- Never touches any existing exercise or set row.
-- ---------------------------------------------------------------------------

create or replace function public.add_active_workout_exercise(
  p_active_workout_id uuid,
  p_name text,
  p_exercise_id text,
  p_target_sets integer,
  p_target_reps text,
  p_target_rest_seconds integer,
  p_note text default ''
) returns uuid
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  v_user_id uuid := auth.uid();
  v_next_sort_order integer;
  v_new_exercise_id uuid;
begin
  if v_user_id is null then
    raise exception 'add_active_workout_exercise: not authenticated';
  end if;

  if not exists (
    select 1 from public.active_workouts
    where id = p_active_workout_id and user_id = v_user_id
  ) then
    raise exception 'add_active_workout_exercise: active workout % not found for this user', p_active_workout_id;
  end if;

  if p_target_sets < 1 then
    raise exception 'add_active_workout_exercise: target_sets must be at least 1';
  end if;

  select coalesce(max(sort_order) + 1, 0) into v_next_sort_order
    from public.active_workout_exercises
    where active_workout_id = p_active_workout_id and user_id = v_user_id;

  insert into public.active_workout_exercises
    (user_id, active_workout_id, sort_order, name, exercise_id, target_sets, target_reps, target_rest_seconds, completed, note)
  values
    (v_user_id, p_active_workout_id, v_next_sort_order, p_name, p_exercise_id, p_target_sets, p_target_reps, p_target_rest_seconds, false, coalesce(p_note, ''))
  returning id into v_new_exercise_id;

  insert into public.active_workout_sets (user_id, active_workout_exercise_id, set_number, weight, reps, completed)
  select v_user_id, v_new_exercise_id, s, null, null, false
  from generate_series(1, p_target_sets) as s;

  update public.active_workouts set updated_at = now() where id = p_active_workout_id and user_id = v_user_id;

  return v_new_exercise_id;
end;
$$;

grant execute on function public.add_active_workout_exercise(uuid, text, text, integer, text, integer, text) to authenticated;

-- ---------------------------------------------------------------------------
-- 3. delete_active_workout_exercise — remove an exercise (its set rows
-- cascade via the existing ON DELETE CASCADE FK, see 0001_init.sql) and
-- renormalize the remaining exercises' sort_order to a gap-free sequence,
-- in one transaction. Refuses to delete the last remaining exercise — an
-- active workout must always have at least one (ActiveWorkoutSchema
-- requires exercises.min(1); the app has no "empty workout" state and
-- should never be asked to render one).
-- ---------------------------------------------------------------------------

create or replace function public.delete_active_workout_exercise(
  p_active_workout_id uuid,
  p_exercise_id uuid
) returns void
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  v_user_id uuid := auth.uid();
  v_remaining_count integer;
begin
  if v_user_id is null then
    raise exception 'delete_active_workout_exercise: not authenticated';
  end if;

  if not exists (
    select 1 from public.active_workout_exercises
    where id = p_exercise_id and active_workout_id = p_active_workout_id and user_id = v_user_id
  ) then
    raise exception 'delete_active_workout_exercise: exercise % not found in workout % for this user', p_exercise_id, p_active_workout_id;
  end if;

  select count(*) into v_remaining_count
    from public.active_workout_exercises
    where active_workout_id = p_active_workout_id and user_id = v_user_id;

  if v_remaining_count <= 1 then
    raise exception 'delete_active_workout_exercise: cannot delete the last exercise in a workout';
  end if;

  delete from public.active_workout_exercises
    where id = p_exercise_id and active_workout_id = p_active_workout_id and user_id = v_user_id;

  update public.active_workout_exercises
    set sort_order = sort_order + 100000
    where active_workout_id = p_active_workout_id and user_id = v_user_id;

  update public.active_workout_exercises as e
    set sort_order = t.rn - 1
    from (
      select id, row_number() over (order by sort_order) as rn
      from public.active_workout_exercises
      where active_workout_id = p_active_workout_id and user_id = v_user_id
    ) as t
    where e.id = t.id;

  update public.active_workouts set updated_at = now() where id = p_active_workout_id and user_id = v_user_id;
end;
$$;

grant execute on function public.delete_active_workout_exercise(uuid, uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- 4. reorder_active_workout_exercises — reassign sort_order from a
-- client-supplied ordering of existing row ids, in one transaction. Mirrors
-- reorder_template_exercises (0007_template_favorites.sql) exactly. The
-- row-count check guards against a stale/partial id list (e.g. an exercise
-- deleted by another tab) silently dropping or duplicating rows.
-- ---------------------------------------------------------------------------

create or replace function public.reorder_active_workout_exercises(
  p_active_workout_id uuid,
  p_exercise_ids uuid[]
) returns void
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  v_user_id uuid := auth.uid();
  v_existing_count integer;
begin
  if v_user_id is null then
    raise exception 'reorder_active_workout_exercises: not authenticated';
  end if;

  if not exists (
    select 1 from public.active_workouts where id = p_active_workout_id and user_id = v_user_id
  ) then
    raise exception 'reorder_active_workout_exercises: active workout % not found for this user', p_active_workout_id;
  end if;

  select count(*) into v_existing_count from public.active_workout_exercises
    where active_workout_id = p_active_workout_id and user_id = v_user_id;

  if v_existing_count <> coalesce(array_length(p_exercise_ids, 1), 0) then
    raise exception 'reorder_active_workout_exercises: id list for workout % does not match its current exercises', p_active_workout_id;
  end if;

  update public.active_workout_exercises
    set sort_order = sort_order + 100000
    where active_workout_id = p_active_workout_id and user_id = v_user_id;

  update public.active_workout_exercises as e
    set sort_order = t.idx - 1
    from unnest(p_exercise_ids) with ordinality as t(id, idx)
    where e.id = t.id and e.active_workout_id = p_active_workout_id and e.user_id = v_user_id;

  update public.active_workouts
    set updated_at = now()
    where id = p_active_workout_id and user_id = v_user_id;
end;
$$;

grant execute on function public.reorder_active_workout_exercises(uuid, uuid[]) to authenticated;

-- ---------------------------------------------------------------------------
-- 5. replace_active_workout_exercise — two distinct, explicit modes chosen
-- by the client (never inferred/guessed server-side beyond a defensive
-- re-check):
--
--   p_keep_completed = false ("in place"): only valid when the exercise
--   being replaced has zero completed sets. Updates the row's identity
--   fields directly and replaces its set rows with a fresh, all-unlogged
--   set of p_target_sets. The row id itself never changes, so a caller
--   already focused on it stays correctly focused on "the replacement"
--   with no extra bookkeeping.
--
--   p_keep_completed = true ("keep completed sets"): only valid when the
--   exercise has at least one completed set. The original row is NEVER
--   deleted or renamed — it's truncated down to just its already-completed
--   sets (which are never touched) and marked complete, preserving its
--   original name/exercise_id so completed performance stays permanently
--   attributed to the original exercise, never remapped onto the
--   replacement (see lib/progression.ts#detectPersonalRecords, which
--   matches purely by exercise name — this is what keeps that matching
--   correct). The replacement is inserted as a brand-new exercise row
--   immediately after it.
--
-- Both modes are re-validated against the actual completed-set count
-- server-side (not just trusted from the client), so a mis-wired call can
-- never silently discard completed performance.
-- ---------------------------------------------------------------------------

create or replace function public.replace_active_workout_exercise(
  p_active_workout_id uuid,
  p_exercise_id uuid,
  p_keep_completed boolean,
  p_name text,
  p_new_exercise_id text,
  p_target_sets integer,
  p_target_reps text,
  p_target_rest_seconds integer
) returns jsonb
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  v_user_id uuid := auth.uid();
  v_old_sort_order integer;
  v_completed_count integer;
  v_inserted_id uuid;
begin
  if v_user_id is null then
    raise exception 'replace_active_workout_exercise: not authenticated';
  end if;

  select sort_order into v_old_sort_order
    from public.active_workout_exercises
    where id = p_exercise_id and active_workout_id = p_active_workout_id and user_id = v_user_id;

  if not found then
    raise exception 'replace_active_workout_exercise: exercise % not found in workout % for this user', p_exercise_id, p_active_workout_id;
  end if;

  if p_target_sets < 1 then
    raise exception 'replace_active_workout_exercise: target_sets must be at least 1';
  end if;

  select count(*) into v_completed_count
    from public.active_workout_sets
    where active_workout_exercise_id = p_exercise_id and completed = true;

  if not p_keep_completed then
    if v_completed_count > 0 then
      raise exception 'replace_active_workout_exercise: exercise % has % completed set(s) — call with p_keep_completed = true instead', p_exercise_id, v_completed_count;
    end if;

    update public.active_workout_exercises
      set name = p_name,
          exercise_id = p_new_exercise_id,
          target_sets = p_target_sets,
          target_reps = p_target_reps,
          target_rest_seconds = p_target_rest_seconds,
          completed = false,
          note = ''
      where id = p_exercise_id and active_workout_id = p_active_workout_id and user_id = v_user_id;

    delete from public.active_workout_sets where active_workout_exercise_id = p_exercise_id and user_id = v_user_id;

    insert into public.active_workout_sets (user_id, active_workout_exercise_id, set_number, weight, reps, completed)
    select v_user_id, p_exercise_id, s, null, null, false
    from generate_series(1, p_target_sets) as s;

    update public.active_workouts set updated_at = now() where id = p_active_workout_id and user_id = v_user_id;

    return jsonb_build_object('replacedExerciseId', p_exercise_id, 'newExerciseId', null);
  end if;

  if v_completed_count = 0 then
    raise exception 'replace_active_workout_exercise: exercise % has no completed sets — call with p_keep_completed = false instead', p_exercise_id;
  end if;

  update public.active_workout_exercises
    set target_sets = v_completed_count,
        completed = true
    where id = p_exercise_id and active_workout_id = p_active_workout_id and user_id = v_user_id;

  delete from public.active_workout_sets
    where active_workout_exercise_id = p_exercise_id and user_id = v_user_id and completed = false;

  -- Renumber the surviving (completed) sets to a gap-free 1..v_completed_count
  -- sequence in case they weren't completed strictly in order.
  update public.active_workout_sets
    set set_number = set_number + 100000
    where active_workout_exercise_id = p_exercise_id and user_id = v_user_id;

  update public.active_workout_sets as s
    set set_number = t.rn
    from (
      select id, row_number() over (order by set_number) as rn
      from public.active_workout_sets
      where active_workout_exercise_id = p_exercise_id and user_id = v_user_id
    ) as t
    where s.id = t.id;

  -- Make room at v_old_sort_order + 1 for the new exercise.
  update public.active_workout_exercises
    set sort_order = sort_order + 100000
    where active_workout_id = p_active_workout_id and user_id = v_user_id and sort_order > v_old_sort_order;

  insert into public.active_workout_exercises
    (user_id, active_workout_id, sort_order, name, exercise_id, target_sets, target_reps, target_rest_seconds, completed, note)
  values
    (v_user_id, p_active_workout_id, v_old_sort_order + 1, p_name, p_new_exercise_id, p_target_sets, p_target_reps, p_target_rest_seconds, false, '')
  returning id into v_inserted_id;

  insert into public.active_workout_sets (user_id, active_workout_exercise_id, set_number, weight, reps, completed)
  select v_user_id, v_inserted_id, s, null, null, false
  from generate_series(1, p_target_sets) as s;

  update public.active_workout_exercises
    set sort_order = sort_order - 100000 + 1
    where active_workout_id = p_active_workout_id and user_id = v_user_id and sort_order > 100000;

  update public.active_workouts set updated_at = now() where id = p_active_workout_id and user_id = v_user_id;

  return jsonb_build_object('replacedExerciseId', p_exercise_id, 'newExerciseId', v_inserted_id);
end;
$$;

grant execute on function public.replace_active_workout_exercise(uuid, uuid, boolean, text, text, integer, text, integer) to authenticated;
