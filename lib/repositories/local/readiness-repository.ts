import { readHistory } from "@/lib/storage";
import type { Readiness } from "@/types/workout-log";
import type { ReadinessCheckIn, ReadinessRepository } from "../readiness-repository";

// Local mode has no separate readiness storage — it's embedded directly on
// each CompletedWorkout (already written by HistoryRepository's
// addCompletedWorkout), matching how lib/readiness.ts already reads it.
// createCheckIn is a no-op: there's nothing extra to persist.
export function createLocalReadinessRepository(): ReadinessRepository {
  return {
    async createCheckIn() {
      // no-op — see file comment.
    },
    async listCheckIns(_userId, options) {
      const entries: ReadinessCheckIn[] = [];
      for (const workout of readHistory()) {
        const readiness: Readiness | null = workout.readiness;
        if (readiness === null) continue;
        entries.push({ completedWorkoutId: workout.id, readiness, createdAt: workout.completedAt });
      }
      return options?.limit ? entries.slice(0, options.limit) : entries;
    },
  };
}
