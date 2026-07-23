import type { DatedPersonalRecord } from "@/types/dashboard";

// Personal records are currently recomputed on every load by
// lib/dashboard.ts#getAllPersonalRecords (which itself calls the existing
// lib/progression.ts#detectPersonalRecords — never duplicated). This
// interface is what a future cloud implementation would use to persist
// that same output to the personal_records table instead of recomputing
// over full history every time; nothing calls it yet.
export interface PRRepository {
  listPersonalRecords(userId: string, exerciseName?: string): Promise<DatedPersonalRecord[]>;
  recordPersonalRecords(userId: string, completedWorkoutId: string, events: DatedPersonalRecord[]): Promise<void>;
}
