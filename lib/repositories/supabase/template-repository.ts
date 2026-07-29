import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Json } from "@/types/database";
import type { WorkoutPlan } from "@/types/workout";
import type { TemplateDay, TemplateSummary, WorkoutTemplate } from "@/types/templates";
import { planFromTemplate, templateFromWorkoutPlan } from "@/lib/templates";
import type { TemplateRepository } from "../template-repository";

type TemplateRow = Database["public"]["Tables"]["workout_templates"]["Row"];
type TemplateDayRow = Database["public"]["Tables"]["workout_template_days"]["Row"];
type TemplateExerciseRow = Database["public"]["Tables"]["workout_template_exercises"]["Row"];
type TemplateRowWithChildren = TemplateRow & {
  workout_template_days: (TemplateDayRow & { workout_template_exercises: TemplateExerciseRow[] })[];
};
// The list view's search fields (day/exercise names) come from a regular
// to-many embed — always an array, never null, even when empty (unlike a
// count() aggregate embed; see the historical null-safety note this
// replaced in git history for the exact PostgREST distinction).
type TemplateSummaryRow = TemplateRow & {
  workout_template_days: { day_name: string; workout_template_exercises: { exercise_name: string }[] }[];
};

type TemplateGoal = WorkoutTemplate["goal"];

const TEMPLATE_WITH_CHILDREN_SELECT = "*, workout_template_days(*, workout_template_exercises(*))";
const TEMPLATE_SUMMARY_SELECT =
  "*, workout_template_days(day_name, workout_template_exercises(exercise_name))";

function devLog(operation: string, templateId: string, error: unknown): void {
  // Never the row/exercise contents themselves — only which operation
  // failed, for which template id, and the raw error object (Supabase
  // errors carry a message/code, never user workout data).
  if (process.env.NODE_ENV !== "production") {
    console.error(`[templates] ${operation} failed:`, { templateId, error });
  }
}

function toTemplateSummary(row: TemplateSummaryRow): TemplateSummary {
  const days = Array.isArray(row.workout_template_days) ? row.workout_template_days : [];
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    goal: row.goal as TemplateGoal,
    daysPerWeek: row.days_per_week,
    dayCount: days.length,
    dayNames: days.map((day) => day.day_name),
    exerciseNames: days.flatMap((day) =>
      (Array.isArray(day.workout_template_exercises) ? day.workout_template_exercises : []).map(
        (exercise) => exercise.exercise_name
      )
    ),
    isFavorite: row.is_favorite,
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
      id: day.id,
      dayNumber: day.day_number,
      dayName: day.day_name,
      focus: day.focus,
      exercises: [...day.workout_template_exercises]
        .sort((a, b) => a.order_index - b.order_index)
        .map((exercise) => ({
          id: exercise.id,
          name: exercise.exercise_name,
          sets: exercise.sets,
          reps: exercise.reps,
          restSeconds: exercise.rest_seconds,
          notes: exercise.notes,
        })),
    })),
    isFavorite: row.is_favorite,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// Shape sent to create_template_tree/replace_template_tree's `p_days`
// jsonb argument — day_number/order_index are NOT included here, since
// both RPCs derive them from each array's position (see
// supabase/migrations/0007_template_favorites.sql), which is what
// guarantees sequential, gap-free, duplicate-free ordering after every
// save rather than trusting whatever indices the client happens to send.
function toDaysPayload(days: TemplateDay[]): Json {
  return days.map((day) => ({
    dayName: day.dayName,
    focus: day.focus,
    exercises: day.exercises.map((exercise) => ({
      name: exercise.name,
      sets: exercise.sets,
      reps: exercise.reps,
      restSeconds: exercise.restSeconds,
      notes: exercise.notes,
    })),
  })) as Json;
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
      return (data as unknown as TemplateSummaryRow[]).map(toTemplateSummary);
    },

    async getTemplate(userId: string, templateId: string): Promise<WorkoutTemplate | null> {
      const { data, error } = await client
        .from("workout_templates")
        .select(TEMPLATE_WITH_CHILDREN_SELECT)
        .eq("user_id", userId)
        .eq("id", templateId)
        .maybeSingle();

      if (error) throw error;
      return data ? toWorkoutTemplate(data as unknown as TemplateRowWithChildren) : null;
    },

    async createTemplate(_userId: string, template: WorkoutTemplate): Promise<void> {
      // create_template_tree inserts the template row and its full
      // day/exercise tree in one transaction — see
      // supabase/migrations/0007_template_favorites.sql. userId isn't
      // passed: the function derives the owner from auth.uid() itself.
      const { error } = await client.rpc("create_template_tree", {
        p_id: template.id,
        p_name: template.name,
        p_description: template.description,
        p_goal: template.goal,
        p_days_per_week: template.daysPerWeek,
        p_days: toDaysPayload(template.days),
      });
      if (error) {
        devLog("create", template.id, error);
        throw error;
      }
    },

    async updateTemplate(_userId: string, template: WorkoutTemplate): Promise<void> {
      // replace_template_tree updates the template's own fields and
      // replaces its entire day/exercise tree in one transaction, so a
      // failure partway through never leaves the template with its old
      // fields but new days (or old days but new fields) — see
      // supabase/migrations/0007_template_favorites.sql.
      const { error } = await client.rpc("replace_template_tree", {
        p_template_id: template.id,
        p_name: template.name,
        p_description: template.description,
        p_goal: template.goal,
        p_days_per_week: template.daysPerWeek,
        p_days: toDaysPayload(template.days),
      });
      if (error) {
        devLog("update", template.id, error);
        throw error;
      }
    },

    async deleteTemplate(userId: string, templateId: string): Promise<void> {
      const { error } = await client.from("workout_templates").delete().eq("user_id", userId).eq("id", templateId);
      if (error) {
        devLog("delete", templateId, error);
        throw error;
      }
    },

    async duplicateTemplate(userId: string, templateId: string, newName: string): Promise<WorkoutTemplate> {
      // duplicate_template_tree reads the source template and writes the
      // copy (fresh template row + fresh day/exercise rows) entirely
      // server-side, in one transaction — see
      // supabase/migrations/0007_template_favorites.sql. This replaces the
      // previous fetch-then-reconstruct-then-insert pattern with a single
      // round trip that can't leave a half-written copy behind.
      const { data: newId, error } = await client.rpc("duplicate_template_tree", {
        p_source_template_id: templateId,
        p_new_name: newName,
      });
      if (error) {
        devLog("duplicate", templateId, error);
        throw error;
      }

      const { data, error: fetchError } = await client
        .from("workout_templates")
        .select(TEMPLATE_WITH_CHILDREN_SELECT)
        .eq("id", newId)
        .eq("user_id", userId)
        .maybeSingle();

      if (fetchError) throw fetchError;
      if (!data) throw new Error(`duplicateTemplate: copy ${newId} of template ${templateId} was not found after creation`);

      return toWorkoutTemplate(data as unknown as TemplateRowWithChildren);
    },

    async saveGeneratedWorkoutAsTemplate(
      _userId: string,
      plan: WorkoutPlan,
      goal: TemplateGoal,
      name: string,
      description: string | null
    ): Promise<WorkoutTemplate> {
      const template = templateFromWorkoutPlan(plan, goal, name, description);
      const { error } = await client.rpc("create_template_tree", {
        p_id: template.id,
        p_name: template.name,
        p_description: template.description,
        p_goal: template.goal,
        p_days_per_week: template.daysPerWeek,
        p_days: toDaysPayload(template.days),
      });
      if (error) {
        devLog("create", template.id, error);
        throw error;
      }
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
      if (!data) throw new Error(`createWorkoutFromTemplate: template ${templateId} not found for this user`);

      return planFromTemplate(toWorkoutTemplate(data as unknown as TemplateRowWithChildren));
    },

    async toggleFavorite(userId: string, templateId: string, isFavorite: boolean): Promise<void> {
      const { error } = await client
        .from("workout_templates")
        .update({ is_favorite: isFavorite })
        .eq("id", templateId)
        .eq("user_id", userId);
      if (error) {
        devLog("favorite", templateId, error);
        throw error;
      }
    },

    async reorderTemplateDays(_userId: string, templateId: string, dayIds: string[]): Promise<void> {
      const { error } = await client.rpc("reorder_template_days", {
        p_template_id: templateId,
        p_day_ids: dayIds,
      });
      if (error) {
        devLog("reorder", templateId, error);
        throw error;
      }
    },

    async reorderTemplateExercises(_userId: string, templateDayId: string, exerciseIds: string[]): Promise<void> {
      const { error } = await client.rpc("reorder_template_exercises", {
        p_template_day_id: templateDayId,
        p_exercise_ids: exerciseIds,
      });
      if (error) {
        devLog("reorder", templateDayId, error);
        throw error;
      }
    },
  };
}
