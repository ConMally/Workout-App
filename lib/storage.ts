import { z } from "zod";
import { OnboardingInputSchema, WorkoutPlanSchema } from "./schemas";
import {
  ActiveWorkoutSchema,
  CompletedWorkoutSchema,
  AppSettingsSchema,
  DEFAULT_SETTINGS,
  type ActiveWorkout,
  type CompletedWorkout,
  type AppSettings,
} from "@/types/workout-log";
import { GoalListSchema, type Goal } from "@/types/goals";

// A small, reusable, versioned localStorage persistence layer.
//
// - Never touches `window` unless actually running in the browser, so every
//   function here is safe to call from a client component's render body —
//   though callers should still only do so inside useEffect, since the
//   initial client render must match the server-rendered HTML.
// - Every value is wrapped in a `{ version, data }` envelope and validated
//   with Zod on read. Invalid, corrupted, or version-mismatched data is
//   discarded (never thrown) so a bad localStorage entry can never crash the
//   app — the caller just gets `null` / a default value back.
// - Bumping a key's version constant is the hook for a future migration:
//   read the raw envelope, branch on `envelope.version`, and transform old
//   shapes into the current one before validating against the new schema.

const STORAGE_PREFIX = "workout-app:";

function isBrowser(): boolean {
  return typeof window !== "undefined";
}

function readEnvelope<T>(key: string, schema: z.ZodType<T>, version: number): T | null {
  if (!isBrowser()) return null;

  try {
    const raw = window.localStorage.getItem(STORAGE_PREFIX + key);
    if (!raw) return null;

    const parsed: unknown = JSON.parse(raw);
    if (
      typeof parsed !== "object" ||
      parsed === null ||
      !("version" in parsed) ||
      !("data" in parsed) ||
      (parsed as { version: unknown }).version !== version
    ) {
      // Missing data, or a version we don't have a migration path for yet —
      // treat as absent rather than guess at its shape.
      return null;
    }

    const result = schema.safeParse((parsed as { data: unknown }).data);
    return result.success ? result.data : null;
  } catch {
    return null;
  }
}

function writeEnvelope<T>(key: string, data: T, version: number): void {
  if (!isBrowser()) return;

  try {
    window.localStorage.setItem(STORAGE_PREFIX + key, JSON.stringify({ version, data }));
  } catch {
    // Quota exceeded, private browsing, storage disabled, etc. — fail
    // silently. The app keeps working in-memory for the rest of the session.
  }
}

function removeKey(key: string): void {
  if (!isBrowser()) return;
  try {
    window.localStorage.removeItem(STORAGE_PREFIX + key);
  } catch {
    // ignore
  }
}

// ---------------------------------------------------------------------------
// Saved plan + preferences
// ---------------------------------------------------------------------------

const PLAN_KEY = "plan";
const PLAN_VERSION = 1;

const SavedPlanStateSchema = z.object({
  preferences: OnboardingInputSchema,
  plan: WorkoutPlanSchema,
  savedAt: z.string(),
});
export type SavedPlanState = z.infer<typeof SavedPlanStateSchema>;

export function readSavedPlan(): SavedPlanState | null {
  return readEnvelope(PLAN_KEY, SavedPlanStateSchema, PLAN_VERSION);
}

export function writeSavedPlan(state: SavedPlanState): void {
  writeEnvelope(PLAN_KEY, state, PLAN_VERSION);
}

export function clearSavedPlan(): void {
  removeKey(PLAN_KEY);
}

// ---------------------------------------------------------------------------
// Active (in-progress) workout — at most one at a time
// ---------------------------------------------------------------------------

const ACTIVE_WORKOUT_KEY = "active-workout";
const ACTIVE_WORKOUT_VERSION = 1;

export function readActiveWorkout(): ActiveWorkout | null {
  return readEnvelope(ACTIVE_WORKOUT_KEY, ActiveWorkoutSchema, ACTIVE_WORKOUT_VERSION);
}

export function writeActiveWorkout(workout: ActiveWorkout): void {
  writeEnvelope(ACTIVE_WORKOUT_KEY, workout, ACTIVE_WORKOUT_VERSION);
}

export function clearActiveWorkout(): void {
  removeKey(ACTIVE_WORKOUT_KEY);
}

// ---------------------------------------------------------------------------
// Completed workout history
// ---------------------------------------------------------------------------

const HISTORY_KEY = "history";
const HISTORY_VERSION = 1;
const HistoryListSchema = z.array(CompletedWorkoutSchema);

export function readHistory(): CompletedWorkout[] {
  return readEnvelope(HISTORY_KEY, HistoryListSchema, HISTORY_VERSION) ?? [];
}

export function writeHistory(history: CompletedWorkout[]): void {
  writeEnvelope(HISTORY_KEY, history, HISTORY_VERSION);
}

// ---------------------------------------------------------------------------
// Settings
// ---------------------------------------------------------------------------

const SETTINGS_KEY = "settings";
const SETTINGS_VERSION = 1;

export function readSettings(): AppSettings {
  return readEnvelope(SETTINGS_KEY, AppSettingsSchema, SETTINGS_VERSION) ?? DEFAULT_SETTINGS;
}

export function writeSettings(settings: AppSettings): void {
  writeEnvelope(SETTINGS_KEY, settings, SETTINGS_VERSION);
}

// readSettings() always returns a usable AppSettings (falling back to
// DEFAULT_SETTINGS), which is right for every normal caller but hides
// whether the user ever actually changed anything — needed by the
// migration preview (lib/migration/preview.ts) so it doesn't offer to
// "import device settings" that are really just untouched defaults.
export function hasStoredSettings(): boolean {
  return readEnvelope(SETTINGS_KEY, AppSettingsSchema, SETTINGS_VERSION) !== null;
}

// ---------------------------------------------------------------------------
// Exercise substitution history — which alternate names have already been
// shown for a given "dayIndex:exerciseIndex" slot in the current saved plan,
// so repeat swaps cycle through options instead of repeating immediately.
// Cleared whenever the plan itself is regenerated or replaced.
// ---------------------------------------------------------------------------

const SUBSTITUTIONS_KEY = "substitutions";
const SUBSTITUTIONS_VERSION = 1;
const SubstitutionHistorySchema = z.record(z.string(), z.array(z.string()));
export type SubstitutionHistory = z.infer<typeof SubstitutionHistorySchema>;

export function readSubstitutionHistory(): SubstitutionHistory {
  return readEnvelope(SUBSTITUTIONS_KEY, SubstitutionHistorySchema, SUBSTITUTIONS_VERSION) ?? {};
}

export function writeSubstitutionHistory(history: SubstitutionHistory): void {
  writeEnvelope(SUBSTITUTIONS_KEY, history, SUBSTITUTIONS_VERSION);
}

export function clearSubstitutionHistory(): void {
  removeKey(SUBSTITUTIONS_KEY);
}

// ---------------------------------------------------------------------------
// Progress goals — definitions only. Current value/progress/completed are
// always computed live from history by lib/goals.ts, never stored here.
// ---------------------------------------------------------------------------

const GOALS_KEY = "goals";
const GOALS_VERSION = 1;

export function readGoals(): Goal[] {
  return readEnvelope(GOALS_KEY, GoalListSchema, GOALS_VERSION) ?? [];
}

export function writeGoals(goals: Goal[]): void {
  writeEnvelope(GOALS_KEY, goals, GOALS_VERSION);
}

// ---------------------------------------------------------------------------
// Export / import — bundles every stored key into one JSON snapshot so a
// user can back up or move their data. Business logic (shape + validation)
// lives here; the Settings UI only handles the file save/open mechanics.
// ---------------------------------------------------------------------------

// Also doubles as the "local storage schema version" recorded on
// migration_status.source_storage_version (lib/migration) — the closest
// existing concept to a single version number for "the shape of this
// browser's local data as a whole".
export const EXPORT_VERSION = 1;

const ExportedDataSchema = z.object({
  version: z.literal(EXPORT_VERSION),
  exportedAt: z.string(),
  plan: SavedPlanStateSchema.nullable(),
  activeWorkout: ActiveWorkoutSchema.nullable(),
  history: HistoryListSchema,
  settings: AppSettingsSchema,
  substitutions: SubstitutionHistorySchema,
  // Additive + defaulted (not a version bump) so export files created
  // before goal tracking existed still import cleanly with goals: [].
  goals: GoalListSchema.default([]),
});
export type ExportedData = z.infer<typeof ExportedDataSchema>;

export function exportAllData(): ExportedData {
  return {
    version: EXPORT_VERSION,
    exportedAt: new Date().toISOString(),
    plan: readSavedPlan(),
    activeWorkout: readActiveWorkout(),
    history: readHistory(),
    settings: readSettings(),
    substitutions: readSubstitutionHistory(),
    goals: readGoals(),
  };
}

// Removes exactly the app's own known keys — never localStorage.clear(),
// which would also wipe anything unrelated another script on the same
// origin might have stored. Used only after a verified-successful cloud
// migration, and only when the user explicitly asks for it (see
// components/migration/MigrationPanel.tsx) — never automatically.
export function clearAllLocalAppData(): void {
  removeKey(PLAN_KEY);
  removeKey(ACTIVE_WORKOUT_KEY);
  removeKey(HISTORY_KEY);
  removeKey(SETTINGS_KEY);
  removeKey(SUBSTITUTIONS_KEY);
  removeKey(GOALS_KEY);
}

export function importAllData(raw: unknown): boolean {
  const result = ExportedDataSchema.safeParse(raw);
  if (!result.success) return false;

  const data = result.data;
  if (data.plan) writeSavedPlan(data.plan);
  else clearSavedPlan();

  if (data.activeWorkout) writeActiveWorkout(data.activeWorkout);
  else clearActiveWorkout();

  writeHistory(data.history);
  writeSettings(data.settings);
  writeSubstitutionHistory(data.substitutions);
  writeGoals(data.goals);
  return true;
}
