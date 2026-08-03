import { z } from "zod";

// Types and Zod schemas for the "workout log" domain: logging an active
// workout, completed workout history, and app settings. Kept separate from
// lib/schemas.ts, which owns the onboarding-input / generated-plan contract
// used by the rule-based generator — this file has no dependency on that
// generator and doesn't influence its behavior.

export const LoggedSetSchema = z.object({
  setNumber: z.number().int().min(1),
  weight: z.number().min(0).max(2000).nullable(),
  reps: z.number().int().min(0).max(200).nullable(),
  completed: z.boolean(),
});
export type LoggedSet = z.infer<typeof LoggedSetSchema>;

export const LoggedExerciseSchema = z.object({
  name: z.string(),
  // Stable centralized-exercise-library id, resolved by name/alias at
  // workout-creation time (see lib/workout-log.ts#createActiveWorkout) —
  // nullable/defaulted so every active/completed workout logged before this
  // field existed still parses. FocusedExercise looks up guide metadata by
  // this id first, falling back to name/alias matching only when it's null
  // (legacy record, or a name the library has never had) — see
  // lib/exercises/library.ts#resolveExerciseDefinition.
  exerciseId: z.string().nullable().default(null),
  targetSets: z.number().int().min(1),
  targetReps: z.string(),
  targetRestSeconds: z.number().int().min(0),
  sets: z.array(LoggedSetSchema),
  completed: z.boolean(),
  note: z.string().max(2000),
});
export type LoggedExercise = z.infer<typeof LoggedExerciseSchema>;

export const ActiveWorkoutSchema = z.object({
  id: z.string(),
  startedAt: z.string(),
  dayIndex: z.number().int().min(0),
  dayLabel: z.string(),
  dayTitle: z.string(),
  dayFocus: z.string(),
  exercises: z.array(LoggedExerciseSchema).min(1),
  // Which exercise the focused active-workout UI currently shows (Phase
  // 6.1). Nullable/defaulted so workouts started before this field existed
  // still parse — see lib/workout-log.ts#resolveActiveExerciseIndex for the
  // fallback when this is null or out of range.
  activeExerciseIndex: z.number().int().min(0).nullable().default(null),
});
export type ActiveWorkout = z.infer<typeof ActiveWorkoutSchema>;

// Post-workout readiness check-in. Entirely optional and skippable, and each
// field is independently nullable so a partial check-in (e.g. the user rated
// energy but skipped soreness) is a valid, expected state — not an error.
export const ReadinessSchema = z.object({
  difficulty: z.number().int().min(1).max(10).nullable(),
  energy: z.number().int().min(1).max(10).nullable(),
  soreness: z.number().int().min(1).max(10).nullable(),
  sleepQuality: z.number().int().min(1).max(10).nullable(),
  satisfaction: z.number().int().min(1).max(10).nullable(),
});
export type Readiness = z.infer<typeof ReadinessSchema>;

export const CompletedWorkoutSchema = z.object({
  id: z.string(),
  completedAt: z.string(),
  dayIndex: z.number().int().min(0).default(0),
  dayLabel: z.string(),
  dayTitle: z.string(),
  dayFocus: z.string(),
  durationSeconds: z.number().int().min(0).nullable(),
  exercises: z.array(LoggedExerciseSchema),
  // Additive + defaulted (not a new storage version) so workouts logged
  // before this feature existed still parse safely with readiness: null.
  readiness: ReadinessSchema.nullable().default(null),
});
export type CompletedWorkout = z.infer<typeof CompletedWorkoutSchema>;

export const WeightUnitEnum = z.enum(["lbs", "kg"]);
export type WeightUnit = z.infer<typeof WeightUnitEnum>;

// Phase 7: personalization. Every new field is defaulted so settings rows
// saved before this phase (locally or in Supabase) still parse — nothing
// here is a breaking storage-version bump, same convention as
// CompletedWorkoutSchema#readiness above.
export const AppSettingsSchema = z.object({
  autoStartRestTimer: z.boolean(),
  weightUnit: WeightUnitEnum.default("lbs"),
  // Workout
  timerSound: z.boolean().default(true),
  vibration: z.boolean().default(true),
  defaultRestSeconds: z.number().int().min(0).max(600).default(90),
  // Deprecated: the exercise guide in the active-workout focused view is
  // now always collapsed until the user opens it by hand (see
  // components/workout/FocusedExercise.tsx) — there's no longer an
  // "automatically" behavior for this to control. The field stays (rather
  // than being dropped) purely so existing stored settings rows keep
  // parsing; nothing reads it anymore, and the UI no longer exposes a
  // control for it (see components/settings/SettingsPanel.tsx).
  showExerciseGuideAutomatically: z.boolean().default(true),
  // Appearance
  darkMode: z.boolean().default(false),
  compactMode: z.boolean().default(false),
  largerText: z.boolean().default(false),
  // Notifications — preferences only; no reminder-delivery infrastructure
  // exists yet (no email/push service), see docs note in SettingsPanel.
  workoutReminders: z.boolean().default(false),
  weeklySummary: z.boolean().default(false),
  streakReminders: z.boolean().default(false),
});
export type AppSettings = z.infer<typeof AppSettingsSchema>;

export const DEFAULT_SETTINGS: AppSettings = {
  autoStartRestTimer: true,
  weightUnit: "lbs",
  timerSound: true,
  vibration: true,
  defaultRestSeconds: 90,
  showExerciseGuideAutomatically: true,
  darkMode: false,
  compactMode: false,
  largerText: false,
  workoutReminders: false,
  weeklySummary: false,
  streakReminders: false,
};

// ---------------------------------------------------------------------------
// Derived/ephemeral shapes — never persisted, so no Zod schema is needed.
// ---------------------------------------------------------------------------

export type ProgressionSuggestionType = "increase_weight" | "hold_or_decrease_weight" | "hold";

export interface ProgressionSuggestion {
  type: ProgressionSuggestionType;
  message: string;
}

export type PersonalRecordType = "heaviest_weight" | "most_reps_at_weight" | "estimated_one_rep_max";

export interface PersonalRecordEvent {
  exerciseName: string;
  type: PersonalRecordType;
  newValue: number;
  previousValue: number;
  detail: string;
}
