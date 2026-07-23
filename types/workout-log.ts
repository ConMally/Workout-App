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

export const AppSettingsSchema = z.object({
  autoStartRestTimer: z.boolean(),
  weightUnit: WeightUnitEnum.default("lbs"),
});
export type AppSettings = z.infer<typeof AppSettingsSchema>;

export const DEFAULT_SETTINGS: AppSettings = {
  autoStartRestTimer: true,
  weightUnit: "lbs",
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
