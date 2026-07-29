-- Phase 4B: Workout Templates 2.0 — favorites + atomic multi-table template
-- writes. workout_templates/workout_template_days/workout_template_exercises
-- and their RLS policies already exist (0005_workout_templates.sql,
-- repaired by 0006_repair_workout_templates.sql) — this migration only adds
-- what's new: a favorite flag, and a handful of RPC functions so
-- create/update/duplicate/reorder are each a single atomic transaction
-- instead of the repository doing several sequential inserts/deletes that
-- could partially fail and leave a template half-replaced.
--
-- Every function below is `security invoker` (Postgres's default, stated
-- explicitly here for clarity) — they run as the calling authenticated
-- role, so every insert/update/delete they perform is still subject to the
-- normal RLS policies from 0005_workout_templates.sql. None of them bypass
-- RLS, and none use a service-role credential. Each also derives the owner
-- from auth.uid() directly rather than trusting any client-supplied user
-- id, and re-checks that the row being modified already belongs to
-- auth.uid() before touching it (defense in depth on top of RLS, matching
-- every other write path in this app).

-- ---------------------------------------------------------------------------
-- 1. Favorites
-- ---------------------------------------------------------------------------

alter table public.workout_templates
  add column if not exists is_favorite boolean not null default false;

-- No new index: the templates list for one user is small enough (personal
-- app, one row per user_id already indexed) that favorite-first sorting is
-- done client-side over the already-fetched list rather than server-side,
-- so this column never appears in a WHERE/ORDER BY that needs its own index.

-- ---------------------------------------------------------------------------
-- 2. create_template_tree — insert a template plus all its days/exercises
-- in one transaction. Day/exercise order is taken from each JSON array's
-- position (not a client-supplied index), which guarantees sequential,
-- gap-free, duplicate-free day_number/order_index values by construction.
--
-- p_days shape: [{ "dayName": text, "focus": text, "exercises": [
--   { "name": text, "sets": int, "reps": text, "restSeconds": int, "notes": text }
-- ] }]
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
        (user_id, template_day_id, exercise_name, sets, reps, rest_seconds, notes, order_index)
      values (
        v_user_id,
        v_day_id,
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

-- ---------------------------------------------------------------------------
-- 3. replace_template_tree — update a template's own fields and replace its
-- entire day/exercise tree in one transaction. Used by every "save" in the
-- editor (name/description/goal edits, day/exercise content edits, and
-- reordering all go through this single call), so a failure partway never
-- leaves the template with its old fields but new days, or vice versa —
-- previously this was two separate round trips (delete days, then insert
-- days) with no transaction tying them together.
-- ---------------------------------------------------------------------------

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
        (user_id, template_day_id, exercise_name, sets, reps, rest_seconds, notes, order_index)
      values (
        v_user_id,
        v_day_id,
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

-- ---------------------------------------------------------------------------
-- 4. duplicate_template_tree — read a template and copy it (fresh row +
-- fresh day/exercise rows, all with new ids) in one transaction, entirely
-- server-side. Replaces the previous client-side pattern of fetching the
-- full template, reconstructing it in JS, then inserting it back — this is
-- both atomic and a single round trip instead of two.
-- ---------------------------------------------------------------------------

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
        (user_id, template_day_id, exercise_name, sets, reps, rest_seconds, notes, order_index)
      values (
        v_user_id,
        v_new_day_id,
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

-- ---------------------------------------------------------------------------
-- 5. reorder_template_days / reorder_template_exercises — reassign
-- day_number/order_index from a client-supplied ordering of existing row
-- ids, in one transaction. Goes through a two-phase update (shift every row
-- out of range, then assign final values) so it never transiently violates
-- the (template_id, day_number)/(template_day_id, order_index) unique
-- constraints partway through — a single-phase row-by-row update could
-- momentarily collide with another row's current value depending on update
-- order. The row-count check guards against a stale/partial id list (e.g.
-- a day deleted by another tab) silently dropping or duplicating rows.
-- ---------------------------------------------------------------------------

create or replace function public.reorder_template_days(
  p_template_id uuid,
  p_day_ids uuid[]
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
    raise exception 'reorder_template_days: not authenticated';
  end if;

  select count(*) into v_existing_count from public.workout_template_days
    where template_id = p_template_id and user_id = v_user_id;

  if v_existing_count <> coalesce(array_length(p_day_ids, 1), 0) then
    raise exception 'reorder_template_days: id list for template % does not match its current days', p_template_id;
  end if;

  update public.workout_template_days
    set day_number = day_number + 100000
    where template_id = p_template_id and user_id = v_user_id;

  update public.workout_template_days as d
    set day_number = t.idx - 1
    from unnest(p_day_ids) with ordinality as t(id, idx)
    where d.id = t.id and d.template_id = p_template_id and d.user_id = v_user_id;

  update public.workout_templates
    set updated_at = now()
    where id = p_template_id and user_id = v_user_id;
end;
$$;

grant execute on function public.reorder_template_days(uuid, uuid[]) to authenticated;

create or replace function public.reorder_template_exercises(
  p_template_day_id uuid,
  p_exercise_ids uuid[]
) returns void
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  v_user_id uuid := auth.uid();
  v_existing_count integer;
  v_template_id uuid;
begin
  if v_user_id is null then
    raise exception 'reorder_template_exercises: not authenticated';
  end if;

  select count(*) into v_existing_count from public.workout_template_exercises
    where template_day_id = p_template_day_id and user_id = v_user_id;

  if v_existing_count <> coalesce(array_length(p_exercise_ids, 1), 0) then
    raise exception 'reorder_template_exercises: id list for day % does not match its current exercises', p_template_day_id;
  end if;

  update public.workout_template_exercises
    set order_index = order_index + 100000
    where template_day_id = p_template_day_id and user_id = v_user_id;

  update public.workout_template_exercises as e
    set order_index = t.idx - 1
    from unnest(p_exercise_ids) with ordinality as t(id, idx)
    where e.id = t.id and e.template_day_id = p_template_day_id and e.user_id = v_user_id;

  select template_id into v_template_id from public.workout_template_days
    where id = p_template_day_id and user_id = v_user_id;

  if v_template_id is not null then
    update public.workout_templates
      set updated_at = now()
      where id = v_template_id and user_id = v_user_id;
  end if;
end;
$$;

grant execute on function public.reorder_template_exercises(uuid, uuid[]) to authenticated;
