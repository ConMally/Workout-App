"use client";

import { useMemo } from "react";
import type { WorkoutPlan } from "@/types/workout";
import type { ActiveWorkout, CompletedWorkout } from "@/types/workout-log";
import type { Goal } from "@/types/goals";
import {
  getNextRecommendation,
  getQuickStats,
  getRecentPRs,
  getTodayWorkout,
  getWeeklyProgress,
} from "@/lib/dashboard";
import StatsCard from "./StatsCard";
import TodayWorkout from "./TodayWorkout";
import WeeklyProgress from "./WeeklyProgress";
import RecentActivity from "./RecentActivity";
import RecentPRs from "./RecentPRs";
import RecommendationCard from "./RecommendationCard";
import GoalsSummary from "./GoalsSummary";
import QuickActions from "./QuickActions";

interface DashboardProps {
  plan: WorkoutPlan | null;
  activeWorkout: ActiveWorkout | null;
  history: CompletedWorkout[];
  goals: Goal[];
  // null for signed-out (local) mode and for cloud users who haven't set
  // one — weeklyTrainingTarget lives on profiles, an account-only concept.
  weeklyTarget: number | null;
  onStartWorkout: (dayIndex: number) => void;
  onResumeWorkout: () => void;
  onGoToPlan: () => void;
  onGoToHistory: () => void;
  onGoToInsights: () => void;
  onGoToSettings: () => void;
  onViewHistoryEntry: (id: string) => void;
  onSelectExercise: (name: string) => void;
}

const READINESS_FIELD_LABELS: { key: "energy" | "soreness"; label: string }[] = [
  { key: "energy", label: "energy" },
  { key: "soreness", label: "soreness" },
];

const TODAY_FORMAT: Intl.DateTimeFormatOptions = {
  weekday: "long",
  month: "long",
  day: "numeric",
};

export default function Dashboard({
  plan,
  activeWorkout,
  history,
  goals,
  weeklyTarget,
  onStartWorkout,
  onResumeWorkout,
  onGoToPlan,
  onGoToHistory,
  onGoToInsights,
  onGoToSettings,
  onViewHistoryEntry,
  onSelectExercise,
}: DashboardProps) {
  const stats = useMemo(() => getQuickStats(history), [history]);
  const weekly = useMemo(() => getWeeklyProgress(history), [history]);
  const recentPRs = useMemo(() => getRecentPRs(history, 3), [history]);
  const recentActivity = useMemo(() => history.slice(0, 5), [history]);
  const todayInfo = useMemo(() => getTodayWorkout(plan, activeWorkout, history), [plan, activeWorkout, history]);
  const recommendation = useMemo(() => getNextRecommendation(history, plan), [history, plan]);

  const today = new Date().toLocaleDateString(undefined, TODAY_FORMAT);

  const latestReadiness = history[0]?.readiness ?? null;
  const readinessSummary = latestReadiness
    ? READINESS_FIELD_LABELS.map(({ key, label }) => (latestReadiness[key] !== null ? `${label} ${latestReadiness[key]}/10` : null))
        .filter((part): part is string => part !== null)
        .join(", ")
    : null;

  return (
    <div className="motion-safe:animate-step-in flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Welcome back</h2>
          <p className="mt-1 text-sm text-slate-500">{today}</p>
          {readinessSummary && (
            <p className="mt-0.5 text-xs text-slate-400">Last check-in — {readinessSummary}</p>
          )}
        </div>
        <QuickActions
          onViewPlan={onGoToPlan}
          onViewHistory={onGoToHistory}
          onGoToInsights={onGoToInsights}
          onGoToSettings={onGoToSettings}
        />
      </div>

      <TodayWorkout info={todayInfo} onStart={onStartWorkout} onResume={onResumeWorkout} onGoToPlan={onGoToPlan} />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatsCard icon="🔥" label="Current streak" value={`${stats.streakDays} day${stats.streakDays === 1 ? "" : "s"}`} />
        <StatsCard icon="💪" label="Workouts done" value={String(stats.workoutsCompleted)} />
        <StatsCard icon="🏋" label="PRs earned" value={String(stats.totalPRs)} />
        <StatsCard icon="⏱" label="Training time" value={`${stats.totalTrainingMinutes} min`} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <RecentPRs prs={recentPRs} onSelectExercise={onSelectExercise} />
        <WeeklyProgress progress={weekly} weeklyTarget={weeklyTarget} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <GoalsSummary goals={goals} history={history} onGoToInsights={onGoToInsights} />
        <RecommendationCard recommendation={recommendation} />
      </div>

      <RecentActivity workouts={recentActivity} onView={onViewHistoryEntry} />
    </div>
  );
}
