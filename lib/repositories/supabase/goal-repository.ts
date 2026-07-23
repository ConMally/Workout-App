import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import type { Goal } from "@/types/goals";
import type { GoalRepository } from "../goal-repository";

type GoalRow = Database["public"]["Tables"]["goals"]["Row"];

function toGoal(row: GoalRow): Goal {
  return {
    id: row.id,
    type: row.type,
    title: row.title,
    exerciseName: row.exercise_name,
    targetValue: Number(row.target_value),
    targetDate: row.target_date,
    createdAt: row.created_at,
  };
}

export function createSupabaseGoalRepository(client: SupabaseClient<Database>): GoalRepository {
  return {
    async listGoals(userId: string): Promise<Goal[]> {
      const { data, error } = await client
        .from("goals")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data.map(toGoal);
    },

    async createGoal(userId: string, goal: Goal): Promise<void> {
      const { error } = await client.from("goals").insert({
        id: goal.id,
        user_id: userId,
        type: goal.type,
        title: goal.title,
        exercise_name: goal.exerciseName,
        target_value: goal.targetValue,
        target_date: goal.targetDate,
        created_at: goal.createdAt,
      });

      if (error) throw error;
    },

    async updateGoal(userId: string, goal: Goal): Promise<void> {
      const { error } = await client
        .from("goals")
        .update({
          type: goal.type,
          title: goal.title,
          exercise_name: goal.exerciseName,
          target_value: goal.targetValue,
          target_date: goal.targetDate,
        })
        .eq("id", goal.id)
        .eq("user_id", userId);

      if (error) throw error;
    },

    async deleteGoal(userId: string, goalId: string): Promise<void> {
      const { error } = await client.from("goals").delete().eq("id", goalId).eq("user_id", userId);
      if (error) throw error;
    },
  };
}
