import type { WorkoutPlan } from "@/types/workout";
import type { TemplateDay, TemplateExercise, TemplateSummary, WorkoutTemplate } from "@/types/templates";
import { GOAL_LABELS } from "./workout-generator";

// Pure helpers for constructing and converting templates — mirrors
// lib/goals.ts#createGoal's pattern (ID/timestamp generation lives here,
// never inline in a component) and lib/workout-generator.ts's exported
// GOAL_LABELS (reused for display, never redefined).

export function createEmptyTemplateExercise(): TemplateExercise {
  return { name: "", sets: 3, reps: "8-12", restSeconds: 90, notes: "" };
}

export function createEmptyTemplateDay(dayNumber: number): TemplateDay {
  return {
    dayNumber,
    dayName: `Day ${dayNumber + 1}`,
    focus: "",
    exercises: [createEmptyTemplateExercise()],
  };
}

export function createTemplate(input: {
  name: string;
  description: string | null;
  goal: WorkoutTemplate["goal"];
  days: TemplateDay[];
}): WorkoutTemplate {
  const now = new Date().toISOString();
  return {
    id: crypto.randomUUID(),
    name: input.name,
    description: input.description,
    goal: input.goal,
    daysPerWeek: input.days.length,
    days: input.days,
    createdAt: now,
    updatedAt: now,
  };
}

export function duplicateTemplateData(template: WorkoutTemplate, newName: string): WorkoutTemplate {
  const now = new Date().toISOString();
  return { ...template, id: crypto.randomUUID(), name: newName, createdAt: now, updatedAt: now };
}

// Used by "Save as Template" on a freshly generated WorkoutPlan
// (components/templates/SaveAsTemplateDialog.tsx via app/page.tsx). Drops
// warmup/cooldown/notes-on-first-exercise-only formatting — a template
// keeps just the reusable sets/reps/rest/notes structure.
export function templateFromWorkoutPlan(
  plan: WorkoutPlan,
  goal: WorkoutTemplate["goal"],
  name: string,
  description: string | null
): WorkoutTemplate {
  const days: TemplateDay[] = plan.weeklySchedule.map((day, index) => ({
    dayNumber: index,
    dayName: day.title,
    focus: day.focus,
    exercises: day.exercises.map((exercise) => ({
      name: exercise.name,
      sets: exercise.sets,
      reps: exercise.reps,
      restSeconds: exercise.restSeconds,
      notes: exercise.notes,
    })),
  }));

  return createTemplate({ name, description, goal, days });
}

// Estimate only — the rule-based generator's own duration formula
// (lib/workout-generator.ts#buildTrainingDay) is tied to equipment-tier
// exercise selection templates don't have; this is an independent,
// approximate estimate for display purposes only, not shared business logic.
const ESTIMATED_SECONDS_PER_SET = 45;
const ESTIMATED_TRANSITION_MINUTES = 10;

// Clamped to OnboardingInputSchema's sessionDurationMinutes bounds
// (10-180) — this estimate feeds preferences.sessionDurationMinutes when a
// template becomes the active plan (see app/page.tsx#handleUseTemplate),
// which must stay valid input even for a template with unusually many
// high-set, high-rest exercises.
function estimateDurationMinutes(day: TemplateDay): number {
  const totalSeconds = day.exercises.reduce(
    (sum, exercise) => sum + exercise.sets * (ESTIMATED_SECONDS_PER_SET + exercise.restSeconds),
    0
  );
  return Math.min(180, Math.max(10, Math.round(totalSeconds / 60) + ESTIMATED_TRANSITION_MINUTES));
}

// Converts a template into a usable WorkoutPlan (e.g. to set as the
// active plan via PlanRepository#saveActivePlan). Templates don't track
// experience level, equipment, or warmup/cooldown, so this fills in
// reasonable generic defaults rather than guessing — documented as a known
// limitation, not silently wrong data.
export function planFromTemplate(template: WorkoutTemplate): WorkoutPlan {
  const weeklySchedule = template.days.map((day) => ({
    day: `Day ${day.dayNumber + 1}`,
    title: day.dayName,
    focus: day.focus,
    estimatedDurationMinutes: estimateDurationMinutes(day),
    warmup: [],
    exercises: day.exercises.map((exercise) => ({
      name: exercise.name,
      sets: exercise.sets,
      reps: exercise.reps,
      restSeconds: exercise.restSeconds,
      notes: exercise.notes,
    })),
    cooldown: [],
  }));

  return {
    summary: {
      goal: GOAL_LABELS[template.goal],
      experienceLevel: "intermediate",
      daysPerWeek: template.daysPerWeek,
      equipment: [],
      sessionDurationMinutes: weeklySchedule[0]?.estimatedDurationMinutes ?? 45,
    },
    weeklySchedule,
    progressionGuidance: [
      "Follow this template's prescribed sets and reps, adjusting weight based on how each set feels.",
    ],
    safetyNotes: ["Warm up before each session and stop any exercise that causes pain."],
    injuryWarning: null,
  };
}

export function toTemplateSummary(template: WorkoutTemplate): TemplateSummary {
  return {
    id: template.id,
    name: template.name,
    description: template.description,
    goal: template.goal,
    daysPerWeek: template.daysPerWeek,
    dayCount: template.days.length,
    createdAt: template.createdAt,
    updatedAt: template.updatedAt,
  };
}
