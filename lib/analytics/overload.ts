import type { CompletedWorkout } from "@/types/workout-log";
import type { OverloadTarget } from "@/types/analytics";
import { getProgressionSuggestion, parseRepRange } from "@/lib/progression";

// Concrete next weight/reps/sets per exercise, built directly on top of
// lib/progression.ts#getProgressionSuggestion's existing qualitative signal
// (increase/hold/decrease) — never a second, competing judgment about
// whether the last session went well. This only adds the actual numbers.
//
// "Never increase weight if recent workouts failed" is enforced structurally:
// the only branch that raises nextWeight is the one getProgressionSuggestion
// already gates on "every completed set hit the top of the rep range" — the
// failure branch (2+ sets below the bottom of the range) only ever holds or
// lowers the weight, never raises it.

// A flat ~2.5% jump rounded to the nearest half-plate-equivalent (2.5) —
// deliberately conservative and round-number-friendly rather than a precise
// percentage, since real barbell/dumbbell increments come in fixed jumps,
// not arbitrary decimals.
function computeIncrement(weight: number): number {
  const raw = weight * 0.025;
  return Math.max(2.5, Math.round(raw / 2.5) * 2.5);
}

export function getOverloadTarget(history: CompletedWorkout[], exerciseName: string): OverloadTarget | null {
  const lastWorkout = history.find((w) => w.exercises.some((e) => e.name === exerciseName));
  if (!lastWorkout) return null;

  const exercise = lastWorkout.exercises.find((e) => e.name === exerciseName)!;
  const suggestion = getProgressionSuggestion(exercise);
  if (!suggestion) return null; // no logged weight to base a number on — never invent one

  const completedWeights = exercise.sets
    .filter((s) => s.completed && s.weight !== null && s.weight > 0)
    .map((s) => s.weight as number);
  if (completedWeights.length === 0) return null;
  const lastWeight = Math.max(...completedWeights);

  const range = parseRepRange(exercise.targetReps);
  const repsAtTop = range ? `${range.min}-${range.max}` : exercise.targetReps;

  if (suggestion.type === "increase_weight") {
    const increment = computeIncrement(lastWeight);
    return {
      exerciseName,
      direction: "increase",
      nextWeight: Math.round((lastWeight + increment) * 10) / 10,
      nextReps: repsAtTop,
      nextSets: exercise.targetSets,
      reasoning: suggestion.message,
    };
  }

  if (suggestion.type === "hold_or_decrease_weight") {
    const increment = computeIncrement(lastWeight);
    return {
      exerciseName,
      direction: "decrease",
      nextWeight: Math.max(0, Math.round((lastWeight - increment) * 10) / 10),
      nextReps: exercise.targetReps,
      nextSets: exercise.targetSets,
      reasoning: suggestion.message,
    };
  }

  return {
    exerciseName,
    direction: "hold",
    nextWeight: lastWeight,
    nextReps: exercise.targetReps,
    nextSets: exercise.targetSets,
    reasoning: suggestion.message,
  };
}

const DEFAULT_TARGET_LIMIT = 5;

// The most-recently-trained distinct exercises, most recent first — the
// ones a user is actually about to train again soon, so "next progression
// target" cards stay relevant rather than surfacing something from months
// ago.
export function getOverloadTargets(history: CompletedWorkout[], limit = DEFAULT_TARGET_LIMIT): OverloadTarget[] {
  const seen = new Set<string>();
  const targets: OverloadTarget[] = [];

  for (const workout of history) {
    for (const exercise of workout.exercises) {
      if (seen.has(exercise.name)) continue;
      seen.add(exercise.name);
      const target = getOverloadTarget(history, exercise.name);
      if (target) targets.push(target);
      if (targets.length >= limit) return targets;
    }
  }

  return targets;
}
