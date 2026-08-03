-- Library-only exercise selection for templates + stable-ID propagation
-- into active/completed workouts. Adds a nullable exercise_id text column
-- to the three tables that currently identify an exercise by name alone.
--
-- exercise_id stores lib/exercises/data.ts#ExerciseDefinition.id — a plain
-- string, not a uuid, and NOT a foreign key: the exercise library is
-- static, in-code reference data (see data.ts's own header comment) with
-- no corresponding Postgres table to reference. Validity is enforced by
-- application code (lib/templates.ts#validateTemplateInput,
-- lib/exercises/library.ts#resolveExerciseDefinition), not the database.
--
-- Nullable and additive on purpose: existing rows (and any legacy
-- free-text exercise name that never matches a library entry) keep
-- exercise_id = null and continue to resolve by name/alias instead — see
-- resolveExerciseDefinition's fallback. exercise_name/name is never
-- dropped, so nothing about a historical template or workout stops
-- loading because of this migration.
--
-- No index: nothing queries these tables by exercise_id today (lookups are
-- always "give me this template/workout's rows", already covered by the
-- existing template_day_id/active_workout_id/completed_workout_id
-- indexes) — add one later if a usage-by-exercise query actually needs it.

alter table public.workout_template_exercises
  add column if not exists exercise_id text;

alter table public.active_workout_exercises
  add column if not exists exercise_id text;

alter table public.completed_workout_exercises
  add column if not exists exercise_id text;

-- ---------------------------------------------------------------------------
-- Redefine the Phase 4B template RPCs (0007_template_favorites.sql) so
-- create/update/duplicate all carry exercise_id through. Bodies are
-- otherwise unchanged from 0007 — same auth.uid() ownership checks, same
-- position-derived day_number/order_index, same security invoker.
-- ---------------------------------------------------------------------------

create or replace function public.create_template_tree(
  p_id uuid,
  p_name text,
  p_description text,
  p_goal text,
  p_days_per_week integer,
  p_days jsonb
) returns uuid
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  v_user_id uuid := auth.uid();
  v_template_id uuid;
  v_day jsonb;
  v_day_ord integer;
  v_day_id uuid;
  v_exercise jsonb;
  v_ex_ord integer;
begin
  if v_user_id is null then
    raise exception 'create_template_tree: not authenticated';
  end if;

  insert into public.workout_templates (id, user_id, name, description, goal, days_per_week)
  values (p_id, v_user_id, p_name, p_description, p_goal, p_days_per_week)
  returning id into v_template_id;

  for v_day, v_day_ord in
    select value, (ordinality - 1)::integer
    from jsonb_array_elements(p_days) with ordinality as t(value, ordinality)
  loop
    insert into public.workout_template_days (user_id, template_id, day_number, day_name, focus)
    values (v_user_id, v_template_id, v_day_ord, v_day->>'dayName', coalesce(v_day->>'focus', ''))
    returning id into v_day_id;

    for v_exercise, v_ex_ord in
      select value, (ordinality - 1)::integer
      from jsonb_array_elements(v_day->'exercises') with ordinality as t(value, ordinality)
    loop
      insert into public.workout_template_exercises
        (user_id, template_day_id, exercise_id, exercise_name, sets, reps, rest_seconds, notes, order_index)
      values (
        v_user_id,
        v_day_id,
        v_exercise->>'exerciseId',
        v_exercise->>'name',
        (v_exercise->>'sets')::integer,
        v_exercise->>'reps',
        (v_exercise->>'restSeconds')::integer,
        coalesce(v_exercise->>'notes', ''),
        v_ex_ord
      );
    end loop;
  end loop;

  return v_template_id;
end;
$$;

grant execute on function public.create_template_tree(uuid, text, text, text, integer, jsonb) to authenticated;

create or replace function public.replace_template_tree(
  p_template_id uuid,
  p_name text,
  p_description text,
  p_goal text,
  p_days_per_week integer,
  p_days jsonb
) returns void
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  v_user_id uuid := auth.uid();
  v_day jsonb;
  v_day_ord integer;
  v_day_id uuid;
  v_exercise jsonb;
  v_ex_ord integer;
begin
  if v_user_id is null then
    raise exception 'replace_template_tree: not authenticated';
  end if;

  update public.workout_templates
    set name = p_name, description = p_description, goal = p_goal, days_per_week = p_days_per_week
    where id = p_template_id and user_id = v_user_id;

  if not found then
    raise exception 'replace_template_tree: template % not found for this user', p_template_id;
  end if;

  -- Deleting the days cascades to their exercises (workout_template_exercises
  -- FK is ON DELETE CASCADE — see 0005_workout_templates.sql).
  delete from public.workout_template_days
    where template_id = p_template_id and user_id = v_user_id;

  for v_day, v_day_ord in
    select value, (ordinality - 1)::integer
    from jsonb_array_elements(p_days) with ordinality as t(value, ordinality)
  loop
    insert into public.workout_template_days (user_id, template_id, day_number, day_name, focus)
    values (v_user_id, p_template_id, v_day_ord, v_day->>'dayName', coalesce(v_day->>'focus', ''))
    returning id into v_day_id;

    for v_exercise, v_ex_ord in
      select value, (ordinality - 1)::integer
      from jsonb_array_elements(v_day->'exercises') with ordinality as t(value, ordinality)
    loop
      insert into public.workout_template_exercises
        (user_id, template_day_id, exercise_id, exercise_name, sets, reps, rest_seconds, notes, order_index)
      values (
        v_user_id,
        v_day_id,
        v_exercise->>'exerciseId',
        v_exercise->>'name',
        (v_exercise->>'sets')::integer,
        v_exercise->>'reps',
        (v_exercise->>'restSeconds')::integer,
        coalesce(v_exercise->>'notes', ''),
        v_ex_ord
      );
    end loop;
  end loop;
end;
$$;

grant execute on function public.replace_template_tree(uuid, text, text, text, integer, jsonb) to authenticated;

create or replace function public.duplicate_template_tree(
  p_source_template_id uuid,
  p_new_name text
) returns uuid
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  v_user_id uuid := auth.uid();
  v_source public.workout_templates%rowtype;
  v_new_id uuid;
  v_day public.workout_template_days%rowtype;
  v_new_day_id uuid;
  v_exercise public.workout_template_exercises%rowtype;
begin
  if v_user_id is null then
    raise exception 'duplicate_template_tree: not authenticated';
  end if;

  select * into v_source from public.workout_templates
    where id = p_source_template_id and user_id = v_user_id;

  if not found then
    raise exception 'duplicate_template_tree: template % not found for this user', p_source_template_id;
  end if;

  insert into public.workout_templates (user_id, name, description, goal, days_per_week)
  values (v_user_id, p_new_name, v_source.description, v_source.goal, v_source.days_per_week)
  returning id into v_new_id;

  for v_day in
    select * from public.workout_template_days
    where template_id = p_source_template_id and user_id = v_user_id
    order by day_number
  loop
    insert into public.workout_template_days (user_id, template_id, day_number, day_name, focus)
    values (v_user_id, v_new_id, v_day.day_number, v_day.day_name, v_day.focus)
    returning id into v_new_day_id;

    for v_exercise in
      select * from public.workout_template_exercises
      where template_day_id = v_day.id and user_id = v_user_id
      order by order_index
    loop
      insert into public.workout_template_exercises
        (user_id, template_day_id, exercise_id, exercise_name, sets, reps, rest_seconds, notes, order_index)
      values (
        v_user_id,
        v_new_day_id,
        v_exercise.exercise_id,
        v_exercise.exercise_name,
        v_exercise.sets,
        v_exercise.reps,
        v_exercise.rest_seconds,
        v_exercise.notes,
        v_exercise.order_index
      );
    end loop;
  end loop;

  return v_new_id;
end;
$$;

grant execute on function public.duplicate_template_tree(uuid, text) to authenticated;
