import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import type { CompletedWorkout, LoggedExercise, Readiness } from "@/types/workout-log";
import type { PaginatedResult } from "@/types/repositories";
import type { HistoryRepository } from "../history-repository";

// readiness is normalized into its own 1:1 readiness_checkins table, but
// CompletedWorkout embeds it directly — so every read here embeds
// readiness_checkins and every write conditionally writes/deletes it there.
const COMPLETED_WORKOUT_WITH_CHILDREN_SELECT =
  "*, completed_workout_exercises(*, completed_workout_sets(*)), readiness_checkins(*)";

type WorkoutRow = Database["public"]["Tables"]["completed_workouts"]["Row"];
type ExerciseRow = Database["public"]["Tables"]["completed_workout_exercises"]["Row"];
type SetRow = Database["public"]["Tables"]["completed_workout_sets"]["Row"];
type ReadinessRow = Database["public"]["Tables"]["readiness_checkins"]["Row"];
type WorkoutRowWithChildren = WorkoutRow & {
  // completed_workout_exercises and completed_workout_sets are each unique
  // only on a composite key (completed_workout_id, sort_order) and
  // (completed_workout_exercise_id, set_number) respectively, so PostgREST
  // treats them as genuine to-many embeds and always returns an array —
  // `[]` when empty, never `null`.
  completed_workout_exercises: (ExerciseRow & { completed_workout_sets: SetRow[] })[];
  // readiness_checkins.completed_workout_id carries a *lone* `unique`
  // constraint (see 0001_init.sql), which PostgREST treats as a to-one
  // relationship — the embed comes back as a single object or `null`, never
  // wrapped in an array, unlike the two fields above.
  readiness_checkins: ReadinessRow | ReadinessRow[] | null;
};

function toReadiness(row: ReadinessRow): Readiness {
  return {
    difficulty: row.difficulty,
    energy: row.energy,
    soreness: row.soreness,
    sleepQuality: row.sleep_quality,
    satisfaction: row.satisfaction,
  };
}

// readiness_checkins is a to-one embed (see the field comment above) and so
// is normally a single object or null — but is normalized to also accept an
// array here in case a future schema change (e.g. dropping the unique
// constraint) ever changes PostgREST's inferred cardinality.
function extractReadinessRow(embed: ReadinessRow | ReadinessRow[] | null): ReadinessRow | null {
  if (embed === null) return null;
  return Array.isArray(embed) ? (embed[0] ?? null) : embed;
}

// completed_workout_exercises/completed_workout_sets are guaranteed by
// PostgREST to come back as arrays (see the field comment above) — anything
// else means the response shape doesn't match what the schema promises, not
// a legitimate empty state, so it's surfaced as a descriptive error rather
// than silently treated as "no exercises"/"no sets" (which would drop real
// data without any signal).
function requireArray<T>(value: T[] | null | undefined, field: string, workoutId: string): T[] {
  if (!Array.isArray(value)) {
    throw new Error(`Completed workout ${workoutId} has a malformed "${field}" field: expected an array.`);
  }
  return value;
}

function toCompletedWorkout(row: WorkoutRowWithChildren): CompletedWorkout {
  const exerciseRows = requireArray(row.completed_workout_exercises, "completed_workout_exercises", row.id);
  const exercises = [...exerciseRows].sort((a, b) => a.sort_order - b.sort_order);
  const readinessRow = extractReadinessRow(row.readiness_checkins);

  return {
    id: row.id,
    completedAt: row.completed_at,
    dayIndex: row.day_index,
    dayLabel: row.day_label,
    dayTitle: row.day_title,
    dayFocus: row.day_focus,
    durationSeconds: row.duration_seconds,
    exercises: exercises.map((exercise) => {
      const setRows = requireArray(exercise.completed_workout_sets, "completed_workout_sets", row.id);
      return {
        name: exercise.name,
        targetSets: exercise.target_sets,
        targetReps: exercise.target_reps,
        targetRestSeconds: exercise.target_rest_seconds,
        completed: exercise.completed,
        note: exercise.note,
        sets: [...setRows]
          .sort((a, b) => a.set_number - b.set_number)
          .map((set) => ({
            setNumber: set.set_number,
            weight: set.weight,
            reps: set.reps,
            completed: set.completed,
          })),
      };
    }),
    readiness: readinessRow ? toReadiness(readinessRow) : null,
  };
}

async function insertCompletedWorkoutChildren(
  client: SupabaseClient<Database>,
  userId: string,
  workoutId: string,
  exercises: LoggedExercise[]
): Promise<void> {
  const { data: exerciseRows, error: exercisesError } = await client
    .from("completed_workout_exercises")
    .insert(
      exercises.map((exercise, sortOrder) => ({
        user_id: userId,
        completed_workout_id: workoutId,
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
      completed_workout_exercise_id: exerciseId,
      set_number: set.setNumber,
      weight: set.weight,
      reps: set.reps,
      completed: set.completed,
    }));
  });

  if (setRows.length === 0) return;

  const { error: setsError } = await client.from("completed_workout_sets").insert(setRows);
  if (setsError) throw setsError;
}

export function createSupabaseHistoryRepository(client: SupabaseClient<Database>): HistoryRepository {
  return {
    async listHistory(
      userId: string,
      options?: { limit?: number; offset?: number }
    ): Promise<PaginatedResult<CompletedWorkout>> {
      const limit = options?.limit ?? 50;
      const offset = options?.offset ?? 0;

      const { data, error } = await client
        .from("completed_workouts")
        .select(COMPLETED_WORKOUT_WITH_CHILDREN_SELECT)
        .eq("user_id", userId)
        .order("completed_at", { ascending: false })
        .range(offset, offset + limit);

      if (error) throw error;

      const rows = data as unknown as WorkoutRowWithChildren[];
      const hasMore = rows.length > limit;
      return {
        items: rows.slice(0, limit).map(toCompletedWorkout),
        hasMore,
      };
    },

    async getCompletedWorkout(userId: string, workoutId: string): Promise<CompletedWorkout | null> {
      const { data, error } = await client
        .from("completed_workouts")
        .select(COMPLETED_WORKOUT_WITH_CHILDREN_SELECT)
        .eq("user_id", userId)
        .eq("id", workoutId)
        .maybeSingle();

      if (error) throw error;
      return data ? toCompletedWorkout(data as unknown as WorkoutRowWithChildren) : null;
    },

    async addCompletedWorkout(userId: string, workout: CompletedWorkout): Promise<void> {
      const { error: insertError } = await client.from("completed_workouts").insert({
        id: workout.id,
        user_id: userId,
        workout_plan_id: null,
        day_index: workout.dayIndex,
        day_label: workout.dayLabel,
        day_title: workout.dayTitle,
        day_focus: workout.dayFocus,
        completed_at: workout.completedAt,
        duration_seconds: workout.durationSeconds,
      });

      if (insertError) throw insertError;

      try {
        await insertCompletedWorkoutChildren(client, userId, workout.id, workout.exercises);

        if (workout.readiness) {
          const { error: readinessError } = await client.from("readiness_checkins").insert({
            user_id: userId,
            completed_workout_id: workout.id,
            difficulty: workout.readiness.difficulty,
            energy: workout.readiness.energy,
            soreness: workout.readiness.soreness,
            sleep_quality: workout.readiness.sleepQuality,
            satisfaction: workout.readiness.satisfaction,
          });
          if (readinessError) throw readinessError;
        }
      } catch (error) {
        // Best-effort cleanup: remove the orphaned workout row (cascades to
        // any exercises/sets/readiness that did make it in).
        await client.from("completed_workouts").delete().eq("id", workout.id);
        throw error;
      }
    },

    async deleteCompletedWorkout(userId: string, workoutId: string): Promise<void> {
      const { error } = await client.from("completed_workouts").delete().eq("user_id", userId).eq("id", workoutId);
      if (error) throw error;
    },
  };
}
