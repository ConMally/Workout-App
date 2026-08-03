-- Phase 6.1: persists which exercise is currently focused during an active
-- workout (types/workout-log.ts's ActiveWorkout#activeExerciseIndex), so
-- refreshing the page, switching tabs, or leaving and returning to the
-- workout reopens the same exercise instead of always resetting to the
-- first one. Nullable — null means "not set" (e.g. a workout started before
-- this column existed), and the app falls back to the first incomplete
-- exercise in that case (see lib/workout-log.ts#resolveActiveExerciseIndex).
alter table public.active_workouts
  add column active_exercise_index integer;

alter table public.active_workouts
  add constraint active_workouts_active_exercise_index_check
  check (active_exercise_index is null or active_exercise_index >= 0);
