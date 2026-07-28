import { z } from "zod";
import { GoalEnum } from "@/lib/schemas";

// Reusable, user-authored workout blueprints — distinct from WorkoutPlan
// (lib/schemas.ts), which is the currently-active, AI-generated weekly
// plan. A template has no warmup/cooldown/estimated-duration concept (see
// supabase/migrations/0005_workout_templates.sql) — those are specific to
// the rule-based generator's equipment-tier logic, which templates don't
// track. Reuses GoalEnum from lib/schemas.ts rather than redefining it.

export const TemplateExerciseSchema = z.object({
  name: z.string().min(1).max(120),
  sets: z.number().int().min(1).max(10),
  reps: z.string().min(1).max(20),
  restSeconds: z.number().int().min(0).max(600),
  notes: z.string().max(2000).default(""),
});
export type TemplateExercise = z.infer<typeof TemplateExerciseSchema>;

export const TemplateDaySchema = z.object({
  dayNumber: z.number().int().min(0),
  dayName: z.string().min(1).max(120),
  focus: z.string().max(120).default(""),
  exercises: z.array(TemplateExerciseSchema).min(1),
});
export type TemplateDay = z.infer<typeof TemplateDaySchema>;

export const WorkoutTemplateSchema = z.object({
  id: z.string(),
  name: z.string().min(1).max(120),
  description: z.string().max(1000).nullable().default(null),
  goal: GoalEnum,
  daysPerWeek: z.number().int().min(1).max(7),
  days: z.array(TemplateDaySchema).min(1).max(7),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type WorkoutTemplate = z.infer<typeof WorkoutTemplateSchema>;

// The lightweight list-view projection returned by
// TemplateRepository#getTemplates — no nested days/exercises, so listing a
// user's templates never pulls their full contents over the network just
// to render a card grid. TemplateRepository#getTemplate returns the full
// WorkoutTemplate for the editor.
export interface TemplateSummary {
  id: string;
  name: string;
  description: string | null;
  goal: z.infer<typeof GoalEnum>;
  daysPerWeek: number;
  dayCount: number;
  createdAt: string;
  updatedAt: string;
}
