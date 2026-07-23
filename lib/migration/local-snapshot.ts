import {
  readSavedPlan,
  readActiveWorkout,
  readHistory,
  readSettings,
  hasStoredSettings,
  readSubstitutionHistory,
  readGoals,
  EXPORT_VERSION,
  type SavedPlanState,
  type SubstitutionHistory,
} from "@/lib/storage";
import type { ActiveWorkout, AppSettings, CompletedWorkout } from "@/types/workout-log";
import type { Goal } from "@/types/goals";

// One read of every local domain, all already Zod-validated by the
// existing lib/storage.ts readers (invalid/corrupted entries silently
// resolve to null/[]/defaults there) — satisfies "validate all local data
// before import" without re-implementing any validation here.
export interface LocalSnapshot {
  storageVersion: number;
  plan: SavedPlanState | null;
  activeWorkout: ActiveWorkout | null;
  history: CompletedWorkout[];
  settings: AppSettings;
  hasStoredSettings: boolean;
  substitutions: SubstitutionHistory;
  goals: Goal[];
}

export function readLocalSnapshot(): LocalSnapshot {
  return {
    storageVersion: EXPORT_VERSION,
    plan: readSavedPlan(),
    activeWorkout: readActiveWorkout(),
    history: readHistory(),
    settings: readSettings(),
    hasStoredSettings: hasStoredSettings(),
    substitutions: readSubstitutionHistory(),
    goals: readGoals(),
  };
}

// Whether there's anything at all worth reviewing for migration — used by
// lib/migration/eligibility.ts to decide whether to offer it in the first
// place. A brand-new signed-out visitor with an empty browser has nothing
// here, and should never see a migration offer.
export function hasAnyLocalData(snapshot: LocalSnapshot): boolean {
  return (
    snapshot.plan !== null ||
    snapshot.activeWorkout !== null ||
    snapshot.history.length > 0 ||
    snapshot.hasStoredSettings ||
    Object.keys(snapshot.substitutions).length > 0 ||
    snapshot.goals.length > 0
  );
}
