import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import type { ActiveWorkout, LoggedExercise } from "@/types/workout-log";
import type {
  ActiveWorkoutRepository,
  NewActiveWorkoutExerciseInput,
  ReplaceActiveWorkoutExerciseInput,
  ReplaceActiveWorkoutExerciseResult,
} from "../active-workout-repository";

const ACTIVE_WORKOUT_WITH_CHILDREN_SELECT = "*, active_workout_exercises(*, active_workout_sets(*))";

type WorkoutRow = Database["public"]["Tables"]["active_workouts"]["Row"];
type ExerciseRow = Database["public"]["Tables"]["active_workout_exercises"]["Row"];
type SetRow = Database["public"]["Tables"]["active_workout_sets"]["Row"];
type WorkoutRowWithChildren = WorkoutRow & {
  active_workout_exercises: (ExerciseRow & { active_workout_sets: SetRow[] })[];
};

function toLoggedExercise(exercise: ExerciseRow & { active_workout_sets: SetRow[] }): LoggedExercise {
  return {
    id: exercise.id,
    name: exercise.name,
    exerciseId: exercise.exercise_id,
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
  };
}

function toActiveWorkout(row: WorkoutRowWithChildren): ActiveWorkout {
  const exercises = [...row.active_workout_exercises].sort((a, b) => a.sort_order - b.sort_order);

  return {
    id: row.id,
    startedAt: row.started_at,
    dayIndex: row.day_index,
    dayLabel: row.day_label,
    dayTitle: row.day_title,
    dayFocus: row.day_focus,
    activeExerciseIndex: row.active_exercise_index,
    activeExerciseId: row.active_exercise_id,
    exercises: exercises.map(toLoggedExercise),
  };
}

// Used only by createActiveWorkout, where the exercises/sets are brand new
// rows with no prior identity to upsert against. Explicitly writes each
// exercise's client-generated `id` (see lib/workout-log.ts#createActiveWorkout,
// which mints one via crypto.randomUUID() for every exercise) as the row's
// real primary key instead of letting Postgres's own gen_random_uuid()
// default assign a different one — the app sets React state from that same
// client object immediately, before this write resolves (see
// app/page.tsx#handleStartWorkout), so the id the UI is already showing the
// user and the id every later addExercise/replaceExercise/deleteExercise/
// reorderExercises call would reference MUST be the same value, or those
// calls would 404 against a row that was actually saved under a different id.
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
        id: exercise.id,
        user_id: userId,
        active_workout_id: workoutId,
        sort_order: sortOrder,
        name: exercise.name,
        exercise_id: exercise.exerciseId,
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

// Fetches a single active_workout_exercises row (with its sets) by id —
// used to turn an RPC's returned uuid back into a LoggedExercise for the
// addExercise/replaceExercise repository methods, so the caller (the
// Active Workout Editor) can splice the real, server-assigned row straight
// into local state without a second full getActiveWorkout() round trip.
async function fetchExercise(client: SupabaseClient<Database>, exerciseId: string): Promise<LoggedExercise> {
  const { data, error } = await client
    .from("active_workout_exercises")
    .select("*, active_workout_sets(*)")
    .eq("id", exerciseId)
    .single();

  if (error) throw error;
  return toLoggedExercise(data as unknown as ExerciseRow & { active_workout_sets: SetRow[] });
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
      return data ? toActiveWorkout(data as unknown as WorkoutRowWithChildren) : null;
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
        active_exercise_index: workout.activeExerciseIndex,
        // active_exercise_id is set below, once the child rows (and their
        // real ids) exist — the FK can't point at a row that doesn't exist
        // yet.
        active_exercise_id: null,
      });

      if (insertError) throw insertError;

      try {
        await insertActiveWorkoutChildren(client, userId, workout.id, workout.exercises);

        if (workout.activeExerciseId) {
          const { error: focusError } = await client
            .from("active_workouts")
            .update({ active_exercise_id: workout.activeExerciseId })
            .eq("id", workout.id)
            .eq("user_id", userId);
          if (focusError) throw focusError;
        }
      } catch (error) {
        await client.from("active_workouts").delete().eq("id", workout.id);
        throw error;
      }
    },

    // The exercise/set list must never change shape (add/remove) through
    // this method — see the interface's doc comment — so every call here is
    // a pure upsert keyed on the existing (active_workout_id, sort_order)
    // and (active_workout_exercise_id, set_number) unique constraints, same
    // as before Phase 11B. Adding/removing/reordering exercises always goes
    // through the dedicated methods below instead.
    async saveActiveWorkout(userId: string, workout: ActiveWorkout): Promise<void> {
      const { error: updateError } = await client
        .from("active_workouts")
        .update({
          day_index: workout.dayIndex,
          day_label: workout.dayLabel,
          day_title: workout.dayTitle,
          day_focus: workout.dayFocus,
          started_at: workout.startedAt,
          active_exercise_index: workout.activeExerciseIndex,
          active_exercise_id: workout.activeExerciseId,
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
            exercise_id: exercise.exerciseId,
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

    async addExercise(_userId: string, workoutId: string, input: NewActiveWorkoutExerciseInput): Promise<LoggedExercise> {
      const { data: newId, error } = await client.rpc("add_active_workout_exercise", {
        p_active_workout_id: workoutId,
        p_name: input.name,
        p_exercise_id: input.exerciseId,
        p_target_sets: input.targetSets,
        p_target_reps: input.targetReps,
        p_target_rest_seconds: input.targetRestSeconds,
        p_note: input.note,
      });
      if (error) throw error;

      return fetchExercise(client, newId as string);
    },

    async replaceExercise(
      _userId: string,
      workoutId: string,
      exerciseId: string,
      input: ReplaceActiveWorkoutExerciseInput
    ): Promise<ReplaceActiveWorkoutExerciseResult> {
      const { data, error } = await client.rpc("replace_active_workout_exercise", {
        p_active_workout_id: workoutId,
        p_exercise_id: exerciseId,
        p_keep_completed: input.keepCompleted,
        p_name: input.name,
        p_new_exercise_id: input.exerciseId,
        p_target_sets: input.targetSets,
        p_target_reps: input.targetReps,
        p_target_rest_seconds: input.targetRestSeconds,
      });
      if (error) throw error;

      const result = data as { replacedExerciseId: string; newExerciseId: string | null };
      const replaced = await fetchExercise(client, result.replacedExerciseId);
      const added = result.newExerciseId ? await fetchExercise(client, result.newExerciseId) : null;
      return { replaced, added };
    },

    async deleteExercise(_userId: string, workoutId: string, exerciseId: string): Promise<void> {
      const { error } = await client.rpc("delete_active_workout_exercise", {
        p_active_workout_id: workoutId,
        p_exercise_id: exerciseId,
      });
      if (error) throw error;
    },

    async reorderExercises(_userId: string, workoutId: string, exerciseIds: string[]): Promise<void> {
      const { error } = await client.rpc("reorder_active_workout_exercises", {
        p_active_workout_id: workoutId,
        p_exercise_ids: exerciseIds,
      });
      if (error) throw error;
    },
  };
}
