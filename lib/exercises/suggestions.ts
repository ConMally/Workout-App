import type { WorkoutPlan } from "@/types/workout";
import type { ExerciseDefinition, MuscleGroup, PlanSuggestion } from "@/types/exercises";
import { MOVEMENT_PATTERN_LABELS, MUSCLE_GROUP_LABELS } from "@/types/exercises";
import { getExerciseByName } from "./library";

type TrainingDay = WorkoutPlan["weeklySchedule"][number];
type PlanExercise = TrainingDay["exercises"][number];

const DUPLICATE_MOVEMENT_THRESHOLD = 3;
const HIGH_VOLUME_SETS_THRESHOLD = 16;
const LOW_VOLUME_SETS_THRESHOLD = 6;

// Live, in-editor hints for a single day being edited — every check is a
// plain count/threshold over the day's exercises (resolved against the
// exercise library), same "deterministic, explainable, no AI call"
// philosophy as the rest of this app's recommendation logic. Exercises the
// library doesn't recognize are simply skipped rather than guessed at —
// this never invents a muscle group for an exercise it can't identify.
export function getDayEditingSuggestions(day: TrainingDay): PlanSuggestion[] {
  const resolved = day.exercises
    .map((exercise) => ({ exercise, definition: getExerciseByName(exercise.name) }))
    .filter((r): r is { exercise: PlanExercise; definition: ExerciseDefinition } => r.definition !== null);

  const suggestions: PlanSuggestion[] = [];

  // Duplicate movement pattern — "You already have four chest presses."
  const countByPattern = new Map<string, number>();
  for (const { definition } of resolved) {
    countByPattern.set(definition.movementPattern, (countByPattern.get(definition.movementPattern) ?? 0) + 1);
  }
  for (const [pattern, count] of countByPattern) {
    if (count < DUPLICATE_MOVEMENT_THRESHOLD) continue;
    const label = MOVEMENT_PATTERN_LABELS[pattern as keyof typeof MOVEMENT_PATTERN_LABELS];
    suggestions.push({
      id: `duplicate_movement-${pattern}`,
      type: "duplicate_movement",
      message: `You already have ${count} ${label.toLowerCase()} exercises.`,
      explanation: "Repeating the same movement pattern several times in one day adds redundant fatigue without much extra stimulus variety.",
    });
  }

  // Push/pull imbalance within the day.
  const pushCount = resolved.filter((r) => r.definition.category === "push").length;
  const pullCount = resolved.filter((r) => r.definition.category === "pull").length;
  if (pushCount >= 2 && pullCount === 0) {
    suggestions.push({
      id: "push_pull_imbalance-missing_pull",
      type: "push_pull_imbalance",
      message: "Consider adding a horizontal pull.",
      explanation: `This day has ${pushCount} pushing exercises and no pulling movements.`,
    });
  } else if (pullCount >= 2 && pushCount === 0) {
    suggestions.push({
      id: "push_pull_imbalance-missing_push",
      type: "push_pull_imbalance",
      message: "Consider adding a pushing exercise to balance this day.",
      explanation: `This day has ${pullCount} pulling exercises and no pushing movements.`,
    });
  }

  // Missing muscle groups that commonly pair with what's already present.
  const musclesPresent = new Set(resolved.map((r) => r.definition.primaryMuscle));
  const pairChecks: { has: MuscleGroup; missing: MuscleGroup; message: string }[] = [
    { has: "chest", missing: "back", message: "Consider adding a horizontal pull to balance your chest work." },
    { has: "quads", missing: "hamstrings", message: "Consider adding a hamstring exercise to balance your quad work." },
    { has: "biceps", missing: "triceps", message: "Consider adding a triceps exercise to balance your biceps work." },
  ];
  for (const check of pairChecks) {
    if (musclesPresent.has(check.has) && !musclesPresent.has(check.missing)) {
      suggestions.push({
        id: `missing_muscle_group-${check.missing}`,
        type: "missing_muscle_group",
        message: check.message,
        explanation: `This day trains ${MUSCLE_GROUP_LABELS[check.has].toLowerCase()} but not ${MUSCLE_GROUP_LABELS[check.missing].toLowerCase()}.`,
      });
    }
  }

  // Volume too high for a single muscle group in one day.
  const setsByMuscle = new Map<MuscleGroup, number>();
  for (const { exercise, definition } of resolved) {
    setsByMuscle.set(definition.primaryMuscle, (setsByMuscle.get(definition.primaryMuscle) ?? 0) + exercise.sets);
  }
  for (const [muscle, sets] of setsByMuscle) {
    if (sets < HIGH_VOLUME_SETS_THRESHOLD) continue;
    suggestions.push({
      id: `volume_too_high-${muscle}`,
      type: "volume_too_high",
      message: `${MUSCLE_GROUP_LABELS[muscle]} volume looks high for one day (${sets} sets).`,
      explanation: "High single-day volume for one muscle group can hurt recovery before your next session for it.",
    });
  }

  // Volume too low for the day overall.
  const totalSets = day.exercises.reduce((sum, e) => sum + e.sets, 0);
  if (totalSets > 0 && totalSets < LOW_VOLUME_SETS_THRESHOLD) {
    suggestions.push({
      id: "volume_too_low-day",
      type: "volume_too_low",
      message: "This day's total volume looks low.",
      explanation: `Only ${totalSets} total sets logged for this day — consider adding another exercise or set.`,
    });
  }

  return suggestions;
}
