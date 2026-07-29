import type { WorkoutPlan } from "@/types/workout";
import type { TemplateSummary, WorkoutTemplate } from "@/types/templates";

// Reusable, user-authored workout blueprints — distinct from PlanRepository
// (the single currently-active, AI-generated weekly plan). Every method
// takes userId first, same symmetry/trust rules as every other repository:
// never trusted as an authorization boundary by itself (RLS enforces the
// real ownership check on the cloud implementation).
//
// getTemplates returns TemplateSummary (no nested days/exercises) so
// listing never pulls full contents over the network just to render a card
// grid — getTemplate returns the full WorkoutTemplate for the editor.
export interface TemplateRepository {
  getTemplates(userId: string): Promise<TemplateSummary[]>;
  getTemplate(userId: string, templateId: string): Promise<WorkoutTemplate | null>;
  createTemplate(userId: string, template: WorkoutTemplate): Promise<void>;
  updateTemplate(userId: string, template: WorkoutTemplate): Promise<void>;
  deleteTemplate(userId: string, templateId: string): Promise<void>;
  duplicateTemplate(userId: string, templateId: string, newName: string): Promise<WorkoutTemplate>;
  // goal is passed explicitly rather than derived from plan.summary.goal,
  // which is already a display label (e.g. "Build muscle") by the time a
  // plan exists — the caller (app/page.tsx) still has the raw enum value
  // from the onboarding form that produced this plan.
  saveGeneratedWorkoutAsTemplate(
    userId: string,
    plan: WorkoutPlan,
    goal: WorkoutTemplate["goal"],
    name: string,
    description: string | null
  ): Promise<WorkoutTemplate>;
  createWorkoutFromTemplate(userId: string, templateId: string): Promise<WorkoutPlan>;
  toggleFavorite(userId: string, templateId: string, isFavorite: boolean): Promise<void>;
  // dayIds/exerciseIds must be every id currently belonging to the
  // template/day, in the desired final order — a partial list is rejected
  // rather than silently reordering a subset (see
  // supabase/migrations/0007_template_favorites.sql's row-count check).
  reorderTemplateDays(userId: string, templateId: string, dayIds: string[]): Promise<void>;
  reorderTemplateExercises(userId: string, templateDayId: string, exerciseIds: string[]): Promise<void>;
}
