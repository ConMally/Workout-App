import type { ExerciseComparison, ExerciseDefinition } from "@/types/exercises";

const GOAL_LABELS_BY_KIND: Record<ExerciseDefinition["kind"], string[]> = {
  compound: ["Strength", "Build muscle", "Athletic performance"],
  isolation: ["Build muscle", "General fitness"],
};

// A compound movement recruits more total muscle mass under load, which is
// the basis for both estimates below — deliberately coarse ("higher" /
// "similar" / "lower"), not a fabricated numeric score, since this app
// never claims a precision it doesn't have (same principle as
// lib/progression.ts's rule-based-only philosophy).
function strengthEmphasis(exercise: ExerciseDefinition): "higher" | "similar" | "lower" {
  return exercise.kind === "compound" ? "higher" : "lower";
}

function hypertrophyEmphasis(exercise: ExerciseDefinition): "higher" | "similar" | "lower" {
  // Isolation work and compound work both build muscle well; compound work
  // has a slight edge from recruiting more total muscle, but it's not the
  // stark difference strength emphasis has — hence "similar" as the
  // isolation default rather than "lower".
  return exercise.kind === "compound" ? "higher" : "similar";
}

// Rough fatigue-cost proxy: compound, multi-joint, bilateral movements with
// more secondary muscles involved tax the body more per set than a
// single-joint isolation move.
function fatigueEstimate(exercise: ExerciseDefinition): "higher" | "similar" | "lower" {
  const complexityScore =
    (exercise.kind === "compound" ? 2 : 0) + (exercise.laterality === "bilateral" ? 1 : 0) + exercise.secondaryMuscles.length;
  if (complexityScore >= 3) return "higher";
  if (complexityScore >= 1) return "similar";
  return "lower";
}

function relativeTo(value: "higher" | "similar" | "lower", other: "higher" | "similar" | "lower"): "higher" | "similar" | "lower" {
  const rank = { lower: 0, similar: 1, higher: 2 } as const;
  const diff = rank[value] - rank[other];
  if (diff > 0) return "higher";
  if (diff < 0) return "lower";
  return "similar";
}

export function compareExercises(a: ExerciseDefinition, b: ExerciseDefinition): ExerciseComparison {
  return {
    a,
    b,
    sameMuscle: a.primaryMuscle === b.primaryMuscle,
    sameMovementPattern: a.movementPattern === b.movementPattern,
    strengthEmphasis: { a: relativeTo(strengthEmphasis(a), strengthEmphasis(b)) },
    hypertrophyEmphasis: { a: relativeTo(hypertrophyEmphasis(a), hypertrophyEmphasis(b)) },
    fatigueEstimate: { a: relativeTo(fatigueEstimate(a), fatigueEstimate(b)) },
    recommendedGoals: { a: GOAL_LABELS_BY_KIND[a.kind], b: GOAL_LABELS_BY_KIND[b.kind] },
  };
}
