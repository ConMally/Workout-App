import type { CompletedWorkout } from "@/types/workout-log";
import type { ExerciseProgressSummary } from "@/types/analytics";
import { getExerciseStats } from "@/lib/insights";
import { addDays } from "@/lib/dashboard";

const RECENT_PR_WINDOW_DAYS = 30;

// Thin reshaping layer over lib/insights.ts#getExerciseStats — never
// re-walks history itself. getExerciseStats already computes everything
// needed except "best volume in a single session" and the lifetime/recent
// PR counts, added here.
export function getExerciseProgress(history: CompletedWorkout[], exerciseName: string): ExerciseProgressSummary {
  const stats = getExerciseStats(history, exerciseName);

  const oneRepMaxHistory = stats.history
    .filter((point) => point.estimatedOneRepMax !== null)
    .map((point) => ({ completedAt: point.completedAt, estimatedOneRepMax: point.estimatedOneRepMax as number }));

  let bestVolumeInASession = 0;
  for (const workout of history) {
    const exercise = workout.exercises.find((e) => e.name === exerciseName);
    if (!exercise) continue;
    let sessionVolume = 0;
    for (const set of exercise.sets) {
      if (!set.completed || set.weight === null || set.weight <= 0 || set.reps === null || set.reps <= 0) continue;
      sessionVolume += set.weight * set.reps;
    }
    if (sessionVolume > bestVolumeInASession) bestVolumeInASession = Math.round(sessionVolume);
  }

  const recentCutoff = addDays(new Date(), -RECENT_PR_WINDOW_DAYS);
  const recentPRCount = stats.prHistory.filter((pr) => new Date(pr.completedAt) >= recentCutoff).length;

  return {
    exerciseName,
    oneRepMaxHistory,
    bestWeight: stats.heaviestWeight,
    bestReps: stats.bestReps,
    bestVolumeInASession,
    bestEstimatedOneRepMax: stats.bestEstimatedOneRepMax,
    lifetimePRCount: stats.prHistory.length,
    recentPRCount,
  };
}
