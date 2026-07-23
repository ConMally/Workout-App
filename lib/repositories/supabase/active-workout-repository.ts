import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import type { ActiveWorkout, LoggedExercise } from "@/types/workout-log";
import type { ActiveWorkoutRepository } from "../active-workout-repository";

const ACTIVE_WORKOUT_WITH_CHILDREN_SELECT = "*, active_workout_exercises(*, active_workout_sets(*))";

type WorkoutRow = Database["public"]["Tables"]["active_workouts"]["Row"];
type ExerciseRow = Database["public"]["Tables"]["active_workout_exercises"]["Row"];
type SetRow = Database["public"]["Tables"]["active_workout_sets"]["Row"];
type WorkoutRowWithChildren = WorkoutRow & {
  active_workout_exercises: (ExerciseRow & { active_workout_sets: SetRow[] })[];
};

function toActiveWorkout(row: WorkoutRowWithChildren): ActiveWorkout {
  const exercises = [...row.active_workout_exercises].sort((a, b) => a.sort_order - b.sort_order);

  return {
    id: row.id,
    startedAt: row.started_at,
    dayIndex: row.day_index,
    dayLabel: row.day_label,
    dayTitle: row.day_title,
    dayFocus: row.day_focus,
    exercises: exercises.map((exercise) => ({
      name: exercise.name,
      targetSets: exercise.target_sets,
      targetReps: exercise.target_reps,
      targetRestSeconds: exercise.target_rest_seconds,
      completed: exercise.completed,
      note: exercise.note,
      sets: [...exercise.active_workout_sets]
        .sort((a, b) => a.set_number - b.set_number)
        .map((set) => ({
          setNumber: set.set_number,
          weight: set.weight,
          reps: set.reps,
          completed: set.completed,
        })),
    })),
  };
}

// Used only by createActiveWorkout, where the exercises/sets are brand new
// rows with no prior identity to upsert against.
async function insertActiveWorkoutChildren(
  client: SupabaseClient<Database>,
  userId: string,
  workoutId: string,
  exercises: LoggedExercise[]
): Promise<void> {
  const { data: exerciseRows, error: exercisesError } = await client
    .from("active_workout_exercises")
    .insert(
      exercises.map((exercise, sortOrder) => ({
        user_id: userId,
        active_workout_id: workoutId,
        sort_order: sortOrder,
        name: exercise.name,
        target_sets: exercise.targetSets,
        target_reps: exercise.targetReps,
        target_rest_seconds: exercise.targetRestSeconds,
        completed: exercise.completed,
        note: exercise.note,
      }))
    )
    .select("id, sort_order");

  if (exercisesError) throw exercisesError;

  const exerciseIdByOrder = new Map(exerciseRows.map((row) => [row.sort_order, row.id]));

  const setRows = exercises.flatMap((exercise, sortOrder) => {
    const exerciseId = exerciseIdByOrder.get(sortOrder);
    if (!exerciseId) return [];
    return exercise.sets.map((set) => ({
      user_id: userId,
      active_workout_exercise_id: exerciseId,
      set_number: set.setNumber,
      weight: set.weight,
      reps: set.reps,
      completed: set.completed,
    }));
  });

  if (setRows.length === 0) return;

  const { error: setsError } = await client.from("active_workout_sets").insert(setRows);
  if (setsError) throw setsError;
}

export function createSupabaseActiveWorkoutRepository(client: SupabaseClient<Database>): ActiveWorkoutRepository {
  return {
    async getActiveWorkout(userId: string): Promise<ActiveWorkout | null> {
      const { data, error } = await client
        .from("active_workouts")
        .select(ACTIVE_WORKOUT_WITH_CHILDREN_SELECT)
        .eq("user_id", userId)
        .maybeSingle();

      if (error) throw error;
      return data ? toActiveWorkout(data as WorkoutRowWithChildren) : null;
    },

    // The unique (user_id) constraint on active_workouts means only one row
    // can exist per user. Starting a new workout always replaces whatever
    // was there — matching writeActiveWorkout's overwrite semantics locally
    // — rather than erroring on the conflict or merging with it.
    async createActiveWorkout(userId: string, workout: ActiveWorkout): Promise<void> {
      const { error: deleteError } = await client.from("active_workouts").delete().eq("user_id", userId);
      if (deleteError) throw deleteError;

      const { error: insertError } = await client.from("active_workouts").insert({
        id: workout.id,
        user_id: userId,
        workout_plan_id: null,
        day_index: workout.dayIndex,
        day_label: workout.dayLabel,
        day_title: workout.dayTitle,
        day_focus: workout.dayFocus,
        started_at: workout.startedAt,
      });

      if (insertError) throw insertError;

      try {
        await insertActiveWorkoutChildren(client, userId, workout.id, workout.exercises);
      } catch (error) {
        await client.from("active_workouts").delete().eq("id", workout.id);
        throw error;
      }
    },

    // The exercise/set list never changes shape after createActiveWorkout
    // (no add/remove-set feature exists), so every subsequent save is a
    // pure upsert keyed on the existing (active_workout_id, sort_order) and
    // (active_workout_exercise_id, set_number) unique constraints — no
    // delete-and-recreate needed, and no rows are ever orphaned.
    async saveActiveWorkout(userId: string, workout: ActiveWorkout): Promise<void> {
      const { error: updateError } = await client
        .from("active_workouts")
        .update({
          day_index: workout.dayIndex,
          day_label: workout.dayLabel,
          day_title: workout.dayTitle,
          day_focus: workout.dayFocus,
          started_at: workout.startedAt,
        })
        .eq("id", workout.id)
        .eq("user_id", userId);

      if (updateError) throw updateError;

      const { data: exerciseRows, error: exercisesError } = await client
        .from("active_workout_exercises")
        .upsert(
          workout.exercises.map((exercise, sortOrder) => ({
            user_id: userId,
            active_workout_id: workout.id,
            sort_order: sortOrder,
            name: exercise.name,
            target_sets: exercise.targetSets,
            target_reps: exercise.targetReps,
            target_rest_seconds: exercise.targetRestSeconds,
            completed: exercise.completed,
            note: exercise.note,
          })),
          { onConflict: "active_workout_id,sort_order" }
        )
        .select("id, sort_order");

      if (exercisesError) throw exercisesError;

      const exerciseIdByOrder = new Map(exerciseRows.map((row) => [row.sort_order, row.id]));

      const setRows = workout.exercises.flatMap((exercise, sortOrder) => {
        const exerciseId = exerciseIdByOrder.get(sortOrder);
        if (!exerciseId) return [];
        return exercise.sets.map((set) => ({
          user_id: userId,
          active_workout_exercise_id: exerciseId,
          set_number: set.setNumber,
          weight: set.weight,
          reps: set.reps,
          completed: set.completed,
        }));
      });

      if (setRows.length === 0) return;

      const { error: setsError } = await client
        .from("active_workout_sets")
        .upsert(setRows, { onConflict: "active_workout_exercise_id,set_number" });

      if (setsError) throw setsError;
    },

    async clearActiveWorkout(userId: string): Promise<void> {
      const { error } = await client.from("active_workouts").delete().eq("user_id", userId);
      if (error) throw error;
    },
  };
}
