import type { ExerciseDefinition, ExerciseFavorite, ExerciseSearchFilters } from "@/types/exercises";
import { listAllExercises } from "./library";

// Pure, synchronous filtering over the already-indexed static database
// (see library.ts) — safe to call on every keystroke without a network
// round trip or debounce, matching PART 12's "keep search instant."
// Callers (ExerciseLibraryBrowser.tsx) still wrap this in a useMemo keyed
// on the filters object so React doesn't re-run it on unrelated re-renders.
export function searchExercises(filters: ExerciseSearchFilters, all: ExerciseDefinition[] = listAllExercises()): ExerciseDefinition[] {
  const q = filters.query.trim().toLowerCase();

  return all.filter((exercise) => {
    if (filters.muscle !== "all" && exercise.primaryMuscle !== filters.muscle && !exercise.secondaryMuscles.includes(filters.muscle)) {
      return false;
    }
    if (filters.equipment !== "all" && !exercise.equipment.includes(filters.equipment)) return false;
    if (filters.difficulty !== "all" && exercise.difficulty !== filters.difficulty) return false;
    if (filters.movementPattern !== "all" && exercise.movementPattern !== filters.movementPattern) return false;

    if (q) {
      const haystack = [exercise.name, ...(exercise.aliases ?? []), exercise.primaryMuscle, ...exercise.secondaryMuscles, exercise.movementPattern]
        .join(" ")
        .toLowerCase();
      if (!haystack.includes(q)) return false;
    }

    return true;
  });
}

// Favorites first, then alphabetical — the ordering PART 8 asks for
// ("Favorites should... appear first"). A stable, pure sort so it's cheap
// to call after every search/filter change.
export function sortExercisesWithFavoritesFirst(
  exercises: ExerciseDefinition[],
  favoriteIds: Set<string>
): ExerciseDefinition[] {
  return [...exercises].sort((a, b) => {
    const favDiff = Number(favoriteIds.has(b.id)) - Number(favoriteIds.has(a.id));
    if (favDiff !== 0) return favDiff;
    return a.name.localeCompare(b.name);
  });
}

export function favoritesToIdSet(favorites: ExerciseFavorite[]): Set<string> {
  return new Set(favorites.map((f) => f.exerciseId));
}

// "Recently used" (PART 7) — exercise names actually logged in the user's
// history, most recent first, resolved to library entries. Deliberately
// takes plain exercise names (what CompletedWorkout already stores) rather
// than requiring a caller to already have ExerciseDefinitions, since
// history is the caller's source of truth for "used."
export function getRecentlyUsedExercises(recentExerciseNames: string[], all: ExerciseDefinition[] = listAllExercises()): ExerciseDefinition[] {
  const byName = new Map(all.map((e) => [e.name.toLowerCase(), e]));
  const seen = new Set<string>();
  const result: ExerciseDefinition[] = [];

  for (const name of recentExerciseNames) {
    const exercise = byName.get(name.trim().toLowerCase());
    if (!exercise || seen.has(exercise.id)) continue;
    seen.add(exercise.id);
    result.push(exercise);
  }

  return result;
}
