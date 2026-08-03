import type { MuscleGroup as LegacyMuscleGroup } from "@/lib/exercise-substitutions";
import type { ExerciseDefinition, MuscleGroup } from "@/types/exercises";
import { EXERCISE_DATABASE } from "./data";

// Indexed once at module load — EXERCISE_DATABASE is static reference data
// (see data.ts's header comment), so building these maps isn't something
// that needs to happen per-render or per-search (see PART 12: search stays
// instant because the expensive part, indexing, already happened at import
// time, not on every keystroke).
const BY_ID = new Map<string, ExerciseDefinition>(EXERCISE_DATABASE.map((e) => [e.id, e]));

// Canonical names always win a collision — indexed first, then aliases
// fill in any key a canonical name hasn't already claimed, so an alias can
// never shadow a real exercise's own name (see
// lib/exercises/validate.ts#validateExerciseDatabase, which flags that
// collision as a data error rather than letting it happen silently).
const BY_NAME = new Map<string, ExerciseDefinition>(EXERCISE_DATABASE.map((e) => [e.name.toLowerCase(), e]));
for (const exercise of EXERCISE_DATABASE) {
  for (const alias of exercise.aliases ?? []) {
    const key = alias.toLowerCase();
    if (!BY_NAME.has(key)) BY_NAME.set(key, exercise);
  }
}

export function listAllExercises(): ExerciseDefinition[] {
  return EXERCISE_DATABASE;
}

export function getExerciseById(id: string): ExerciseDefinition | null {
  return BY_ID.get(id) ?? null;
}

// The primary way most callers resolve an exercise — every generated plan,
// template, and logged workout in this app identifies an exercise by its
// `name` string, never a ExerciseDefinition id (that concept didn't exist
// before this phase). Case-insensitive so "bench press" and "Bench Press"
// both resolve.
export function getExerciseByName(name: string): ExerciseDefinition | null {
  return BY_NAME.get(name.trim().toLowerCase()) ?? null;
}

// Maps this phase's 10-group taxonomy back onto lib/exercise-substitutions.ts's
// existing 8-group one — used anywhere new code needs to hand a muscle
// group to Phase 5's lib/insights.ts/lib/analytics/* math, which still
// expects "posterior_chain" rather than separate hamstrings/glutes, and has
// no calves bucket at all. Never used in the other direction: the richer
// 10-group value is always the source of truth going forward. Lossy for
// hamstrings/glutes/calves by construction — that's the price of staying
// compatible with Phase 5's existing math without changing it.
export function toLegacyMuscleGroup(group: MuscleGroup): LegacyMuscleGroup {
  if (group === "hamstrings" || group === "glutes") return "posterior_chain";
  if (group === "calves") return "quads"; // nearest existing lower-body bucket
  return group;
}

export function listExercisesByMuscle(group: MuscleGroup): ExerciseDefinition[] {
  return EXERCISE_DATABASE.filter((e) => e.primaryMuscle === group);
}

// The one place both TemplateExercise and LoggedExercise should go through
// to find their library metadata: id first (exact, unambiguous — set
// whenever the exercise was added/replaced through the library picker),
// falling back to name/alias matching only when there's no id — a legacy
// record saved before stable ids existed, or a free-text name that was
// never in the library to begin with. Returns null rather than throwing so
// callers can render a "not available" state instead of crashing on a
// legacy or unrecognized exercise.
export function resolveExerciseDefinition(exerciseId: string | null | undefined, name: string): ExerciseDefinition | null {
  if (exerciseId) {
    const byId = getExerciseById(exerciseId);
    if (byId) return byId;
  }
  return getExerciseByName(name);
}
