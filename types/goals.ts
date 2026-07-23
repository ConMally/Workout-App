import { z } from "zod";

// Lightweight goal tracking. Only the goal's *definition* is persisted —
// current value, progress percentage, and completed state are always
// derived live from workout history by lib/goals.ts, never stored, so there
// is no second source of truth that could drift out of sync with history.

export const GoalTypeEnum = z.enum([
  "exercise_weight",
  "exercise_one_rep_max",
  "workout_count",
  "weekly_frequency",
  "streak",
]);
export type GoalType = z.infer<typeof GoalTypeEnum>;

export const GoalSchema = z.object({
  id: z.string(),
  type: GoalTypeEnum,
  title: z.string().min(1).max(120),
  // Only meaningful for exercise_weight / exercise_one_rep_max goals.
  exerciseName: z.string().nullable().default(null),
  targetValue: z.number().positive(),
  targetDate: z.string().nullable().default(null),
  createdAt: z.string(),
});
export type Goal = z.infer<typeof GoalSchema>;

export const GoalListSchema = z.array(GoalSchema);

// ---------------------------------------------------------------------------
// Derived/ephemeral — never persisted.
// ---------------------------------------------------------------------------

export interface GoalProgress {
  currentValue: number;
  progressPercent: number; // 0-100, clamped
  isComplete: boolean;
}
