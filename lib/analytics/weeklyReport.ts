import type { CompletedWorkout } from "@/types/workout-log";
import type { Goal } from "@/types/goals";
import type { CoachRecommendation, ConsistencyAnalytics, VolumeAnalytics, WeeklyReport } from "@/types/analytics";
import { getWeekStart, getAllPersonalRecords, addDays } from "@/lib/dashboard";
import { getGoalProgress } from "@/lib/goals";
import { getPercentChange } from "@/lib/insights";

const TOP_RECOMMENDATIONS_IN_REPORT = 3;

function topExerciseThisWeek(history: CompletedWorkout[], weekStart: Date, weekEnd: Date): { exerciseName: string; volume: number } | null {
  const totals = new Map<string, number>();
  for (const workout of history) {
    const d = new Date(workout.completedAt);
    if (d < weekStart || d >= weekEnd) continue;
    for (const exercise of workout.exercises) {
      let exerciseVolume = 0;
      for (const set of exercise.sets) {
        if (!set.completed || set.weight === null || set.weight <= 0 || set.reps === null || set.reps <= 0) continue;
        exerciseVolume += set.weight * set.reps;
      }
      totals.set(exercise.name, (totals.get(exercise.name) ?? 0) + exerciseVolume);
    }
  }
  let best: { exerciseName: string; volume: number } | null = null;
  for (const [exerciseName, volume] of totals) {
    if (volume <= 0) continue;
    if (!best || volume > best.volume) best = { exerciseName, volume: Math.round(volume) };
  }
  return best;
}

// A goal is "missed this week" when it has a concrete weekly cadence
// (weekly_frequency) that wasn't hit, or a target date that's already
// passed without being complete — the only two goal types with a natural
// weekly/deadline reading. Open-ended goals (exercise weight, workout
// count, streak) with no date never show up here; they're just "in
// progress," not "missed."
function missedGoalsThisWeek(goals: Goal[], history: CompletedWorkout[], workoutsThisWeek: number): WeeklyReport["missedGoals"] {
  const missed: WeeklyReport["missedGoals"] = [];
  const now = new Date();

  for (const goal of goals) {
    const progress = getGoalProgress(goal, history);
    if (progress.isComplete) continue;

    if (goal.type === "weekly_frequency" && workoutsThisWeek < goal.targetValue) {
      missed.push({ title: goal.title, progressPercent: progress.progressPercent });
      continue;
    }

    if (goal.targetDate && new Date(goal.targetDate) < now) {
      missed.push({ title: goal.title, progressPercent: progress.progressPercent });
    }
  }

  return missed;
}

function buildSummary(params: {
  completedWorkouts: number;
  workoutsVsTarget: { completed: number; target: number };
  newPRCount: number;
  volumeChangePercent: number | null;
  topExercise: { exerciseName: string; volume: number } | null;
  missedGoalCount: number;
}): string {
  const { completedWorkouts, workoutsVsTarget, newPRCount, volumeChangePercent, topExercise, missedGoalCount } = params;

  if (completedWorkouts === 0) {
    return "No workouts logged this week. Getting back to even one session will restart your momentum.";
  }

  const parts: string[] = [];
  parts.push(
    `You completed ${completedWorkouts} of ${workoutsVsTarget.target} planned workout${workoutsVsTarget.target === 1 ? "" : "s"} this week.`
  );
  if (newPRCount > 0) parts.push(`You set ${newPRCount} new personal record${newPRCount === 1 ? "" : "s"}.`);
  if (volumeChangePercent !== null) {
    parts.push(
      volumeChangePercent >= 0
        ? `Training volume was up ${volumeChangePercent}% from last week.`
        : `Training volume was down ${Math.abs(volumeChangePercent)}% from last week.`
    );
  }
  if (topExercise) parts.push(`${topExercise.exerciseName} saw the most volume this week.`);
  if (missedGoalCount > 0) parts.push(`${missedGoalCount} goal${missedGoalCount === 1 ? " is" : "s are"} behind pace.`);

  return parts.join(" ");
}

export function getWeeklyReport(params: {
  history: CompletedWorkout[];
  goals: Goal[];
  consistency: ConsistencyAnalytics;
  volume: VolumeAnalytics;
  weeklyTarget: number;
  recommendations: CoachRecommendation[];
}): WeeklyReport {
  const { history, goals, consistency, volume, weeklyTarget, recommendations } = params;

  const weekStart = getWeekStart(new Date());
  const weekEnd = addDays(weekStart, 7);
  const completedWorkouts = consistency.workoutsThisWeek;

  const newPRs = getAllPersonalRecords(history)
    .filter((pr) => new Date(pr.completedAt) >= weekStart && new Date(pr.completedAt) < weekEnd)
    .map((pr) => ({ exerciseName: pr.exerciseName, detail: pr.detail }));

  const missedGoals = missedGoalsThisWeek(goals, history, completedWorkouts);

  const weeks = volume.weekly;
  const volumeChangePercent =
    weeks.length >= 2 ? getPercentChange(weeks[weeks.length - 2].volume, weeks[weeks.length - 1].volume) : null;

  const topExercise = topExerciseThisWeek(history, weekStart, weekEnd);

  const summary = buildSummary({
    completedWorkouts,
    workoutsVsTarget: { completed: completedWorkouts, target: weeklyTarget },
    newPRCount: newPRs.length,
    volumeChangePercent,
    topExercise,
    missedGoalCount: missedGoals.length,
  });

  return {
    weekStart: weekStart.toISOString(),
    weekEnd: weekEnd.toISOString(),
    completedWorkouts,
    newPRs,
    missedGoals,
    volumeChangePercent,
    workoutsVsTarget: { completed: completedWorkouts, target: weeklyTarget },
    topExercise,
    summary,
    recommendations: recommendations.slice(0, TOP_RECOMMENDATIONS_IN_REPORT),
  };
}
