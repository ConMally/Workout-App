import { getAllPersonalRecords } from "@/lib/dashboard";
import type { LocalSnapshot } from "./local-snapshot";
import type { MigrationPreview } from "./types";

export interface CloudExistence {
  hasPlan: boolean;
  hasActiveWorkout: boolean;
  hasSubstitutions: boolean;
}

// Pure — takes the already-read local snapshot plus a handful of cheap
// cloud existence checks (fetched by the caller via the normal
// repositories) and produces exactly what the review screen shows. Reuses
// lib/dashboard.ts#getAllPersonalRecords (itself built on
// lib/progression.ts#detectPersonalRecords) for the PR count rather than
// inventing a second way to count personal records.
export function buildMigrationPreview(snapshot: LocalSnapshot, cloud: CloudExistence): MigrationPreview {
  const completedSetCount = snapshot.history.reduce(
    (sum, workout) => sum + workout.exercises.reduce((exSum, exercise) => exSum + exercise.sets.length, 0),
    0
  );

  const readinessCount = snapshot.history.filter((workout) => workout.readiness !== null).length;

  const prCount = getAllPersonalRecords(snapshot.history).length;

  let historyDateRange: MigrationPreview["historyDateRange"] = null;
  if (snapshot.history.length > 0) {
    const timestamps = snapshot.history.map((workout) => workout.completedAt).sort();
    historyDateRange = { earliest: timestamps[0], latest: timestamps[timestamps.length - 1] };
  }

  return {
    hasPlan: snapshot.plan !== null,
    hasActiveWorkout: snapshot.activeWorkout !== null,
    completedWorkoutCount: snapshot.history.length,
    completedSetCount,
    prCount,
    goalCount: snapshot.goals.length,
    readinessCount,
    exerciseNoteCount: 0,
    hasStoredSettings: snapshot.hasStoredSettings,
    substitutionEntryCount: Object.keys(snapshot.substitutions).length,
    historyDateRange,
    cloud,
  };
}
