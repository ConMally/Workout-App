import type { CompletedWorkout, Readiness } from "@/types/workout-log";
import type { WorkoutTrends } from "@/types/analytics";

const MIN_WORKOUTS_FOR_TRENDS = 3;
const READINESS_FIELDS: (keyof Readiness)[] = ["difficulty", "energy", "soreness", "sleepQuality", "satisfaction"];

function average(values: number[]): number | null {
  if (values.length === 0) return null;
  return Math.round((values.reduce((s, v) => s + v, 0) / values.length) * 10) / 10;
}

// Trailing 20 workouts (or all of them if fewer) — recent-enough to reflect
// current training, without either a single outlier workout or the user's
// entire lifetime history dominating the average.
const TREND_WINDOW = 20;

export function getWorkoutTrends(history: CompletedWorkout[]): WorkoutTrends {
  const recent = history.slice(0, TREND_WINDOW);

  if (recent.length < MIN_WORKOUTS_FOR_TRENDS) {
    return {
      averageDurationMinutes: null,
      averageRestSeconds: null,
      averageReadiness: null,
      averageExercisesPerWorkout: null,
      hasEnoughData: false,
    };
  }

  const durations = recent.map((w) => w.durationSeconds).filter((v): v is number => v !== null && v > 0);
  const averageDurationMinutes = durations.length > 0 ? Math.round(average(durations)! / 60) : null;

  const restSecondsValues = recent.flatMap((w) => w.exercises.map((e) => e.targetRestSeconds));
  const averageRestSeconds = restSecondsValues.length > 0 ? Math.round(average(restSecondsValues)!) : null;

  const readinessValues = recent
    .map((w) => w.readiness)
    .filter((r): r is Readiness => r !== null)
    .flatMap((r) => READINESS_FIELDS.map((field) => r[field]).filter((v): v is number => v !== null));
  const averageReadiness = average(readinessValues);

  const exerciseCounts = recent.map((w) => w.exercises.length);
  const averageExercisesPerWorkout = average(exerciseCounts);

  return {
    averageDurationMinutes,
    averageRestSeconds,
    averageReadiness,
    averageExercisesPerWorkout,
    hasEnoughData: true,
  };
}
