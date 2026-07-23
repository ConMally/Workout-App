import type {
  CompletedWorkout,
  LoggedExercise,
  PersonalRecordEvent,
  ProgressionSuggestion,
} from "@/types/workout-log";

// Deterministic, rule-based progression guidance and personal-record
// detection from workout history. No AI, no external calls — every decision
// here is a plain, explainable comparison against past numbers.

// ---------------------------------------------------------------------------
// Rep range parsing
// ---------------------------------------------------------------------------

export function parseRepRange(reps: string): { min: number; max: number } | null {
  const range = reps.match(/^(\d+)\s*-\s*(\d+)$/);
  if (range) {
    const min = Number(range[1]);
    const max = Number(range[2]);
    return Number.isFinite(min) && Number.isFinite(max) ? { min, max } : null;
  }

  const single = reps.match(/^(\d+)$/);
  if (single) {
    const value = Number(single[1]);
    return Number.isFinite(value) ? { min: value, max: value } : null;
  }

  return null;
}

// ---------------------------------------------------------------------------
// Estimated one-rep max — Epley formula: 1RM = weight * (1 + reps / 30).
// A single, consistent, documented formula. Most accurate under ~12 reps;
// still deterministic (if less precise) outside that range.
// ---------------------------------------------------------------------------

export function estimateOneRepMax(weight: number, reps: number): number {
  if (weight <= 0 || reps <= 0) return 0;
  if (reps === 1) return weight;
  return Math.round(weight * (1 + reps / 30) * 10) / 10;
}

// ---------------------------------------------------------------------------
// Progression recommendation
//
// Rules (checked in order):
//   1. No completed sets, or no weight ever entered -> no recommendation.
//      ("If no weight was entered, do not invent a recommendation.")
//   2. Every completed set with logged reps hit the top of the rep range
//      -> suggest a small weight increase.
//   3. Two or more completed sets fell below the bottom of the rep range
//      -> suggest holding or slightly reducing the weight.
//   4. Otherwise -> a neutral "keep going" note.
// ---------------------------------------------------------------------------

export function getProgressionSuggestion(exercise: LoggedExercise): ProgressionSuggestion | null {
  const range = parseRepRange(exercise.targetReps);
  if (!range) return null;

  const completedSets = exercise.sets.filter((set) => set.completed);
  if (completedSets.length === 0) return null;

  const hasLoggedWeight = completedSets.some((set) => set.weight !== null && set.weight > 0);
  if (!hasLoggedWeight) return null;

  const repsLogged = completedSets.filter((set) => set.reps !== null);
  if (repsLogged.length === 0) return null;

  const allAtOrAboveTop = repsLogged.every((set) => (set.reps as number) >= range.max);
  if (allAtOrAboveTop) {
    return {
      type: "increase_weight",
      message:
        "You hit the top of your rep range on every set last time — try adding a small amount of weight.",
    };
  }

  const belowBottomCount = repsLogged.filter((set) => (set.reps as number) < range.min).length;
  if (belowBottomCount >= 2) {
    return {
      type: "hold_or_decrease_weight",
      message:
        "You missed the bottom of your rep range on multiple sets last time — keep the same weight or reduce it slightly.",
    };
  }

  return {
    type: "hold",
    message: "Solid, consistent performance last time — keep the same weight and focus on form.",
  };
}

// ---------------------------------------------------------------------------
// Personal-record detection
//
// Only flags a PR when there's real prior history for that exact exercise to
// beat — a brand-new exercise's first-ever logged set is not a "record."
// Tracks running bests *within* the just-completed workout too, so three
// sets that all tie the same new best don't each get flagged separately.
// ---------------------------------------------------------------------------

interface PriorStats {
  heaviestWeight: number;
  bestRepsAtWeight: Map<number, number>;
  bestEstimatedOneRepMax: number;
}

function priorStatsForExercise(history: CompletedWorkout[], exerciseName: string): PriorStats {
  let heaviestWeight = 0;
  const bestRepsAtWeight = new Map<number, number>();
  let bestEstimatedOneRepMax = 0;

  for (const workout of history) {
    for (const exercise of workout.exercises) {
      if (exercise.name !== exerciseName) continue;

      for (const set of exercise.sets) {
        if (!set.completed || set.weight === null || set.weight <= 0) continue;

        if (set.weight > heaviestWeight) heaviestWeight = set.weight;

        if (set.reps !== null && set.reps > 0) {
          const currentBest = bestRepsAtWeight.get(set.weight) ?? 0;
          if (set.reps > currentBest) bestRepsAtWeight.set(set.weight, set.reps);

          const oneRepMax = estimateOneRepMax(set.weight, set.reps);
          if (oneRepMax > bestEstimatedOneRepMax) bestEstimatedOneRepMax = oneRepMax;
        }
      }
    }
  }

  return { heaviestWeight, bestRepsAtWeight, bestEstimatedOneRepMax };
}

export function detectPersonalRecords(
  priorHistory: CompletedWorkout[],
  justCompleted: CompletedWorkout
): PersonalRecordEvent[] {
  const events: PersonalRecordEvent[] = [];

  for (const exercise of justCompleted.exercises) {
    const hasPriorHistory = priorHistory.some((workout) =>
      workout.exercises.some((ex) => ex.name === exercise.name)
    );
    if (!hasPriorHistory) continue;

    const stats = priorStatsForExercise(priorHistory, exercise.name);
    let runningHeaviest = stats.heaviestWeight;
    let runningOneRepMax = stats.bestEstimatedOneRepMax;
    const runningBestRepsAtWeight = new Map(stats.bestRepsAtWeight);

    for (const set of exercise.sets) {
      if (!set.completed || set.weight === null || set.weight <= 0 || set.reps === null || set.reps <= 0) {
        continue;
      }

      if (set.weight > runningHeaviest) {
        events.push({
          exerciseName: exercise.name,
          type: "heaviest_weight",
          newValue: set.weight,
          previousValue: runningHeaviest,
          detail: `${set.weight} (previously ${runningHeaviest})`,
        });
        runningHeaviest = set.weight;
      }

      const priorRepsAtThisWeight = runningBestRepsAtWeight.get(set.weight);
      if (priorRepsAtThisWeight !== undefined && set.reps > priorRepsAtThisWeight) {
        events.push({
          exerciseName: exercise.name,
          type: "most_reps_at_weight",
          newValue: set.reps,
          previousValue: priorRepsAtThisWeight,
          detail: `${set.reps} reps at ${set.weight} (previously ${priorRepsAtThisWeight})`,
        });
        runningBestRepsAtWeight.set(set.weight, set.reps);
      }

      const oneRepMax = estimateOneRepMax(set.weight, set.reps);
      if (oneRepMax > runningOneRepMax) {
        events.push({
          exerciseName: exercise.name,
          type: "estimated_one_rep_max",
          newValue: oneRepMax,
          previousValue: runningOneRepMax,
          detail: `~${oneRepMax} estimated 1RM (previously ~${runningOneRepMax})`,
        });
        runningOneRepMax = oneRepMax;
      }
    }
  }

  return events;
}
