import type { ExerciseFavorite } from "@/types/exercises";
import type { ExerciseFavoriteRepository } from "../exercise-favorite-repository";

// Local mode is disconnected from the live app (guest mode was removed —
// see proxy.ts's route protection), so this exists purely so the
// Repositories interface has a complete implementation; it's never reached
// by a real session. Deliberately self-contained rather than wired into
// lib/storage.ts's export/import envelope system, since favorites are a
// Phase 6 concept with no local-mode export format to stay compatible with.
const STORAGE_KEY = "workout-app:exercise-favorites";

function readFavorites(): ExerciseFavorite[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as ExerciseFavorite[]) : [];
  } catch {
    return [];
  }
}

function writeFavorites(favorites: ExerciseFavorite[]): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(favorites));
  } catch {
    // Quota exceeded, private browsing, etc. — fail silently, matching
    // lib/storage.ts's own writeEnvelope behavior.
  }
}

export function createLocalExerciseFavoriteRepository(): ExerciseFavoriteRepository {
  return {
    async listFavorites() {
      return readFavorites();
    },

    async addFavorite(_userId, exerciseId) {
      const favorites = readFavorites();
      if (favorites.some((f) => f.exerciseId === exerciseId)) return;
      writeFavorites([{ exerciseId, createdAt: new Date().toISOString() }, ...favorites]);
    },

    async removeFavorite(_userId, exerciseId) {
      writeFavorites(readFavorites().filter((f) => f.exerciseId !== exerciseId));
    },
  };
}
