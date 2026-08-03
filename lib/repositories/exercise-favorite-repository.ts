import type { ExerciseFavorite } from "@/types/exercises";

// Which library exercises (lib/exercises/data.ts) a user has favorited —
// the library itself is static reference data with no repository of its
// own (see supabase/migrations/0008_exercise_favorites.sql's header
// comment); this only tracks per-account favorite state.
export interface ExerciseFavoriteRepository {
  listFavorites(userId: string): Promise<ExerciseFavorite[]>;
  addFavorite(userId: string, exerciseId: string): Promise<void>;
  removeFavorite(userId: string, exerciseId: string): Promise<void>;
}
