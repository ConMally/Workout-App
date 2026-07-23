import type { CompletedWorkout } from "@/types/workout-log";
import type { PaginatedResult } from "@/types/repositories";

// Mirrors readHistory / writeHistory in lib/storage.ts, expressed as
// per-item operations rather than whole-array replace — a more natural
// fit for a database, but still returning/accepting the exact
// CompletedWorkout shape everything else in the app already uses.
//
// listHistory takes a bounded `limit` rather than fetching every workout a
// user has ever logged — lib/dashboard.ts / lib/insights.ts / lib/goals.ts
// all compute their stats over whatever window is loaded into memory, so
// an unbounded fetch would grow without limit for long-running accounts.
// See app/page.tsx's MAX_HISTORY_FOR_STATS.
export interface HistoryRepository {
  listHistory(userId: string, options?: { limit?: number; offset?: number }): Promise<PaginatedResult<CompletedWorkout>>;
  getCompletedWorkout(userId: string, workoutId: string): Promise<CompletedWorkout | null>;
  addCompletedWorkout(userId: string, workout: CompletedWorkout): Promise<void>;
  deleteCompletedWorkout(userId: string, workoutId: string): Promise<void>;
}
