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
