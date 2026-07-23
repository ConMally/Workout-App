import { readHistory } from "@/lib/storage";
import { getAllPersonalRecords } from "@/lib/dashboard";
import type { PRRepository } from "../pr-repository";

// Local mode has no separate PR storage — PRs are always re-derived from
// history via the existing getAllPersonalRecords (which itself only ever
// calls lib/progression.ts#detectPersonalRecords; never duplicated here).
// recordPersonalRecords is a no-op: there's nothing to persist beyond the
// completed workout itself, which addCompletedWorkout already wrote.
export function createLocalPRRepository(): PRRepository {
  return {
    async listPersonalRecords(_userId, exerciseName) {
      const all = getAllPersonalRecords(readHistory());
      return exerciseName ? all.filter((event) => event.exerciseName === exerciseName) : all;
    },
    async recordPersonalRecords() {
      // no-op — see file comment.
    },
  };
}
