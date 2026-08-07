import type { WorkoutPlan } from "@/types/workout";
import type { ActiveWorkout, CompletedWorkout, LoggedExercise } from "@/types/workout-log";
import type { ExerciseDefinition } from "@/types/exercises";
import { getExerciseByName } from "./exercises/library";

// Pure construction and derivation helpers for the workout-log domain —
// building a fresh ActiveWorkout from a plan day, computing duration/stats,
// and looking up prior performance. No storage I/O and no progression/PR
// math here (see lib/storage.ts and lib/progression.ts respectively).

type TrainingDay = WorkoutPlan["weeklySchedule"][number];

// The single place every active workout is built, regardless of source —
// a freshly generated plan, a template-derived plan (lib/templates.ts
// #planFromTemplate), a plan the user hand-edited, or one with a replaced
// exercise (all of those end up as a TrainingDay by the time this runs) —
// so resolving exerciseId here by exact name/alias match against the
// centralized library (PART 3) automatically covers every source without
// needing a separate id-propagation path for each one. A template
// exercise's `name` is always its library canonical name once resolved, so
// this lookup succeeds for it exactly as reliably as threading the id
// through directly would; only a legacy/unresolved exercise ever falls
// through to a null exerciseId here.
export function createActiveWorkout(day: TrainingDay, dayIndex: number): ActiveWorkout {
  const exercises = day.exercises.map((exercise) => ({
    id: crypto.randomUUID(),
    name: exercise.name,
    exerciseId: getExerciseByName(exercise.name)?.id ?? null,
    targetSets: exercise.sets,
    targetReps: exercise.reps,
    targetRestSeconds: exercise.restSeconds,
    sets: Array.from({ length: exercise.sets }, (_, i) => ({
      setNumber: i + 1,
      weight: null,
      reps: null,
      completed: false,
    })),
    completed: false,
    note: "",
  }));

  return {
    id: crypto.randomUUID(),
    startedAt: new Date().toISOString(),
    dayIndex,
    dayLabel: day.day,
    dayTitle: day.title,
    dayFocus: day.focus,
    exercises,
    activeExerciseIndex: 0,
    activeExerciseId: exercises[0]?.id ?? null,
  };
}

// ---------------------------------------------------------------------------
// Phase 11B: mid-workout exercise editing — pure construction helpers.
// Actual persistence (insert/replace/delete/reorder rows) lives in the
// active-workout repository (local: direct array edits + writeActiveWorkout;
// Supabase: the add/replace/delete/reorder_active_workout_exercise(s) RPCs,
// see supabase/migrations/0015_active_workout_editing.sql) — this file stays
// pure/storage-free per its header comment, so these only ever build the
// LoggedExercise shape a caller then hands to that repository layer.
// ---------------------------------------------------------------------------

// Sets/reps/rest default from the library definition's own recommendations
// (min of the recommended rest range, "min-max" rep string) — same
// convention as lib/templates.ts#templateExerciseFromDefinition, reused here
// so "Add Exercise" during an active workout and "Add Exercise" while
// building a template default identically. `sets` starts at 3 for the same
// reason templateExerciseFromDefinition does: a reasonable universal
// starting point, always editable before confirming.
export function activeWorkoutExerciseFromDefinition(definition: ExerciseDefinition): LoggedExercise {
  const targetSets = 3;
  return {
    id: crypto.randomUUID(),
    name: definition.name,
    exerciseId: definition.id,
    targetSets,
    targetReps: `${definition.recommendedRepRange.min}-${definition.recommendedRepRange.max}`,
    targetRestSeconds: definition.recommendedRestSeconds.min,
    sets: Array.from({ length: targetSets }, (_, i) => ({
      setNumber: i + 1,
      weight: null,
      reps: null,
      completed: false,
    })),
    completed: false,
    note: "",
  };
}

export function computeDurationSeconds(startedAt: string): number | null {
  const start = new Date(startedAt).getTime();
  if (Number.isNaN(start)) return null;
  return Math.max(0, Math.round((Date.now() - start) / 1000));
}

export function countCompletedSets(exercises: LoggedExercise[]): number {
  return exercises.reduce((sum, exercise) => sum + exercise.sets.filter((set) => set.completed).length, 0);
}

export function countCompletedExercises(exercises: LoggedExercise[]): number {
  return exercises.filter((exercise) => exercise.completed).length;
}

// Same weighted-volume formula as lib/insights.ts#weekVolume (weight ×
// reps, completed sets only, never invents a weight) but for a single
// workout — PART 6's History timeline volume column reuses this rather
// than duplicating the math inline in a component.
export function getWorkoutVolume(exercises: LoggedExercise[]): number {
  let total = 0;
  for (const exercise of exercises) {
    for (const set of exercise.sets) {
      if (!set.completed || set.weight === null || set.weight <= 0 || set.reps === null || set.reps <= 0) continue;
      total += set.weight * set.reps;
    }
  }
  return Math.round(total);
}

// ---------------------------------------------------------------------------
// Phase 6.1 focused-exercise helpers — pure derivations over an
// ActiveWorkout's exercises, kept here (not in components) per this app's
// existing convention of putting workout math in lib/ and letting
// components just render already-computed results.
// ---------------------------------------------------------------------------

export function getExerciseCompletion(exercise: LoggedExercise): {
  completedSets: number;
  totalSets: number;
  isComplete: boolean;
} {
  return {
    completedSets: exercise.sets.filter((set) => set.completed).length,
    totalSets: exercise.sets.length,
    isComplete: exercise.completed,
  };
}

export function getWorkoutCompletionProgress(exercises: LoggedExercise[]): {
  completedExercises: number;
  totalExercises: number;
  completedSets: number;
  totalSets: number;
} {
  return {
    completedExercises: countCompletedExercises(exercises),
    totalExercises: exercises.length,
    completedSets: countCompletedSets(exercises),
    totalSets: exercises.reduce((sum, exercise) => sum + exercise.sets.length, 0),
  };
}

// The first exercise that isn't fully marked complete, or the last exercise
// if every one of them is — used both to seed a brand-new workout's focus
// and as the fallback when a saved activeExerciseIndex is missing/invalid.
export function getFirstIncompleteExercise(exercises: LoggedExercise[]): number {
  const index = exercises.findIndex((exercise) => !exercise.completed);
  return index === -1 ? Math.max(0, exercises.length - 1) : index;
}

// Validates a persisted activeExerciseIndex against the workout's current
// exercise list — out-of-range (or null, e.g. a workout saved before this
// field existed) safely falls back rather than pointing at nothing. Still
// used as one link in resolveActiveExerciseId's fallback chain below (for
// legacy workouts with no activeExerciseId yet), and as the very last resort
// there too.
export function resolveActiveExerciseIndex(exercises: LoggedExercise[], savedIndex: number | null): number {
  if (savedIndex !== null && savedIndex >= 0 && savedIndex < exercises.length) return savedIndex;
  return getFirstIncompleteExercise(exercises);
}

// Phase 11B: resolves which exercise row should be focused, returning its
// stable id rather than an array index — array position is no longer a safe
// identity now that add/delete/reorder can change it mid-workout (see
// components/workout/ActiveWorkoutEditor.tsx). Exactly the fallback chain
// PART 7 of the phase spec calls for:
//   1. the saved activeExerciseId, if it still resolves to a real exercise
//      in the current list (handles the common case, and also correctly
//      "loses" focus rather than misattributing it if that exact row was
//      just deleted — callers should re-resolve after any edit rather than
//      trusting a stale id).
//   2. the legacy activeExerciseIndex, for a workout saved before
//      activeExerciseId existed (or before this session ever wrote one).
//   3. the first incomplete exercise.
//   4. the first exercise, if every one is complete.
// (3) and (4) are already exactly what resolveActiveExerciseIndex/
// getFirstIncompleteExercise fall back to, so this only adds the id-lookup
// step in front of it.
export function resolveActiveExerciseId(
  exercises: LoggedExercise[],
  savedId: string | null,
  savedIndex: number | null
): string {
  if (savedId !== null) {
    const match = exercises.find((exercise) => exercise.id === savedId);
    if (match) return match.id;
  }
  const index = resolveActiveExerciseIndex(exercises, savedIndex);
  return exercises[index]?.id ?? exercises[0]?.id ?? "";
}

// The first not-yet-completed set within one exercise, or -1 once every set
// is done (at which point ExerciseLogger shows "Continue" instead of a
// "Current" badge).
export function getCurrentSetIndex(exercise: LoggedExercise): number {
  return exercise.sets.findIndex((set) => !set.completed);
}

// Live mm:ss (or h:mm:ss past an hour) clock for the sticky workout header —
// distinct from formatDuration's rounded-to-the-minute summary used for
// completed workouts, since a ticking header needs second-level precision.
export function formatElapsedClock(seconds: number): string {
  const total = Math.max(0, Math.floor(seconds));
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const secs = total % 60;
  const mm = String(minutes).padStart(2, "0");
  const ss = String(secs).padStart(2, "0");
  return hours > 0 ? `${hours}:${mm}:${ss}` : `${minutes}:${ss}`;
}

// History is stored newest-first, so the first match is the most recent one.
export function findLastPerformance(
  history: CompletedWorkout[],
  exerciseName: string
): LoggedExercise | null {
  for (const workout of history) {
    const match = workout.exercises.find((exercise) => exercise.name === exerciseName);
    if (match) return match;
  }
  return null;
}

export function formatDuration(seconds: number | null): string {
  if (seconds === null) return "—";
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return remainingMinutes === 0 ? `${hours}h` : `${hours}h ${remainingMinutes}m`;
}

export function formatDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "Unknown date";
  return date.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}
