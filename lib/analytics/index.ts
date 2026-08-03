import type { WorkoutPlan } from "@/types/workout";
import type { CompletedWorkout } from "@/types/workout-log";
import type { Goal } from "@/types/goals";
import type { CoachAnalytics } from "@/types/analytics";
import type { SubstitutionHistory } from "@/lib/storage";
import { getConsistency, getExerciseFrequency, getMuscleBalance, getRecommendations } from "@/lib/insights";
import { getReadinessTrend } from "@/lib/readiness";
import { getVolumeAnalytics } from "./volume";
import { getConsistencyAnalytics } from "./consistency";
import { getWorkoutTrends } from "./trends";
import { getRecoveryScore } from "./recovery";
import { detectPlateaus } from "./plateau";
import { getOverloadTargets } from "./overload";
import { getCoachRecommendations } from "./coach";
import { getWeeklyReport } from "./weeklyReport";
import { getExerciseCoachRecommendations } from "@/lib/exercises/coachSuggestions";

// The single entry point for Phase 5's Coach dashboard section — every
// sub-calculation in lib/analytics/* (and every existing one it reuses from
// lib/insights.ts / lib/readiness.ts) runs exactly once here. Callers
// (components/coach/CoachSection.tsx) wrap this in a single useMemo keyed
// on [history, plan, goals, substitutionHistory, weeklyTarget] — no
// analytics computation ever happens inside a render or inside a chart
// component itself (see PART 9/10 of the phase spec: analytics stays out of
// components, expensive work stays memoized).
export function computeCoachAnalytics(params: {
  history: CompletedWorkout[];
  plan: WorkoutPlan | null;
  goals: Goal[];
  substitutionHistory: SubstitutionHistory;
  weeklyTarget: number | null;
}): CoachAnalytics {
  const { history, plan, goals, substitutionHistory, weeklyTarget } = params;

  // Shared building blocks — each computed once and reused by everything
  // below, rather than every sub-function re-deriving its own copy.
  const baseConsistency = getConsistency(history, plan);
  const readiness = getReadinessTrend(history);
  const muscleBalance = getMuscleBalance(history);
  const exerciseFrequency = getExerciseFrequency(history, substitutionHistory);

  const volume = getVolumeAnalytics(history);
  const consistency = getConsistencyAnalytics(history, baseConsistency);
  const trends = getWorkoutTrends(history);
  const recovery = getRecoveryScore(history, readiness, volume);

  const plateaus = detectPlateaus({
    history,
    plan,
    volume,
    readiness,
    consistency,
    neglectedMuscleGroups: exerciseFrequency.neglectedMuscleGroups,
  });

  const overloadTargets = getOverloadTargets(history);

  const existingRecommendations = getRecommendations({
    history,
    plan,
    consistency: baseConsistency,
    muscleBalance,
    readiness,
    exerciseFrequency,
  });

  const exerciseRecommendations = getExerciseCoachRecommendations({ plan, plateaus });

  const recommendations = getCoachRecommendations({
    plateaus,
    overloadTargets,
    recovery,
    existingRecommendations,
    exerciseRecommendations,
  });

  const weeklyReport = getWeeklyReport({
    history,
    goals,
    consistency,
    volume,
    weeklyTarget: weeklyTarget ?? baseConsistency.weeklyTarget,
    recommendations,
  });

  return { volume, consistency, trends, recovery, plateaus, overloadTargets, recommendations, weeklyReport };
}

export * from "./volume";
export * from "./consistency";
export * from "./trends";
export * from "./exerciseProgress";
export * from "./plateau";
export * from "./overload";
export * from "./recovery";
export * from "./coach";
export * from "./weeklyReport";
