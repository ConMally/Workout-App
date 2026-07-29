import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import type { OnboardingInput, WorkoutPlan } from "@/lib/schemas";
import { GOAL_LABELS, EQUIPMENT_LABELS } from "@/lib/workout-generator";
import type { SavedPlanState } from "@/lib/storage";
import type { PlanRepository } from "../plan-repository";

// Mirrors generateWorkoutPlan's summary construction in
// lib/workout-generator.ts exactly (goal/equipment as pretty labels,
// everything else raw) so a plan round-tripped through Supabase renders
// identically to one freshly generated.

type PlanRow = Database["public"]["Tables"]["workout_plans"]["Row"];
type PlanDayRow = Database["public"]["Tables"]["workout_plan_days"]["Row"];
type PlanExerciseRow = Database["public"]["Tables"]["workout_plan_exercises"]["Row"];
type PlanRowWithChildren = PlanRow & {
  workout_plan_days: (PlanDayRow & { workout_plan_exercises: PlanExerciseRow[] })[];
};

type Goal = OnboardingInput["goal"];
type Equipment = OnboardingInput["equipment"][number];
type WarmupItem = { name: string; duration: string };

const PLAN_WITH_CHILDREN_SELECT = "*, workout_plan_days(*, workout_plan_exercises(*))";

function toSavedPlanState(row: PlanRowWithChildren): SavedPlanState {
  const goal = row.goal as Goal;
  const equipment = row.equipment as Equipment[];

  const days = [...row.workout_plan_days].sort((a, b) => a.day_index - b.day_index);

  const weeklySchedule: WorkoutPlan["weeklySchedule"] = days.map((day) => ({
    day: day.day_label,
    title: day.title,
    focus: day.focus,
    estimatedDurationMinutes: day.estimated_duration_minutes,
    warmup: (day.warmup as WarmupItem[] | null) ?? [],
    cooldown: (day.cooldown as WarmupItem[] | null) ?? [],
    exercises: [...day.workout_plan_exercises]
      .sort((a, b) => a.sort_order - b.sort_order)
      .map((exercise) => ({
        name: exercise.name,
        sets: exercise.sets,
        reps: exercise.reps,
        restSeconds: exercise.rest_seconds,
        notes: exercise.notes,
      })),
  }));

  return {
    preferences: {
      goal,
      experienceLevel: row.experience_level as OnboardingInput["experienceLevel"],
      daysPerWeek: row.days_per_week,
      equipment,
      sessionDurationMinutes: row.session_duration_minutes,
      injuriesOrLimitations: row.injuries_or_limitations,
      exercisePreferences: row.exercise_preferences,
    },
    plan: {
      summary: {
        goal: GOAL_LABELS[goal],
        experienceLevel: row.experience_level,
        daysPerWeek: row.days_per_week,
        equipment: equipment.map((item) => EQUIPMENT_LABELS[item]),
        sessionDurationMinutes: row.session_duration_minutes,
      },
      weeklySchedule,
      progressionGuidance: row.progression_guidance,
      safetyNotes: row.safety_notes,
      injuryWarning: row.injury_warning,
    },
    savedAt: row.updated_at,
  };
}

// Inserts a brand-new plan (+ its days + its exercises) for a user who is
// known to have no existing plan row. Callers are responsible for removing
// any prior plan row first — the unique index on (user_id) where is_active
// means a stale row here fails the insert.
async function insertPlan(
  client: SupabaseClient<Database>,
  userId: string,
  state: SavedPlanState
): Promise<void> {
  const { preferences, plan } = state;

  const { data: planRow, error: planError } = await client
    .from("workout_plans")
    .insert({
      user_id: userId,
      goal: preferences.goal,
      experience_level: preferences.experienceLevel,
      days_per_week: preferences.daysPerWeek,
      equipment: preferences.equipment,
      session_duration_minutes: preferences.sessionDurationMinutes,
      injuries_or_limitations: preferences.injuriesOrLimitations,
      exercise_preferences: preferences.exercisePreferences,
      progression_guidance: plan.progressionGuidance,
      safety_notes: plan.safetyNotes,
      injury_warning: plan.injuryWarning,
    })
    .select("id")
    .single();

  if (planError) throw planError;

  try {
    await insertPlanChildren(client, userId, planRow.id, plan);
  } catch (error) {
    // Best-effort cleanup: remove the orphaned plan row (cascades to any
    // days/exercises that did make it in) rather than leaving a plan with
    // missing or partial content behind.
    await client.from("workout_plans").delete().eq("id", planRow.id);
    throw error;
  }
}

async function insertPlanChildren(
  client: SupabaseClient<Database>,
  userId: string,
  planId: string,
  plan: WorkoutPlan
): Promise<void> {
  const { data: dayRows, error: daysError } = await client
    .from("workout_plan_days")
    .insert(
      plan.weeklySchedule.map((day, dayIndex) => ({
        user_id: userId,
        workout_plan_id: planId,
        day_index: dayIndex,
        day_label: day.day,
        title: day.title,
        focus: day.focus,
        estimated_duration_minutes: day.estimatedDurationMinutes,
        warmup: day.warmup,
        cooldown: day.cooldown,
      }))
    )
    .select("id, day_index");

  if (daysError) throw daysError;

  const dayIdByIndex = new Map(dayRows.map((row) => [row.day_index, row.id]));

  const exerciseRows = plan.weeklySchedule.flatMap((day, dayIndex) => {
    const dayId = dayIdByIndex.get(dayIndex);
    if (!dayId) return [];
    return day.exercises.map((exercise, sortOrder) => ({
      user_id: userId,
      workout_plan_day_id: dayId,
      sort_order: sortOrder,
      name: exercise.name,
      sets: exercise.sets,
      reps: exercise.reps,
      rest_seconds: exercise.restSeconds,
      notes: exercise.notes,
    }));
  });

  if (exerciseRows.length === 0) return;

  const { error: exercisesError } = await client.from("workout_plan_exercises").insert(exerciseRows);
  if (exercisesError) throw exercisesError;
}

export function createSupabasePlanRepository(client: SupabaseClient<Database>): PlanRepository {
  return {
    async getActivePlan(userId: string): Promise<SavedPlanState | null> {
      const { data, error } = await client
        .from("workout_plans")
        .select(PLAN_WITH_CHILDREN_SELECT)
        .eq("user_id", userId)
        .maybeSingle();

      if (error) throw error;
      return data ? toSavedPlanState(data as unknown as PlanRowWithChildren) : null;
    },

    // Generating/regenerating a plan is a new plan identity: remove any
    // existing plan (cascades away its days/exercises) and insert fresh.
    async saveActivePlan(userId: string, state: SavedPlanState): Promise<void> {
      const { error: deleteError } = await client.from("workout_plans").delete().eq("user_id", userId);
      if (deleteError) throw deleteError;

      await insertPlan(client, userId, state);
    },

    // Same plan identity, new content (e.g. an exercise swap). Update the
    // plan-level row in place and replace its days/exercises wholesale.
    async updateActivePlan(userId: string, state: SavedPlanState): Promise<void> {
      const { data: existing, error: findError } = await client
        .from("workout_plans")
        .select("id")
        .eq("user_id", userId)
        .maybeSingle();

      if (findError) throw findError;

      if (!existing) {
        await insertPlan(client, userId, state);
        return;
      }

      const { preferences, plan } = state;
      const { error: updateError } = await client
        .from("workout_plans")
        .update({
          goal: preferences.goal,
          experience_level: preferences.experienceLevel,
          days_per_week: preferences.daysPerWeek,
          equipment: preferences.equipment,
          session_duration_minutes: preferences.sessionDurationMinutes,
          injuries_or_limitations: preferences.injuriesOrLimitations,
          exercise_preferences: preferences.exercisePreferences,
          progression_guidance: plan.progressionGuidance,
          safety_notes: plan.safetyNotes,
          injury_warning: plan.injuryWarning,
        })
        .eq("id", existing.id);

      if (updateError) throw updateError;

      // Deleting the days cascades to their exercises; re-insert both fresh
      // rather than diffing, matching saveActivePlan's simpler "overwrite"
      // semantics for content.
      const { error: deleteDaysError } = await client
        .from("workout_plan_days")
        .delete()
        .eq("workout_plan_id", existing.id);
      if (deleteDaysError) throw deleteDaysError;

      await insertPlanChildren(client, userId, existing.id, plan);
    },

    async clearActivePlan(userId: string): Promise<void> {
      const { error } = await client.from("workout_plans").delete().eq("user_id", userId);
      if (error) throw error;
    },
  };
}
