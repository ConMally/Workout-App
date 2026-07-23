-- Phase 3C: defense-in-depth against duplicate personal_records rows on
-- retry. app/page.tsx's finalizeWorkout is being made idempotent
-- (check-before-insert on the completed_workouts row) so this should never
-- actually fire in normal use — this is the database-level backstop.
--
-- The key includes `value`, not just (completed_workout_id, exercise_name,
-- record_type): a single workout can legitimately produce two PRs of the
-- same type for the same exercise (e.g. set 2 beats the old heaviest-weight
-- record, then set 5 beats that new running best again) — those are two
-- real, distinct rows that must both be allowed. A literal retry of the
-- exact same insert always has the exact same value, which this catches.

alter table public.personal_records
  add constraint personal_records_unique_event
  unique (completed_workout_id, exercise_name, record_type, value);
