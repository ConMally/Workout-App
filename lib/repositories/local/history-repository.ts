import { readHistory, writeHistory } from "@/lib/storage";
import type { HistoryRepository } from "../history-repository";

export function createLocalHistoryRepository(): HistoryRepository {
  return {
    async listHistory(_userId, options) {
      const all = readHistory(); // already newest-first
      const offset = options?.offset ?? 0;
      const limit = options?.limit ?? all.length;
      const items = all.slice(offset, offset + limit);
      return { items, hasMore: offset + items.length < all.length };
    },

    async getCompletedWorkout(_userId, workoutId) {
      return readHistory().find((w) => w.id === workoutId) ?? null;
    },

    async addCompletedWorkout(_userId, workout) {
      writeHistory([workout, ...readHistory()]);
    },

    async deleteCompletedWorkout(_userId, workoutId) {
      writeHistory(readHistory().filter((w) => w.id !== workoutId));
    },
  };
}
