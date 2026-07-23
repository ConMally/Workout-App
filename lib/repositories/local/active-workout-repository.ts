import { clearActiveWorkout, readActiveWorkout, writeActiveWorkout } from "@/lib/storage";
import type { ActiveWorkoutRepository } from "../active-workout-repository";

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
  };
}
