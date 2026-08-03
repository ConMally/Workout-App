import type { ExerciseDefinition } from "@/types/exercises";
import type { TemplateDay, TemplateExercise, TemplateSummary, WorkoutTemplate } from "@/types/templates";
import type { WorkoutPlan } from "@/types/workout";
import { getExerciseById, getExerciseByName } from "./exercises/library";
import { GOAL_LABELS } from "./workout-generator";

// Pure helpers for constructing and converting templates — mirrors
// lib/goals.ts#createGoal's pattern (ID/timestamp generation lives here,
// never inline in a component) and lib/workout-generator.ts's exported
// GOAL_LABELS (reused for display, never redefined).

// Swaps the item at `index` with its neighbor — the shared move-up/
// move-down primitive behind every reorder control (days in TemplateEditor,
// exercises in TemplateDayEditor). A no-op at either end of the array
// rather than wrapping, matching how "Move up"/"Move down" buttons
// naturally disable at the boundary.
export function moveItem<T>(items: T[], index: number, direction: "up" | "down"): T[] {
  const targetIndex = direction === "up" ? index - 1 : index + 1;
  if (targetIndex < 0 || targetIndex >= items.length) return items;
  const next = [...items];
  [next[index], next[targetIndex]] = [next[targetIndex], next[index]];
  return next;
}

// Only way a TemplateExercise is ever created now — exercise selection goes
// through ExercisePickerDialog (library-only, no free-text name entry), so
// exerciseId is always populated here rather than left to be resolved
// later. Sets/reps/rest start from the definition's own recommendations
// (still fully editable afterward) instead of a generic 3x8-12 guess.
export function templateExerciseFromDefinition(definition: ExerciseDefinition): TemplateExercise {
  return {
    id: crypto.randomUUID(),
    exerciseId: definition.id,
    name: definition.name,
    sets: 3,
    reps: `${definition.recommendedRepRange.min}-${definition.recommendedRepRange.max}`,
    restSeconds: definition.recommendedRestSeconds.min,
    notes: "",
  };
}

// Starts with zero exercises rather than one blank one — there's no more
// "blank" exercise to create (see templateExerciseFromDefinition above), so
// a fresh day just prompts "+ Add exercise" via the picker.
// validateTemplateInput's "Add at least one exercise" check is what
// actually blocks saving a day with none, same as it always has.
export function createEmptyTemplateDay(dayNumber: number): TemplateDay {
  return {
    id: crypto.randomUUID(),
    dayNumber,
    dayName: `Day ${dayNumber + 1}`,
    focus: "",
    exercises: [],
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
    isFavorite: false,
    createdAt: now,
    updatedAt: now,
  };
}

// Deep-copies days/exercises with fresh ids rather than sharing references
// with the source template, so nothing about the copy can ever alias back
// into (and risk mutating) the original — matters most for the local
// repository, which keeps every template as a plain object in localStorage;
// the Supabase repository instead duplicates entirely server-side via the
// duplicate_template_tree RPC and only uses this for its return value's
// shape, not to build the actual rows written to the database.
// A duplicate never inherits isFavorite — starting unfavorited matches the
// "it's a new item" expectation and avoids double-counting a preferred
// template that also has favorited copies floating around.
export function duplicateTemplateData(template: WorkoutTemplate, newName: string): WorkoutTemplate {
  const now = new Date().toISOString();
  return {
    ...template,
    id: crypto.randomUUID(),
    name: newName,
    isFavorite: false,
    days: template.days.map((day) => ({
      ...day,
      id: crypto.randomUUID(),
      exercises: day.exercises.map((exercise) => ({ ...exercise, id: crypto.randomUUID() })),
    })),
    createdAt: now,
    updatedAt: now,
  };
}

// "<Original Name> Copy", then "<Original Name> Copy 2", "Copy 3", etc. —
// checked case-insensitively against every existing template name so the
// suggested name is never a silent collision. `existingNames` should
// include every template's current name except the source template itself
// (duplicating never needs to avoid colliding with the thing it's copying).
export function nextDuplicateName(baseName: string, existingNames: string[]): string {
  const taken = new Set(existingNames.map((name) => name.trim().toLowerCase()));
  let candidate = `${baseName} Copy`;
  let n = 2;
  while (taken.has(candidate.trim().toLowerCase())) {
    candidate = `${baseName} Copy ${n}`;
    n += 1;
  }
  return candidate;
}

// Used by "Save as Template" on a freshly generated WorkoutPlan
// (components/templates/SaveAsTemplateDialog.tsx via app/page.tsx). Drops
// warmup/cooldown/notes-on-first-exercise-only formatting — a template
// keeps just the reusable sets/reps/rest/notes structure.
//
// The rule-based generator (lib/workout-generator.ts) builds exercises by
// name from its own pools, entirely independent of the centralized
// exercise library — so every exercise here is resolved to a library id by
// exact name/alias match on a best-effort basis. A generator exercise that
// doesn't resolve still becomes a normal (legacy-style) template exercise —
// never dropped, never blocked — but logs a dev-only warning, since an
// unresolved name here means the generator's pool and the library have
// drifted apart, which is worth a developer's attention rather than
// silently shipping an instruction-less template entry with no signal.
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
    exercises: day.exercises.map((exercise) => {
      const definition = getExerciseByName(exercise.name);
      if (!definition && process.env.NODE_ENV !== "production") {
        console.error(
          `[templates] templateFromWorkoutPlan: generated exercise "${exercise.name}" has no match in the centralized exercise library — saved as a legacy entry with no id.`
        );
      }
      return {
        exerciseId: definition?.id ?? null,
        name: exercise.name,
        sets: exercise.sets,
        reps: exercise.reps,
        restSeconds: exercise.restSeconds,
        notes: exercise.notes,
      };
    }),
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
    dayNames: template.days.map((day) => day.dayName),
    exerciseNames: template.days.flatMap((day) => day.exercises.map((exercise) => exercise.name)),
    isFavorite: template.isFavorite,
    createdAt: template.createdAt,
    updatedAt: template.updatedAt,
  };
}

// Case-insensitive substring match across name, description, day names, and
// exercise names — everything the Templates search box is documented to
// search by. Pure and synchronous so TemplateList can run it in a
// useMemo over the already-loaded template list on every keystroke without
// ever touching the network (see components/templates/TemplateToolbar.tsx).
export function searchTemplates(templates: TemplateSummary[], query: string): TemplateSummary[] {
  const q = query.trim().toLowerCase();
  if (!q) return templates;

  return templates.filter((template) => {
    const haystacks = [
      template.name,
      template.description ?? "",
      ...template.dayNames,
      ...template.exerciseNames,
    ];
    return haystacks.some((text) => text.toLowerCase().includes(q));
  });
}

export type TemplateFilter = "all" | "favorites";

export function filterTemplates(templates: TemplateSummary[], filter: TemplateFilter): TemplateSummary[] {
  return filter === "favorites" ? templates.filter((template) => template.isFavorite) : templates;
}

export type TemplateSortMode = "favorites_first" | "recently_updated" | "name_asc" | "name_desc";

export const TEMPLATE_SORT_LABELS: Record<TemplateSortMode, string> = {
  favorites_first: "Favorites first",
  recently_updated: "Recently updated",
  name_asc: "Name A–Z",
  name_desc: "Name Z–A",
};

// Every mode breaks ties by most-recently-updated, so the ordering never
// looks arbitrary for templates that are otherwise equal (same favorite
// state, same name) — a stable secondary sort per this phase's favorites
// requirement, generalized to the other sort modes too.
export function sortTemplates(templates: TemplateSummary[], mode: TemplateSortMode): TemplateSummary[] {
  const byRecency = (a: TemplateSummary, b: TemplateSummary) =>
    new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();

  const sorted = [...templates];
  switch (mode) {
    case "favorites_first":
      return sorted.sort((a, b) => Number(b.isFavorite) - Number(a.isFavorite) || byRecency(a, b));
    case "recently_updated":
      return sorted.sort(byRecency);
    case "name_asc":
      return sorted.sort((a, b) => a.name.localeCompare(b.name) || byRecency(a, b));
    case "name_desc":
      return sorted.sort((a, b) => b.name.localeCompare(a.name) || byRecency(a, b));
  }
}

// Field-scoped validation for TemplateEditor. Each issue's `path` matches
// the field it belongs to (see the *_ERROR_PATH helpers below) so the
// editor can render every message right under the input it describes,
// rather than a single generic banner — TemplateDayEditor/
// TemplateExerciseEditor look their own errors up by path, keyed the same
// way aria-describedby ties an input to its error paragraph elsewhere in
// this app (see components/auth/PasswordInput.tsx).
export interface TemplateValidationIssue {
  path: string;
  message: string;
}

export const nameErrorPath = () => "name";
export const dayNameErrorPath = (dayIndex: number) => `day-${dayIndex}-name`;
export const dayExercisesErrorPath = (dayIndex: number) => `day-${dayIndex}-exercises`;
export const exerciseFieldErrorPath = (dayIndex: number, exerciseIndex: number, field: string) =>
  `exercise-${dayIndex}-${exerciseIndex}-${field}`;

export function validateTemplateInput(input: { name: string; days: TemplateDay[] }): TemplateValidationIssue[] {
  const issues: TemplateValidationIssue[] = [];

  if (!input.name.trim()) {
    issues.push({ path: nameErrorPath(), message: "Give this template a name." });
  }

  if (input.days.length === 0) {
    issues.push({ path: "days", message: "Add at least one day." });
  }

  input.days.forEach((day, dayIndex) => {
    if (!day.dayName.trim()) {
      issues.push({ path: dayNameErrorPath(dayIndex), message: "Name this day." });
    }
    if (day.exercises.length === 0) {
      issues.push({ path: dayExercisesErrorPath(dayIndex), message: "Add at least one exercise." });
    }
    day.exercises.forEach((exercise, exerciseIndex) => {
      if (!exercise.name.trim()) {
        issues.push({
          path: exerciseFieldErrorPath(dayIndex, exerciseIndex, "name"),
          message: "Name this exercise.",
        });
      }
      if (!Number.isInteger(exercise.sets) || exercise.sets < 1) {
        issues.push({
          path: exerciseFieldErrorPath(dayIndex, exerciseIndex, "sets"),
          message: "Sets must be a positive whole number.",
        });
      }
      if (!exercise.reps.trim()) {
        issues.push({
          path: exerciseFieldErrorPath(dayIndex, exerciseIndex, "reps"),
          message: "Enter a rep target (e.g. 8-12).",
        });
      }
      if (!Number.isInteger(exercise.restSeconds) || exercise.restSeconds < 0) {
        issues.push({
          path: exerciseFieldErrorPath(dayIndex, exerciseIndex, "rest"),
          message: "Rest must be zero or greater.",
        });
      }
      // Only checked when an id is actually present — a legacy exercise
      // (exerciseId null) is always allowed to save as-is, per "do not
      // prevent users from viewing or using old templates solely because
      // they contain a legacy name." This instead catches the one case
      // that *should* block saving: an id that was valid when set but no
      // longer resolves (a defensive integrity check, not expected to fire
      // in normal use since ExercisePickerDialog only ever hands back real
      // library ids).
      if (exercise.exerciseId && !getExerciseById(exercise.exerciseId)) {
        issues.push({
          path: exerciseFieldErrorPath(dayIndex, exerciseIndex, "name"),
          message: "This exercise is no longer in the library — replace it before saving.",
        });
      }
    });
  });

  return issues;
}
