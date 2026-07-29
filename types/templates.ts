import { z } from "zod";
import { GoalEnum } from "@/lib/schemas";

// Reusable, user-authored workout blueprints — distinct from WorkoutPlan
// (lib/schemas.ts), which is the currently-active, AI-generated weekly
// plan. A template has no warmup/cooldown/estimated-duration concept (see
// supabase/migrations/0005_workout_templates.sql) — those are specific to
// the rule-based generator's equipment-tier logic, which templates don't
// track. Reuses GoalEnum from lib/schemas.ts rather than redefining it.

// `id` is optional: present for a day/exercise that already has a row in
// Supabase (loaded via getTemplate, or reachable via getTemplates' search
// fields), absent for one just created in the editor and never saved yet.
// It's never sent to create_template_tree/replace_template_tree (those
// derive day_number/order_index from array position, not from this id) —
// it exists purely so the UI has a stable React key/drag-reorder target,
// and so reorder_template_days/reorder_template_exercises have something
// to reorder by for an already-persisted template.
export const TemplateExerciseSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1).max(120),
  sets: z.number().int().min(1).max(10),
  reps: z.string().min(1).max(20),
  restSeconds: z.number().int().min(0).max(600),
  notes: z.string().max(2000).default(""),
});
export type TemplateExercise = z.infer<typeof TemplateExerciseSchema>;

export const TemplateDaySchema = z.object({
  id: z.string().optional(),
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
  isFavorite: z.boolean().default(false),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type WorkoutTemplate = z.infer<typeof WorkoutTemplateSchema>;

// The lightweight list-view projection returned by
// TemplateRepository#getTemplates — no full nested days/exercises (sets,
// reps, rest, notes), so listing a user's templates never pulls their full
// contents over the network just to render a card grid.
// TemplateRepository#getTemplate returns the full WorkoutTemplate for the
// editor. dayNames/exerciseNames carry just enough text to power
// client-side search (see lib/templates.ts#searchTemplates) without a
// per-keystroke round trip to Supabase.
export interface TemplateSummary {
  id: string;
  name: string;
  description: string | null;
  goal: z.infer<typeof GoalEnum>;
  daysPerWeek: number;
  dayCount: number;
  dayNames: string[];
  exerciseNames: string[];
  isFavorite: boolean;
  createdAt: string;
  updatedAt: string;
}
