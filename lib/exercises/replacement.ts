import type { Equipment, ExerciseDefinition, ExperienceLevel, ReplacementCandidate } from "@/types/exercises";
import { getExerciseByName, listAllExercises } from "./library";

const DIFFICULTY_ORDER: ExperienceLevel[] = ["beginner", "intermediate", "advanced"];

function difficultyDistance(a: ExperienceLevel, b: ExperienceLevel): number {
  return Math.abs(DIFFICULTY_ORDER.indexOf(a) - DIFFICULTY_ORDER.indexOf(b));
}

function hasEquipmentOverlap(exercise: ExerciseDefinition, available: Equipment[]): boolean {
  return exercise.equipment.some((e) => available.includes(e));
}

// Scores a single candidate against the source exercise it would replace.
// Never called on a candidate with a different primaryMuscle — see
// rankReplacements, which filters on that before scoring anything, so
// "never recommend an unrelated movement" is structural, not just a high
// bar on the score.
function scoreCandidate(source: ExerciseDefinition, candidate: ExerciseDefinition, availableEquipment: Equipment[] | null): { score: number; matchedOn: string[] } {
  let score = 0;
  const matchedOn: string[] = ["Same primary muscle"];

  if (candidate.movementPattern === source.movementPattern) {
    score += 30;
    matchedOn.push("Same movement pattern");
  }

  const diffDistance = difficultyDistance(source.difficulty, candidate.difficulty);
  if (diffDistance === 0) {
    score += 20;
    matchedOn.push("Same difficulty level");
  } else if (diffDistance === 1) {
    score += 10;
  }

  if (candidate.kind === source.kind) {
    score += 15;
    matchedOn.push(candidate.kind === "compound" ? "Both compound movements" : "Both isolation movements");
  }

  if (candidate.laterality === source.laterality) {
    score += 5;
  }

  const secondaryOverlap = candidate.secondaryMuscles.filter((m) => source.secondaryMuscles.includes(m)).length;
  score += Math.min(10, secondaryOverlap * 5);
  if (secondaryOverlap > 0) matchedOn.push("Overlapping secondary muscles");

  if (availableEquipment) {
    if (hasEquipmentOverlap(candidate, availableEquipment)) {
      score += 20;
      matchedOn.push("Matches your available equipment");
    }
  } else {
    score += 20; // no equipment constraint given — don't penalize
  }

  return { score, matchedOn };
}

// Ranked replacement candidates for `sourceName` — always same primary
// muscle (never relaxed), preferring the same movement pattern, difficulty,
// and equipment availability, exactly the "preserve primary muscle,
// movement pattern, difficulty, equipment availability" requirement. When
// `availableEquipment` is provided, exercises with zero equipment overlap
// are still scored (so the list is never empty just because someone has an
// unusual gym setup) but sink to the bottom via the score, rather than
// being silently hidden — the caller decides how many to show.
export function rankReplacements(
  sourceName: string,
  options: { availableEquipment?: Equipment[]; excludeNames?: string[]; limit?: number } = {}
): ReplacementCandidate[] {
  const source = getExerciseByName(sourceName);
  if (!source) return [];

  const excluded = new Set([source.name.toLowerCase(), ...(options.excludeNames ?? []).map((n) => n.toLowerCase())]);
  const availableEquipment = options.availableEquipment ?? null;

  const candidates = listAllExercises()
    .filter((e) => e.primaryMuscle === source.primaryMuscle && !excluded.has(e.name.toLowerCase()))
    .map((candidate) => {
      const { score, matchedOn } = scoreCandidate(source, candidate, availableEquipment);
      return { exercise: candidate, score, matchedOn };
    })
    .sort((a, b) => b.score - a.score);

  return candidates.slice(0, options.limit ?? 6);
}
