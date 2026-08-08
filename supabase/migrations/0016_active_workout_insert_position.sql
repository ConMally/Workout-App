-- Phase 11C: Smarter Mid-Workout Exercise Insertion.
--
-- Extends add_active_workout_exercise (0015_active_workout_editing.sql)
-- with an optional insert-after position instead of always appending to
-- the end. This is a CREATE OR REPLACE with a new trailing parameter that
-- has a default value — PostgreSQL allows extending a function's argument
-- list this way without dropping it first, and every existing call site
-- that doesn't pass the new argument (there are none left after this
-- phase's repository update, but any external/cached caller would be)
-- keeps working unchanged, defaulting to the original append behavior.
--
-- Does not edit 0015 historically — that file is untouched. Same
-- security-invoker / auth.uid()-derived-ownership / re-validate-every-row
-- posture as every RPC in this app.

create or replace function public.add_active_workout_exercise(
  p_active_workout_id uuid,
  p_name text,
  p_exercise_id text,
  p_target_sets integer,
  p_target_reps text,
  p_target_rest_seconds integer,
  p_note text default '',
  -- Phase 11C: the active_workout_exercises.id to insert immediately after.
  -- null (the default) means "append to the end", exactly 0015's original
  -- and only behavior. When supplied, it MUST already belong to this same
  -- active workout and user — never trusted as an arbitrary id (see the
  -- ownership-scoped SELECT below, which raises rather than silently
  -- falling back if it doesn't resolve, so a stale id from a deleted
  -- exercise fails loudly and recoverably instead of inserting somewhere
  -- the caller didn't ask for).
  p_insert_after_exercise_id uuid default null
) returns uuid
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  v_user_id uuid := auth.uid();
  v_after_sort_order integer;
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

  if p_insert_after_exercise_id is not null then
    select sort_order into v_after_sort_order
      from public.active_workout_exercises
      where id = p_insert_after_exercise_id
        and active_workout_id = p_active_workout_id
        and user_id = v_user_id;

    if not found then
      raise exception 'add_active_workout_exercise: insert-after exercise % not found in workout % for this user', p_insert_after_exercise_id, p_active_workout_id;
    end if;
  end if;

  if v_after_sort_order is null then
    -- Append — unchanged from 0015: goes after whatever the current
    -- highest sort_order is (works identically whether that highest row
    -- happens to be the "current" exercise or not, which is exactly PART
    -- 9's "current exercise is last -> behaves like append" edge case).
    select coalesce(max(sort_order) + 1, 0) into v_next_sort_order
      from public.active_workout_exercises
      where active_workout_id = p_active_workout_id and user_id = v_user_id;
  else
    -- Insert immediately after v_after_sort_order. Same two-phase
    -- safe-offset shift already used by replace_active_workout_exercise's
    -- "keep completed" branch (0015) and reorder_template_exercises (0007)
    -- for the identical "make room for one new row at a specific position"
    -- problem — shifting every row after the target into a 100000+ range
    -- first means the shift can never transiently collide with the unique
    -- (active_workout_id, sort_order) constraint, regardless of the order
    -- Postgres happens to process the affected rows in.
    update public.active_workout_exercises
      set sort_order = sort_order + 100000
      where active_workout_id = p_active_workout_id
        and user_id = v_user_id
        and sort_order > v_after_sort_order;

    v_next_sort_order := v_after_sort_order + 1;
  end if;

  insert into public.active_workout_exercises
    (user_id, active_workout_id, sort_order, name, exercise_id, target_sets, target_reps, target_rest_seconds, completed, note)
  values
    (v_user_id, p_active_workout_id, v_next_sort_order, p_name, p_exercise_id, p_target_sets, p_target_reps, p_target_rest_seconds, false, coalesce(p_note, ''))
  returning id into v_new_exercise_id;

  insert into public.active_workout_sets (user_id, active_workout_exercise_id, set_number, weight, reps, completed)
  select v_user_id, v_new_exercise_id, s, null, null, false
  from generate_series(1, p_target_sets) as s;

  if v_after_sort_order is not null then
    update public.active_workout_exercises
      set sort_order = sort_order - 100000 + 1
      where active_workout_id = p_active_workout_id
        and user_id = v_user_id
        and sort_order > 100000;
  end if;

  -- Deliberately does NOT touch active_workouts.active_exercise_id (PART 7:
  -- "activeExerciseId does not change") — only updated_at, same as 0015.
  update public.active_workouts set updated_at = now() where id = p_active_workout_id and user_id = v_user_id;

  return v_new_exercise_id;
end;
$$;

grant execute on function public.add_active_workout_exercise(uuid, text, text, integer, text, integer, text, uuid) to authenticated;
