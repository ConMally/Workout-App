import type { WorkoutPlan } from "@/types/workout";
import type { ActiveWorkout, CompletedWorkout, LoggedExercise } from "@/types/workout-log";

// Pure construction and derivation helpers for the workout-log domain —
// building a fresh ActiveWorkout from a plan day, computing duration/stats,
// and looking up prior performance. No storage I/O and no progression/PR
// math here (see lib/storage.ts and lib/progression.ts respectively).

type TrainingDay = WorkoutPlan["weeklySchedule"][number];

export function createActiveWorkout(day: TrainingDay, dayIndex: number): ActiveWorkout {
  return {
    id: crypto.randomUUID(),
    startedAt: new Date().toISOString(),
    dayIndex,
    dayLabel: day.day,
    dayTitle: day.title,
    dayFocus: day.focus,
    exercises: day.exercises.map((exercise) => ({
      name: exercise.name,
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
    })),
    activeExerciseIndex: 0,
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
// field existed) safely falls back rather than pointing at nothing.
export function resolveActiveExerciseIndex(exercises: LoggedExercise[], savedIndex: number | null): number {
  if (savedIndex !== null && savedIndex >= 0 && savedIndex < exercises.length) return savedIndex;
  return getFirstIncompleteExercise(exercises);
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
