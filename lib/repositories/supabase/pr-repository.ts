import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import type { DatedPersonalRecord } from "@/types/dashboard";
import type { PersonalRecordType } from "@/types/workout-log";
import type { PRRepository } from "../pr-repository";

type PersonalRecordRow = Database["public"]["Tables"]["personal_records"]["Row"];

// personal_records has no `detail` column (see 0001_init.sql) — that string
// is purely a display formatter over type/value/previousValue in
// lib/progression.ts#detectPersonalRecords, reproduced here to the same
// wording. The one gap: most_reps_at_weight's detail also names the weight
// the reps were done at, which isn't persisted anywhere on this row, so
// that clause is omitted on read-back. Nothing in the app currently reads
// this table back for display (PR events are shown immediately from the
// in-memory detectPersonalRecords output right after a workout), so this
// is a documented gap rather than a visible regression.
function toDetail(type: PersonalRecordType, value: number, previousValue: number): string {
  switch (type) {
    case "heaviest_weight":
      return `${value} (previously ${previousValue})`;
    case "most_reps_at_weight":
      return `${value} reps (previously ${previousValue})`;
    case "estimated_one_rep_max":
      return `~${value} estimated 1RM (previously ~${previousValue})`;
  }
}

function toDatedPersonalRecord(row: PersonalRecordRow): DatedPersonalRecord {
  const type = row.record_type;
  const newValue = Number(row.value);
  const previousValue = Number(row.previous_value);
  return {
    exerciseName: row.exercise_name,
    type,
    newValue,
    previousValue,
    detail: toDetail(type, newValue, previousValue),
    completedAt: row.achieved_at,
  };
}

export function createSupabasePRRepository(client: SupabaseClient<Database>): PRRepository {
  return {
    async listPersonalRecords(userId: string, exerciseName?: string): Promise<DatedPersonalRecord[]> {
      let query = client
        .from("personal_records")
        .select("*")
        .eq("user_id", userId)
        .order("achieved_at", { ascending: false });

      if (exerciseName) {
        query = query.eq("exercise_name", exerciseName);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data.map(toDatedPersonalRecord);
    },

    async recordPersonalRecords(
      userId: string,
      completedWorkoutId: string,
      events: DatedPersonalRecord[]
    ): Promise<void> {
      if (events.length === 0) return;

      const { error } = await client.from("personal_records").insert(
        events.map((event) => ({
          user_id: userId,
          completed_workout_id: completedWorkoutId,
          exercise_name: event.exerciseName,
          record_type: event.type,
          value: event.newValue,
          previous_value: event.previousValue,
          achieved_at: event.completedAt,
        }))
      );

      if (error) throw error;
    },
  };
}
