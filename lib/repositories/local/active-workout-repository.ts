import { clearActiveWorkout, readActiveWorkout, writeActiveWorkout } from "@/lib/storage";
import type { LoggedExercise } from "@/types/workout-log";
import type {
  ActiveWorkoutRepository,
  NewActiveWorkoutExerciseInput,
  ReplaceActiveWorkoutExerciseInput,
  ReplaceActiveWorkoutExerciseResult,
} from "../active-workout-repository";

function buildExercise(input: NewActiveWorkoutExerciseInput | ReplaceActiveWorkoutExerciseInput): LoggedExercise {
  return {
    id: crypto.randomUUID(),
    name: input.name,
    exerciseId: input.exerciseId,
    targetSets: input.targetSets,
    targetReps: input.targetReps,
    targetRestSeconds: input.targetRestSeconds,
    sets: Array.from({ length: input.targetSets }, (_, i) => ({
      setNumber: i + 1,
      weight: null,
      reps: null,
      completed: false,
    })),
    completed: false,
    note: "note" in input ? input.note : "",
  };
}

export function createLocalActiveWorkoutRepository(): ActiveWorkoutRepository {
  return {
    async getActiveWorkout() {
      return readActiveWorkout();
    },
    async createActiveWorkout(_userId, workout) {
      writeActiveWorkout(workout);
    },
    async saveActiveWorkout(_userId, workout) {
      writeActiveWorkout(workout);
    },
    async clearActiveWorkout() {
      clearActiveWorkout();
    },

    async addExercise(_userId, workoutId, input) {
      const workout = readActiveWorkout();
      if (!workout || workout.id !== workoutId) {
        throw new Error(`addExercise: active workout ${workoutId} not found`);
      }

      const newExercise = buildExercise(input);
      writeActiveWorkout({ ...workout, exercises: [...workout.exercises, newExercise] });
      return newExercise;
    },

    async replaceExercise(
      _userId,
      workoutId,
      exerciseId,
      input: ReplaceActiveWorkoutExerciseInput
    ): Promise<ReplaceActiveWorkoutExerciseResult> {
      const workout = readActiveWorkout();
      if (!workout || workout.id !== workoutId) {
        throw new Error(`replaceExercise: active workout ${workoutId} not found`);
      }

      const index = workout.exercises.findIndex((exercise) => exercise.id === exerciseId);
      if (index === -1) {
        throw new Error(`replaceExercise: exercise ${exerciseId} not found in workout ${workoutId}`);
      }

      const original = workout.exercises[index];
      const completedSets = original.sets.filter((set) => set.completed);

      if (!input.keepCompleted) {
        if (completedSets.length > 0) {
          throw new Error(
            `replaceExercise: exercise ${exerciseId} has ${completedSets.length} completed set(s) — call with keepCompleted = true instead`
          );
        }

        const replaced: LoggedExercise = { ...buildExercise(input), id: original.id, note: "" };
        const nextExercises = workout.exercises.map((exercise, i) => (i === index ? replaced : exercise));
        writeActiveWorkout({ ...workout, exercises: nextExercises });
        return { replaced, added: null };
      }

      if (completedSets.length === 0) {
        throw new Error(`replaceExercise: exercise ${exerciseId} has no completed sets — call with keepCompleted = false instead`);
      }

      const truncated: LoggedExercise = {
        ...original,
        targetSets: completedSets.length,
        completed: true,
        sets: completedSets.map((set, i) => ({ ...set, setNumber: i + 1 })),
      };
      const added = buildExercise(input);

      const nextExercises = [
        ...workout.exercises.slice(0, index),
        truncated,
        added,
        ...workout.exercises.slice(index + 1),
      ];
      writeActiveWorkout({ ...workout, exercises: nextExercises });
      return { replaced: truncated, added };
    },

    async deleteExercise(_userId, workoutId, exerciseId) {
      const workout = readActiveWorkout();
      if (!workout || workout.id !== workoutId) {
        throw new Error(`deleteExercise: active workout ${workoutId} not found`);
      }
      if (workout.exercises.length <= 1) {
        throw new Error("deleteExercise: cannot delete the last exercise in a workout");
      }

      const nextExercises = workout.exercises.filter((exercise) => exercise.id !== exerciseId);
      writeActiveWorkout({ ...workout, exercises: nextExercises });
    },

    async reorderExercises(_userId, workoutId, exerciseIds) {
      const workout = readActiveWorkout();
      if (!workout || workout.id !== workoutId) {
        throw new Error(`reorderExercises: active workout ${workoutId} not found`);
      }

      const byId = new Map(workout.exercises.map((exercise) => [exercise.id, exercise]));
      if (exerciseIds.length !== workout.exercises.length || exerciseIds.some((id) => !byId.has(id))) {
        throw new Error(`reorderExercises: id list for workout ${workoutId} does not match its current exercises`);
      }

      const nextExercises = exerciseIds.map((id) => byId.get(id)!);
      writeActiveWorkout({ ...workout, exercises: nextExercises });
    },
  };
}
