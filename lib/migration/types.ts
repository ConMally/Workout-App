import type { Database } from "@/types/database";

// The full lifecycle a migration_status row can be in. Mirrors the check
// constraint added in supabase/migrations/0003_migration_support.sql.
export type MigrationStatusValue = Database["public"]["Tables"]["migration_status"]["Row"]["status"];

// Ordered stages a run works through. Each is independently idempotent and
// retryable — see lib/migration/run.ts.
export const MIGRATION_STAGES = [
  "settings",
  "plan",
  "substitutions",
  "goals",
  "history",
  "active_workout",
] as const;
export type MigrationStage = (typeof MIGRATION_STAGES)[number];

export type MigrationDomain =
  | "settings"
  | "plan"
  | "substitutions"
  | "goals"
  | "history"
  | "readiness"
  | "personalRecords"
  | "activeWorkout";

export type MigrationCounts = Partial<Record<MigrationDomain, number>>;

// What the review screen shows before any writes happen — purely computed
// from the local snapshot plus a handful of existence checks against the
// signed-in user's current cloud data (never a full cloud fetch).
export interface MigrationPreview {
  hasPlan: boolean;
  hasActiveWorkout: boolean;
  completedWorkoutCount: number;
  completedSetCount: number;
  prCount: number;
  goalCount: number;
  readinessCount: number;
  // Always 0 this phase — no local feature ever wrote standalone exercise
  // notes (see lib/storage.ts) — shown for parity with the cloud domain list.
  exerciseNoteCount: number;
  hasStoredSettings: boolean;
  substitutionEntryCount: number;
  historyDateRange: { earliest: string; latest: string } | null;
  cloud: {
    hasPlan: boolean;
    hasActiveWorkout: boolean;
    hasSubstitutions: boolean;
  };
}

export type SettingsChoice = "cloud" | "device";
export type ActiveWorkoutChoice = "cloud" | "device";

export interface MigrationChoices {
  settings: SettingsChoice;
  // Only consulted when MigrationPreview.cloud.hasActiveWorkout is true —
  // otherwise the device's active workout (if any) is imported unconditionally.
  activeWorkout: ActiveWorkoutChoice;
}

export interface MigrationOutcome {
  status: Extract<MigrationStatusValue, "completed" | "partially_failed">;
  imported: MigrationCounts;
  skipped: MigrationCounts;
  failed: MigrationCounts;
  // User-safe summary only — never a raw error object. See
  // lib/supabase/data-errors.ts#getFriendlyDataErrorMessage.
  errorSummary: string | null;
}

export interface MigrationStatusRow {
  status: MigrationStatusValue;
  startedAt: string | null;
  completedAt: string | null;
  batchId: string | null;
  sourceStorageVersion: number | null;
  currentStage: MigrationStage | null;
  importedCounts: MigrationCounts | null;
  skippedCounts: MigrationCounts | null;
  failedCounts: MigrationCounts | null;
  retryCount: number;
  errorMessage: string | null;
}
