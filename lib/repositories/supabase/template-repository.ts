import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import type { WorkoutPlan } from "@/types/workout";
import type { TemplateDay, TemplateSummary, WorkoutTemplate } from "@/types/templates";
import { duplicateTemplateData, planFromTemplate, templateFromWorkoutPlan } from "@/lib/templates";
import type { TemplateRepository } from "../template-repository";

type TemplateRow = Database["public"]["Tables"]["workout_templates"]["Row"];
type TemplateDayRow = Database["public"]["Tables"]["workout_template_days"]["Row"];
type TemplateExerciseRow = Database["public"]["Tables"]["workout_template_exercises"]["Row"];
type TemplateRowWithChildren = TemplateRow & {
  workout_template_days: (TemplateDayRow & { workout_template_exercises: TemplateExerciseRow[] })[];
};
// PostgREST's embedded `count` aggregate comes back as a one-element array
// with a `count` field — used by getTemplates to know each template's day
// count without fetching every nested day/exercise row just for a list view.
type TemplateRowWithDayCount = TemplateRow & { workout_template_days: { count: number }[] };

type TemplateGoal = WorkoutTemplate["goal"];

const TEMPLATE_WITH_CHILDREN_SELECT = "*, workout_template_days(*, workout_template_exercises(*))";
const TEMPLATE_SUMMARY_SELECT =
  "id, name, description, goal, days_per_week, created_at, updated_at, workout_template_days(count)";

function toTemplateSummary(row: TemplateRowWithDayCount): TemplateSummary {
  // PostgREST's count() aggregate embed isn't guaranteed to come back as a
  // one-element array the way a regular to-many embed is — for some
  // zero-child cases it comes back `null`/`undefined` instead of `[]`, which
  // would throw on a bare `[0]` index. Guard the array itself, not just the
  // `.count` access.
  const dayCountRows = Array.isArray(row.workout_template_days) ? row.workout_template_days : [];
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    goal: row.goal as TemplateGoal,
    daysPerWeek: row.days_per_week,
    dayCount: dayCountRows[0]?.count ?? 0,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function toWorkoutTemplate(row: TemplateRowWithChildren): WorkoutTemplate {
  const days = [...row.workout_template_days].sort((a, b) => a.day_number - b.day_number);

  return {
    id: row.id,
    name: row.name,
    description: row.description,
    goal: row.goal as TemplateGoal,
    daysPerWeek: row.days_per_week,
    days: days.map((day) => ({
      dayNumber: day.day_number,
      dayName: day.day_name,
      focus: day.focus,
      exercises: [...day.workout_template_exercises]
        .sort((a, b) => a.order_index - b.order_index)
        .map((exercise) => ({
          name: exercise.exercise_name,
          sets: exercise.sets,
          reps: exercise.reps,
          restSeconds: exercise.rest_seconds,
          notes: exercise.notes,
        })),
    })),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

async function insertTemplateDays(
  client: SupabaseClient<Database>,
  userId: string,
  templateId: string,
  days: TemplateDay[]
): Promise<void> {
  const { data: dayRows, error: daysError } = await client
    .from("workout_template_days")
    .insert(
      days.map((day) => ({
        user_id: userId,
        template_id: templateId,
        day_number: day.dayNumber,
        day_name: day.dayName,
        focus: day.focus,
      }))
    )
    .select("id, day_number");

  if (daysError) throw daysError;

  const dayIdByNumber = new Map(dayRows.map((row) => [row.day_number, row.id]));

  const exerciseRows = days.flatMap((day) => {
    const dayId = dayIdByNumber.get(day.dayNumber);
    if (!dayId) return [];
    return day.exercises.map((exercise, orderIndex) => ({
      user_id: userId,
      template_day_id: dayId,
      exercise_name: exercise.name,
      sets: exercise.sets,
      reps: exercise.reps,
      rest_seconds: exercise.restSeconds,
      notes: exercise.notes,
      order_index: orderIndex,
    }));
  });

  if (exerciseRows.length === 0) return;

  const { error: exercisesError } = await client.from("workout_template_exercises").insert(exerciseRows);
  if (exercisesError) throw exercisesError;
}

// Shared by createTemplate, duplicateTemplate, and
// saveGeneratedWorkoutAsTemplate so the insert-then-cleanup-on-failure
// logic lives in exactly one place.
async function insertTemplate(client: SupabaseClient<Database>, userId: string, template: WorkoutTemplate): Promise<void> {
  const { error: templateError } = await client.from("workout_templates").insert({
    id: template.id,
    user_id: userId,
    name: template.name,
    description: template.description,
    goal: template.goal,
    days_per_week: template.daysPerWeek,
    created_at: template.createdAt,
    updated_at: template.updatedAt,
  });

  if (templateError) throw templateError;

  try {
    await insertTemplateDays(client, userId, template.id, template.days);
  } catch (error) {
    await client.from("workout_templates").delete().eq("id", template.id);
    throw error;
  }
}

export function createSupabaseTemplateRepository(client: SupabaseClient<Database>): TemplateRepository {
  return {
    async getTemplates(userId: string): Promise<TemplateSummary[]> {
      const { data, error } = await client
        .from("workout_templates")
        .select(TEMPLATE_SUMMARY_SELECT)
        .eq("user_id", userId)
        .order("updated_at", { ascending: false });

      if (error) throw error;
      return (data as TemplateRowWithDayCount[]).map(toTemplateSummary);
    },

    async getTemplate(userId: string, templateId: string): Promise<WorkoutTemplate | null> {
      const { data, error } = await client
        .from("workout_templates")
        .select(TEMPLATE_WITH_CHILDREN_SELECT)
        .eq("user_id", userId)
        .eq("id", templateId)
        .maybeSingle();

      if (error) throw error;
      return data ? toWorkoutTemplate(data as TemplateRowWithChildren) : null;
    },

    async createTemplate(userId: string, template: WorkoutTemplate): Promise<void> {
      await insertTemplate(client, userId, template);
    },

    async updateTemplate(userId: string, template: WorkoutTemplate): Promise<void> {
      const { error: updateError } = await client
        .from("workout_templates")
        .update({
          name: template.name,
          description: template.description,
          goal: template.goal,
          days_per_week: template.daysPerWeek,
        })
        .eq("id", template.id)
        .eq("user_id", userId);

      if (updateError) throw updateError;

      // Deleting the days cascades to their exercises; re-insert both
      // fresh rather than diffing, matching PlanRepository#updateActivePlan's
      // same overwrite-content-in-place semantics for a stable identity.
      const { error: deleteDaysError } = await client
        .from("workout_template_days")
        .delete()
        .eq("template_id", template.id);
      if (deleteDaysError) throw deleteDaysError;

      await insertTemplateDays(client, userId, template.id, template.days);
    },

    async deleteTemplate(userId: string, templateId: string): Promise<void> {
      const { error } = await client.from("workout_templates").delete().eq("user_id", userId).eq("id", templateId);
      if (error) throw error;
    },

    async duplicateTemplate(userId: string, templateId: string, newName: string): Promise<WorkoutTemplate> {
      const { data, error } = await client
        .from("workout_templates")
        .select(TEMPLATE_WITH_CHILDREN_SELECT)
        .eq("user_id", userId)
        .eq("id", templateId)
        .maybeSingle();

      if (error) throw error;
      if (!data) throw new Error("Template not found");

      const copy = duplicateTemplateData(toWorkoutTemplate(data as TemplateRowWithChildren), newName);
      await insertTemplate(client, userId, copy);
      return copy;
    },

    async saveGeneratedWorkoutAsTemplate(
      userId: string,
      plan: WorkoutPlan,
      goal: TemplateGoal,
      name: string,
      description: string | null
    ): Promise<WorkoutTemplate> {
      const template = templateFromWorkoutPlan(plan, goal, name, description);
      await insertTemplate(client, userId, template);
      return template;
    },

    async createWorkoutFromTemplate(userId: string, templateId: string): Promise<WorkoutPlan> {
      const { data, error } = await client
        .from("workout_templates")
        .select(TEMPLATE_WITH_CHILDREN_SELECT)
        .eq("user_id", userId)
        .eq("id", templateId)
        .maybeSingle();

      if (error) throw error;
      if (!data) throw new Error("Template not found");

      return planFromTemplate(toWorkoutTemplate(data as TemplateRowWithChildren));
    },
  };
}
