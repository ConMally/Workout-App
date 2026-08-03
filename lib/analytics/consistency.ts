import type { CompletedWorkout } from "@/types/workout-log";
import type { ConsistencyResult } from "@/types/insights";
import type { ConsistencyAnalytics } from "@/types/analytics";
import { addDays, getStreakDays, getLongestStreakDays, getWeekStart, startOfDay } from "@/lib/dashboard";

// Extends lib/insights.ts#getConsistency's result (which already owns
// score, weeklyAverage, plannedCompletionPercent, and findings-text) with
// the specific fields Phase 5's Coach section needs. Takes the already-
// computed ConsistencyResult as a parameter rather than calling
// getConsistency itself — lib/analytics/index.ts computes it once and
// shares it with both this and lib/insights.ts#getRecommendations, so a
// history walk that's already O(n) never runs twice per render.

const MISSED_GOAL_WEEK_WINDOW = 8;

function countMissedGoalWeeks(history: CompletedWorkout[], weeklyTarget: number): number {
  const currentWeekStart = getWeekStart(new Date());
  let missed = 0;
  // Excludes the current (possibly still in-progress) week — a week that
  // hasn't finished yet can't fairly be counted as "missed."
  for (let i = 1; i <= MISSED_GOAL_WEEK_WINDOW; i++) {
    const start = addDays(currentWeekStart, -7 * i);
    const end = addDays(start, 7);
    const count = history.filter((w) => {
      const d = new Date(w.completedAt);
      return d >= start && d < end;
    }).length;
    if (count < weeklyTarget) missed += 1;
  }
  return missed;
}

export function getConsistencyAnalytics(history: CompletedWorkout[], base: ConsistencyResult): ConsistencyAnalytics {
  const monthStart = startOfDay(new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  const workoutsThisMonth = history.filter((w) => new Date(w.completedAt) >= monthStart).length;

  return {
    workoutsThisWeek: base.workoutsLast7Days,
    workoutsThisMonth,
    currentStreak: getStreakDays(history),
    longestStreak: getLongestStreakDays(history),
    averageWorkoutsPerWeek: base.weeklyAverage,
    missedGoalWeeks: countMissedGoalWeeks(history, base.weeklyTarget),
    adherencePercent: base.plannedCompletionPercent,
  };
}
