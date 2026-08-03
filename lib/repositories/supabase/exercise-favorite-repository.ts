import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import type { ExerciseFavorite } from "@/types/exercises";
import type { ExerciseFavoriteRepository } from "../exercise-favorite-repository";

export function createSupabaseExerciseFavoriteRepository(client: SupabaseClient<Database>): ExerciseFavoriteRepository {
  return {
    async listFavorites(userId: string): Promise<ExerciseFavorite[]> {
      const { data, error } = await client
        .from("exercise_favorites")
        .select("exercise_id, created_at")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data.map((row) => ({ exerciseId: row.exercise_id, createdAt: row.created_at }));
    },

    async addFavorite(userId: string, exerciseId: string): Promise<void> {
      // upsert so favoriting an already-favorited exercise (e.g. a second
      // tab, or a retried request) never trips the (user_id, exercise_id)
      // unique constraint as a hard error.
      const { error } = await client
        .from("exercise_favorites")
        .upsert({ user_id: userId, exercise_id: exerciseId }, { onConflict: "user_id,exercise_id", ignoreDuplicates: true });
      if (error) throw error;
    },

    async removeFavorite(userId: string, exerciseId: string): Promise<void> {
      const { error } = await client
        .from("exercise_favorites")
        .delete()
        .eq("user_id", userId)
        .eq("exercise_id", exerciseId);
      if (error) throw error;
    },
  };
}
