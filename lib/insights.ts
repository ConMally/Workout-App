import type { WorkoutPlan } from "@/types/workout";
import type { CompletedWorkout } from "@/types/workout-log";
import type {
  ConsistencyResult,
  ExerciseFrequencyResult,
  ExercisePerformancePoint,
  ExerciseStats,
  MuscleBalancePair,
  MuscleBalanceResult,
  Recommendation,
  ReadinessTrendResult,
  VolumeTrendResult,
} from "@/types/insights";
import type { SubstitutionHistory } from "./storage";
import {
  addDays,
  getAllPersonalRecords,
  getLongestStreakDays,
  getNextRecommendation,
  getStreakDays,
  getWeekStart,
  startOfDay,
} from "./dashboard";
import { estimateOneRepMax } from "./progression";
import {
  ARM_GROUPS,
  LOWER_GROUPS,
  MUSCLE_GROUP_LABELS,
  PULL_GROUPS,
  PUSH_GROUPS,
  UPPER_GROUPS,
  getMuscleGroup,
  type MuscleGroup,
} from "./muscle-groups";

// All calculations here are pure functions of history/plan/settings state —
// nothing is recalculated on every render by these functions themselves;
// callers (InsightsPage) are expected to wrap them in a single useMemo so
// the full history is only walked once per data change, not once per
// section component.

export function getPercentChange(from: number, to: number): number | null {
  if (from <= 0) return null;
  return Math.round(((to - from) / from) * 100);
}

// ---------------------------------------------------------------------------
// Per-exercise stats — shared by Strength Progress, Exercise Progress
// Detail, and Goals. This is the single place history is walked for one
// exercise's numbers.
// ---------------------------------------------------------------------------

export const MIN_WORKOUTS_FOR_STRENGTH_TREND = 2;

export function getExerciseStats(history: CompletedWorkout[], exerciseName: string): ExerciseStats {
  const chronological = [...history].reverse();
  const points: ExercisePerformancePoint[] = [];

  let workoutCount = 0;
  let totalCompletedSets = 0;
  let heaviestWeight = 0;
  let bestReps: { reps: number; weight: number } | null = null;
  let bestEstimatedOneRepMax = 0;

  for (const workout of chronological) {
    const exercise = workout.exercises.find((e) => e.name === exerciseName);
    if (!exercise) continue;
    workoutCount += 1;

    const completedSets = exercise.sets.filter((s) => s.completed);
    totalCompletedSets += completedSets.length;

    let pointWeight: number | null = null;
    let pointReps: number | null = null;
    let pointOneRepMax: number | null = null;

    for (const set of completedSets) {
      if (set.weight === null || set.weight <= 0) continue;
      if (set.weight > heaviestWeight) heaviestWeight = set.weight;
      if (set.reps === null || set.reps <= 0) continue;

      if (!bestReps || set.reps > bestReps.reps) bestReps = { reps: set.reps, weight: set.weight };

      const oneRepMax = estimateOneRepMax(set.weight, set.reps);
      if (oneRepMax > bestEstimatedOneRepMax) bestEstimatedOneRepMax = oneRepMax;
      if (pointOneRepMax === null || oneRepMax > pointOneRepMax) {
        pointOneRepMax = oneRepMax;
        pointWeight = set.weight;
        pointReps = set.reps;
      }
    }

    points.push({ completedAt: workout.completedAt, weight: pointWeight, reps: pointReps, estimatedOneRepMax: pointOneRepMax });
  }

  return {
    exerciseName,
    workoutCount,
    totalCompletedSets,
    firstPerformance: points[0] ?? null,
    latestPerformance: points[points.length - 1] ?? null,
    heaviestWeight,
    bestReps,
    bestEstimatedOneRepMax,
    history: points,
    prHistory: getAllPersonalRecords(history).filter((e) => e.exerciseName === exerciseName),
  };
}

export function listExercisesWithHistory(history: CompletedWorkout[]): string[] {
  const counts = new Map<string, number>();
  for (const workout of history) {
    for (const exercise of workout.exercises) {
      counts.set(exercise.name, (counts.get(exercise.name) ?? 0) + 1);
    }
  }
  return Array.from(counts.entries())
    .filter(([, count]) => count >= MIN_WORKOUTS_FOR_STRENGTH_TREND)
    .sort((a, b) => b[1] - a[1])
    .map(([name]) => name);
}

// ---------------------------------------------------------------------------
// Consistency — see README for the exact score formula.
// ---------------------------------------------------------------------------

const DEFAULT_WEEKLY_TARGET = 3;
export const MIN_WEEKS_FOR_CONSISTENCY_TREND = 2;

export function getConsistency(history: CompletedWorkout[], plan: WorkoutPlan | null): ConsistencyResult {
  const now = new Date();
  const sevenDaysAgo = addDays(now, -7);
  const thirtyDaysAgo = addDays(now, -30);
  const sixtyDaysAgo = addDays(now, -60);

  const workoutsLast7Days = history.filter((w) => new Date(w.completedAt) >= sevenDaysAgo).length;
  const workoutsLast30Days = history.filter((w) => new Date(w.completedAt) >= thirtyDaysAgo).length;
  const workoutsPrior30to60Days = history.filter((w) => {
    const d = new Date(w.completedAt);
    return d >= sixtyDaysAgo && d < thirtyDaysAgo;
  }).length;

  const weeklyTarget = plan?.summary.daysPerWeek ?? DEFAULT_WEEKLY_TARGET;
  const weeklyAverage = Math.round((workoutsLast30Days / (30 / 7)) * 10) / 10;
  const currentStreak = getStreakDays(history);
  const longestStreak = getLongestStreakDays(history);

  const frequencyScore = Math.min(1, workoutsLast7Days / weeklyTarget) * 60;
  const streakScore = Math.min(1, currentStreak / 7) * 20;
  const expectedMonthly = weeklyTarget * (30 / 7);
  const monthlyScore = Math.min(1, workoutsLast30Days / expectedMonthly) * 20;
  const score = history.length === 0 ? 0 : Math.round(frequencyScore + streakScore + monthlyScore);

  // "Enough plan data" for a planned-completion percentage: a plan exists
  // and at least 14 days have elapsed since the oldest logged workout.
  let plannedCompletionPercent: number | null = null;
  if (plan && history.length > 0) {
    const oldest = new Date(history[history.length - 1].completedAt);
    const daysSinceStart = Math.max(1, Math.floor((now.getTime() - oldest.getTime()) / 86400000));
    if (daysSinceStart >= 14) {
      const expectedTotal = Math.max(1, Math.round((daysSinceStart / 7) * weeklyTarget));
      plannedCompletionPercent = Math.min(100, Math.round((history.length / expectedTotal) * 100));
    }
  }

  // At least MIN_WEEKS_FOR_CONSISTENCY_TREND weeks since the oldest logged
  // workout — gates any finding that compares one period against another,
  // since a "your frequency increased" claim is misleading with under 2
  // weeks of history to compare from. Same day-count pattern as
  // plannedCompletionPercent's own 14-day gate above.
  const oldestWorkoutAt = history.length > 0 ? new Date(history[history.length - 1].completedAt) : null;
  const daysSinceOldest = oldestWorkoutAt ? Math.floor((now.getTime() - oldestWorkoutAt.getTime()) / 86400000) : 0;
  const hasEnoughDataForTrend = daysSinceOldest >= MIN_WEEKS_FOR_CONSISTENCY_TREND * 7;

  const findings: string[] = [];
  if (history.length === 0) {
    findings.push("Complete your first workout to start tracking consistency.");
  } else {
    findings.push(
      workoutsLast7Days >= weeklyTarget
        ? `You completed ${workoutsLast7Days} workout${workoutsLast7Days === 1 ? "" : "s"} this week, matching or exceeding your target of ${weeklyTarget}.`
        : `You've completed ${workoutsLast7Days} of your ${weeklyTarget} weekly target workout${weeklyTarget === 1 ? "" : "s"} — ${weeklyTarget - workoutsLast7Days} to go.`
    );

    if (hasEnoughDataForTrend && (workoutsLast30Days > 0 || workoutsPrior30to60Days > 0)) {
      if (workoutsLast30Days > workoutsPrior30to60Days) {
        findings.push("Your training frequency has increased compared with last month.");
      } else if (workoutsLast30Days < workoutsPrior30to60Days) {
        findings.push("Your training frequency has decreased compared with last month.");
      } else {
        findings.push("Your training frequency has stayed steady compared with last month.");
      }
    }

    const thisWeekStart = getWeekStart(now);
    const lastWeekStart = addDays(thisWeekStart, -7);
    const thisWeekCount = history.filter((w) => new Date(w.completedAt) >= thisWeekStart).length;
    const lastWeekCount = history.filter((w) => {
      const d = new Date(w.completedAt);
      return d >= lastWeekStart && d < thisWeekStart;
    }).length;
    if (hasEnoughDataForTrend && thisWeekCount < weeklyTarget && lastWeekCount < weeklyTarget) {
      findings.push("You have missed your weekly target for two consecutive weeks.");
    }

    if (currentStreak >= 3) {
      findings.push(`You're on a ${currentStreak}-day streak — nice consistency.`);
    }
  }

  return {
    score,
    workoutsLast7Days,
    workoutsLast30Days,
    weeklyTarget,
    weeklyAverage,
    currentStreak,
    longestStreak,
    plannedCompletionPercent,
    hasEnoughDataForTrend,
    findings,
  };
}

// ---------------------------------------------------------------------------
// Weekly volume — logged weighted volume only; never invents a weight.
// ---------------------------------------------------------------------------

function weekVolume(history: CompletedWorkout[], weekStart: Date, weekEnd: Date): number {
  let total = 0;
  for (const workout of history) {
    const d = new Date(workout.completedAt);
    if (d < weekStart || d >= weekEnd) continue;
    for (const exercise of workout.exercises) {
      for (const set of exercise.sets) {
        if (!set.completed || set.weight === null || set.weight <= 0 || set.reps === null || set.reps <= 0) continue;
        total += set.weight * set.reps;
      }
    }
  }
  return Math.round(total);
}

export const MIN_COMPLETED_WEEKS_FOR_VOLUME_TREND = 2;

export function getVolumeTrend(history: CompletedWorkout[]): VolumeTrendResult {
  const currentWeekStart = getWeekStart(new Date());
  const weeklyTotals: { weekStart: string; volume: number }[] = [];
  for (let i = 3; i >= 0; i--) {
    const start = addDays(currentWeekStart, -7 * i);
    weeklyTotals.push({ weekStart: start.toISOString(), volume: weekVolume(history, start, addDays(start, 7)) });
  }

  const currentWeekVolume = weeklyTotals[3].volume;
  const previousWeekVolume = weeklyTotals[2].volume;
  const percentChange = getPercentChange(previousWeekVolume, currentWeekVolume);
  const rollingFourWeekAverage = Math.round(weeklyTotals.reduce((s, w) => s + w.volume, 0) / 4);

  return {
    currentWeekVolume,
    previousWeekVolume,
    percentChange,
    rollingFourWeekAverage,
    weeklyTotals,
    hasEnoughData: weeklyTotals.filter((w) => w.volume > 0).length >= MIN_COMPLETED_WEEKS_FOR_VOLUME_TREND,
  };
}

// ---------------------------------------------------------------------------
// Muscle balance — trailing 28-day window, completed-set counts.
// ---------------------------------------------------------------------------

// "Enough data" for muscle balance is judged once for the whole feature
// (not per-pair set counts) — at least 6 completed workouts in the
// trailing window, or at least 3 weeks since the user's very first logged
// workout, whichever comes first.
export const MIN_WORKOUTS_FOR_MUSCLE_BALANCE = 6;
export const MIN_WEEKS_FOR_MUSCLE_BALANCE = 3;
const BALANCE_WINDOW_DAYS = 28;

function countSetsByGroup(history: CompletedWorkout[], windowStart: Date): Record<MuscleGroup, number> {
  const counts: Record<MuscleGroup, number> = {
    chest: 0, back: 0, shoulders: 0, quads: 0, posterior_chain: 0, biceps: 0, triceps: 0, core: 0,
  };
  for (const workout of history) {
    if (new Date(workout.completedAt) < windowStart) continue;
    for (const exercise of workout.exercises) {
      const group = getMuscleGroup(exercise.name);
      if (!group) continue;
      counts[group] += exercise.sets.filter((s) => s.completed).length;
    }
  }
  return counts;
}

const sumGroups = (counts: Record<MuscleGroup, number>, groups: MuscleGroup[]) =>
  groups.reduce((s, g) => s + counts[g], 0);

type BalanceState = "a_low" | "b_low" | "balanced" | null;

function calcBalanceState(aCount: number, bCount: number, hasEnoughData: boolean): { aPercent: number; state: BalanceState } {
  const total = aCount + bCount;
  const aPercent = total > 0 ? Math.round((aCount / total) * 100) : 50;
  if (!hasEnoughData) return { aPercent, state: null };
  if (aCount < bCount * 0.8) return { aPercent, state: "a_low" };
  if (bCount < aCount * 0.8) return { aPercent, state: "b_low" };
  return { aPercent, state: "balanced" };
}

function buildPair(
  label: string,
  aLabel: string,
  bLabel: string,
  aCount: number,
  bCount: number,
  hasEnoughData: boolean,
  aLowMessage: string,
  bLowMessage: string,
  balancedMessage: string
): MuscleBalancePair {
  const { aPercent, state } = calcBalanceState(aCount, bCount, hasEnoughData);
  const observation =
    state === "a_low" ? aLowMessage : state === "b_low" ? bLowMessage : state === "balanced" ? balancedMessage : null;
  return { label, aLabel, bLabel, aCount, bCount, aPercent, hasEnoughData, observation };
}

export function getMuscleBalance(history: CompletedWorkout[]): MuscleBalanceResult {
  const windowStart = addDays(startOfDay(new Date()), -BALANCE_WINDOW_DAYS);
  const counts = countSetsByGroup(history, windowStart);

  const workoutsInWindow = history.filter((w) => new Date(w.completedAt) >= windowStart).length;
  const firstEverWorkout = history.length > 0 ? new Date(history[history.length - 1].completedAt) : null;
  const weeksSinceFirstWorkout = firstEverWorkout
    ? Math.floor((Date.now() - firstEverWorkout.getTime()) / (7 * 86400000))
    : 0;
  const hasEnoughData =
    workoutsInWindow >= MIN_WORKOUTS_FOR_MUSCLE_BALANCE || weeksSinceFirstWorkout >= MIN_WEEKS_FOR_MUSCLE_BALANCE;

  const pairs: MuscleBalancePair[] = [
    buildPair(
      "Push vs. pull",
      "Push",
      "Pull",
      sumGroups(counts, PUSH_GROUPS),
      sumGroups(counts, PULL_GROUPS),
      hasEnoughData,
      "Pushing volume is lower than pulling volume.",
      "Pulling volume is lower than pushing volume.",
      "Push and pull volume have been fairly balanced."
    ),
    buildPair(
      "Upper vs. lower body",
      "Upper body",
      "Lower body",
      sumGroups(counts, UPPER_GROUPS),
      sumGroups(counts, LOWER_GROUPS),
      hasEnoughData,
      "Upper-body training has been lighter than lower-body training.",
      "Lower-body training has been lighter than upper-body training.",
      "Upper- and lower-body training have been consistent with each other."
    ),
    buildPair(
      "Chest vs. back",
      "Chest",
      "Back",
      counts.chest,
      counts.back,
      hasEnoughData,
      "Chest volume is lower than back volume.",
      "Back volume is lower than chest volume.",
      "Chest and back volume have been fairly balanced."
    ),
    buildPair(
      "Quads vs. posterior chain",
      "Quads",
      MUSCLE_GROUP_LABELS.posterior_chain,
      counts.quads,
      counts.posterior_chain,
      hasEnoughData,
      "Quads have received less direct work than the posterior chain.",
      "The posterior chain (hamstrings/glutes) has received less direct work than quads.",
      "Quad and posterior-chain volume have been fairly balanced."
    ),
    buildPair(
      "Shoulders vs. arms",
      "Shoulders",
      "Arms",
      counts.shoulders,
      sumGroups(counts, ARM_GROUPS),
      hasEnoughData,
      "Shoulder volume is lower than arm volume.",
      "Arm volume is lower than shoulder volume.",
      "Shoulder and arm volume have been fairly balanced."
    ),
  ];

  return { pairs, coreSetsLast4Weeks: counts.core, hasEnoughData };
}

// ---------------------------------------------------------------------------
// Exercise frequency and neglected areas.
// ---------------------------------------------------------------------------

const NOT_PERFORMED_WINDOW_DAYS = 30;
const NEGLECTED_GROUP_THRESHOLD_DAYS = 21;
const ALL_MUSCLE_GROUPS: MuscleGroup[] = ["chest", "back", "shoulders", "quads", "posterior_chain", "biceps", "triceps", "core"];
export const MIN_WORKOUTS_FOR_EXERCISE_FREQUENCY = 3;

export function getExerciseFrequency(
  history: CompletedWorkout[],
  substitutionHistory: SubstitutionHistory
): ExerciseFrequencyResult {
  if (history.length < MIN_WORKOUTS_FOR_EXERCISE_FREQUENCY) {
    return {
      hasEnoughData: false,
      mostFrequent: [],
      notPerformedInLast30Days: [],
      neglectedMuscleGroups: [],
      recentSwaps: [],
    };
  }

  const now = new Date();
  const cutoff = addDays(now, -NOT_PERFORMED_WINDOW_DAYS);

  const seen = new Map<string, { count: number; lastPerformedAt: string }>();
  for (const workout of history) {
    for (const exercise of workout.exercises) {
      const existing = seen.get(exercise.name);
      if (existing) existing.count += 1;
      else seen.set(exercise.name, { count: 1, lastPerformedAt: workout.completedAt });
    }
  }
  const entries = Array.from(seen.entries()).map(([exerciseName, v]) => ({
    exerciseName,
    workoutCount: v.count,
    lastPerformedAt: v.lastPerformedAt,
  }));

  const mostFrequent = [...entries].sort((a, b) => b.workoutCount - a.workoutCount).slice(0, 5);
  const notPerformedInLast30Days = entries
    .filter((e) => new Date(e.lastPerformedAt) < cutoff)
    .sort((a, b) => new Date(b.lastPerformedAt).getTime() - new Date(a.lastPerformedAt).getTime())
    .slice(0, 5);

  const lastTrainedByGroup = new Map<MuscleGroup, string>();
  for (const workout of history) {
    for (const exercise of workout.exercises) {
      const group = getMuscleGroup(exercise.name);
      if (!group || lastTrainedByGroup.has(group)) continue;
      lastTrainedByGroup.set(group, workout.completedAt);
    }
  }
  const neglectedMuscleGroups = ALL_MUSCLE_GROUPS.map((group) => {
    const lastTrainedAt = lastTrainedByGroup.get(group) ?? null;
    const daysSinceTrained = lastTrainedAt ? Math.floor((now.getTime() - new Date(lastTrainedAt).getTime()) / 86400000) : null;
    return { group, label: MUSCLE_GROUP_LABELS[group], lastTrainedAt, daysSinceTrained };
  })
    .filter((g) => g.daysSinceTrained === null || g.daysSinceTrained >= NEGLECTED_GROUP_THRESHOLD_DAYS)
    .sort((a, b) => (b.daysSinceTrained ?? Infinity) - (a.daysSinceTrained ?? Infinity))
    .slice(0, 3);

  const recentSwaps = Object.entries(substitutionHistory)
    .filter(([, names]) => names.length > 1)
    .map(([slotKey, names]) => ({ slotKey, fromName: names[0], toName: names[names.length - 1] }))
    .slice(0, 5);

  return { hasEnoughData: true, mostFrequent, notPerformedInLast30Days, neglectedMuscleGroups, recentSwaps };
}

// ---------------------------------------------------------------------------
// Next actions — ranked, explainable recommendations. Max 3 shown by the
// caller; this returns every candidate that fired, already sorted.
// ---------------------------------------------------------------------------

export function getRecommendations(params: {
  history: CompletedWorkout[];
  plan: WorkoutPlan | null;
  consistency: ConsistencyResult;
  muscleBalance: MuscleBalanceResult;
  readiness: ReadinessTrendResult;
  exerciseFrequency: ExerciseFrequencyResult;
}): Recommendation[] {
  const { history, plan, consistency, muscleBalance, readiness, exerciseFrequency } = params;
  const candidates: Recommendation[] = [];

  if (readiness.showSafetyMessage) {
    candidates.push({
      id: "readiness-safety",
      priority: 1,
      message: "Consider a lighter session — recent difficulty and soreness ratings have been high.",
      explanation: `Based on your last few check-ins (average soreness ${readiness.averages.soreness}/10).`,
    });
  }

  const weeklyGap = consistency.weeklyTarget - consistency.workoutsLast7Days;
  if (history.length > 0 && weeklyGap >= 1 && weeklyGap <= 2) {
    candidates.push({
      id: "weekly-goal-gap",
      priority: 2,
      message: `Complete ${weeklyGap} more workout${weeklyGap === 1 ? "" : "s"} to reach your weekly goal.`,
      explanation: `You've completed ${consistency.workoutsLast7Days} of ${consistency.weeklyTarget} planned workouts this week.`,
    });
  }

  const pushPull = muscleBalance.pairs.find((p) => p.label === "Push vs. pull");
  if (pushPull?.observation && pushPull.observation.startsWith("Pulling")) {
    candidates.push({
      id: "muscle-imbalance-pull",
      priority: 3,
      message: "Add a pulling exercise to improve push-pull balance.",
      explanation: `Pulling exercises made up ${pushPull.aPercent < 50 ? pushPull.aPercent : 100 - pushPull.aPercent}% of push/pull sets over the last 4 weeks.`,
    });
  } else if (pushPull?.observation && pushPull.observation.startsWith("Pushing")) {
    candidates.push({
      id: "muscle-imbalance-push",
      priority: 3,
      message: "Add a pushing exercise to improve push-pull balance.",
      explanation: `Pushing exercises made up a smaller share of your push/pull sets over the last 4 weeks.`,
    });
  }

  if (history.length > 0) {
    const next = getNextRecommendation(history, plan);
    candidates.push({
      id: "progression",
      priority: 4,
      message: next.message,
      explanation: "Based on your most recently completed workout.",
    });
  }

  const topNeglected = exerciseFrequency.neglectedMuscleGroups[0];
  if (topNeglected) {
    candidates.push({
      id: "neglected-group",
      priority: 5,
      message: `Consider adding ${topNeglected.label.toLowerCase()} work to an upcoming session.`,
      explanation:
        topNeglected.daysSinceTrained === null
          ? `No logged ${topNeglected.label.toLowerCase()} work yet.`
          : `Last trained ${topNeglected.daysSinceTrained} days ago.`,
    });
  }

  candidates.push({
    id: "low-data-fallback",
    priority: 6,
    message: "Log more workouts to unlock stronger insights.",
    explanation: "More history improves the accuracy of these recommendations.",
  });

  return candidates.sort((a, b) => a.priority - b.priority);
}
