import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import type { Readiness } from "@/types/workout-log";
import type { ReadinessCheckIn, ReadinessRepository } from "../readiness-repository";

type ReadinessRow = Database["public"]["Tables"]["readiness_checkins"]["Row"];

function toReadinessCheckIn(row: ReadinessRow): ReadinessCheckIn {
  return {
    completedWorkoutId: row.completed_workout_id,
    readiness: {
      difficulty: row.difficulty,
      energy: row.energy,
      soreness: row.soreness,
      sleepQuality: row.sleep_quality,
      satisfaction: row.satisfaction,
    },
    createdAt: row.created_at,
  };
}

export function createSupabaseReadinessRepository(client: SupabaseClient<Database>): ReadinessRepository {
  return {
    async createCheckIn(userId: string, completedWorkoutId: string, readiness: Readiness): Promise<void> {
      const { error } = await client.from("readiness_checkins").insert({
        user_id: userId,
        completed_workout_id: completedWorkoutId,
        difficulty: readiness.difficulty,
        energy: readiness.energy,
        soreness: readiness.soreness,
        sleep_quality: readiness.sleepQuality,
        satisfaction: readiness.satisfaction,
      });

      if (error) throw error;
    },

    async listCheckIns(userId: string, options?: { limit?: number }): Promise<ReadinessCheckIn[]> {
      let query = client
        .from("readiness_checkins")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });

      if (options?.limit) {
        query = query.limit(options.limit);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data.map(toReadinessCheckIn);
    },
  };
}
