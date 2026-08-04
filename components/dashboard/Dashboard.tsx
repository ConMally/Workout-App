"use client";

import { useMemo } from "react";
import dynamic from "next/dynamic";
import type { WorkoutPlan } from "@/types/workout";
import type { ActiveWorkout, CompletedWorkout, WeightUnit } from "@/types/workout-log";
import type { Goal } from "@/types/goals";
import type { SubstitutionHistory } from "@/lib/storage";
import { getQuickStats, getRecentPRs, getTodayWorkout, getWeeklyProgress } from "@/lib/dashboard";
import { computeCoachAnalytics } from "@/lib/analytics";
import DashboardHeader from "./DashboardHeader";
import TodayWorkout from "./TodayWorkout";
import KeyMetrics from "./KeyMetrics";
import WeeklyProgress from "./WeeklyProgress";
import CoachInsight from "./CoachInsight";
import GoalsSummary from "./GoalsSummary";
import RecentActivity from "./RecentActivity";
import CoachSkeleton from "@/components/skeletons/CoachSkeleton";

// PART 9 (Phase 10B): the Coach section (recommendations, charts,
// consistency calendar) is the heaviest part of the dashboard and isn't
// needed until the user scrolls to it — split into its own chunk instead of
// the initial dashboard bundle.
const CoachSection = dynamic(() => import("@/components/coach/CoachSection"), { loading: () => <CoachSkeleton /> });

interface DashboardProps {
  plan: WorkoutPlan | null;
  activeWorkout: ActiveWorkout | null;
  history: CompletedWorkout[];
  goals: Goal[];
  substitutionHistory: SubstitutionHistory;
  weightUnit: WeightUnit;
  // null for signed-out (local) mode and for cloud users who haven't set
  // one — weeklyTrainingTarget lives on profiles, an account-only concept.
  weeklyTarget: number | null;
  // Never the user's email — see components/dashboard/DashboardHeader.tsx.
  displayName: string | null;
  onStartWorkout: (dayIndex: number) => void;
  onResumeWorkout: () => void;
  onGoToPlan: () => void;
  onGoToInsights: () => void;
  onGoToTemplates: () => void;
  onViewHistoryEntry: (id: string) => void;
  onSelectExercise: (name: string) => void;
}

// Phase 10B: rebuilt around one clear hierarchy (PART 8) — greeting, one
// dominant hero action, a compact weekly-progress/key-metrics glance, one
// focused coach insight, goals, recent activity, then the full Coach detail
// lower on the page. Every card below reads from the same three
// computations (getQuickStats/getWeeklyProgress/computeCoachAnalytics),
// each still called exactly once per render — nothing here recalculates
// what a child component could instead receive as a prop.
export default function Dashboard({
  plan,
  activeWorkout,
  history,
  goals,
  substitutionHistory,
  weightUnit,
  weeklyTarget,
  displayName,
  onStartWorkout,
  onResumeWorkout,
  onGoToPlan,
  onGoToInsights,
  onGoToTemplates,
  onViewHistoryEntry,
  onSelectExercise,
}: DashboardProps) {
  const stats = useMemo(() => getQuickStats(history), [history]);
  const weekly = useMemo(() => getWeeklyProgress(history), [history]);
  const recentPRs = useMemo(() => getRecentPRs(history, 3), [history]);
  const recentActivity = useMemo(() => history.slice(0, 5), [history]);
  const todayInfo = useMemo(() => getTodayWorkout(plan, activeWorkout, history), [plan, activeWorkout, history]);

  // The single place that calls computeCoachAnalytics (Phase 7) — every
  // dashboard card below that needs coach/analytics data (KeyMetrics'
  // recovery tile, WeeklyProgress' volume trend, CoachInsight, CoachSection)
  // receives this same object as a prop rather than each computing its own
  // copy. Every sub-calculation already degrades gracefully for a brand-new
  // account with no history (see their own hasEnoughData-style flags), so
  // this is safe to compute unconditionally.
  const analytics = useMemo(
    () => computeCoachAnalytics({ history, plan, goals, substitutionHistory, weeklyTarget }),
    [history, plan, goals, substitutionHistory, weeklyTarget]
  );

  const thisWeekVolume = analytics.volume.weekly[analytics.volume.weekly.length - 1]?.volume ?? null;
  const topRecommendation = analytics.recommendations[0] ?? null;

  return (
    <div className="motion-safe:animate-step-in flex flex-col gap-6">
      <DashboardHeader
        displayName={displayName}
        streakDays={stats.streakDays}
        workoutsThisWeek={weekly.workoutsThisWeek}
        weeklyTarget={weeklyTarget}
      />

      <TodayWorkout
        info={todayInfo}
        activeWorkout={activeWorkout}
        onStart={onStartWorkout}
        onResume={onResumeWorkout}
        onGoToPlan={onGoToPlan}
        onGoToTemplates={onGoToTemplates}
      />

      <KeyMetrics
        streakDays={stats.streakDays}
        workoutsThisWeek={weekly.workoutsThisWeek}
        recentPRCount={recentPRs.length}
        recovery={analytics.recovery}
      />

      <WeeklyProgress
        progress={weekly}
        weeklyTarget={weeklyTarget}
        streakDays={stats.streakDays}
        volumeThisWeek={thisWeekVolume}
        volumeChangePercent={analytics.weeklyReport.volumeChangePercent}
        weightUnit={weightUnit}
      />

      <CoachInsight topRecommendation={topRecommendation} hasHistory={history.length > 0} onGoToInsights={onGoToInsights} />

      <GoalsSummary goals={goals} history={history} onGoToInsights={onGoToInsights} />

      <RecentActivity workouts={recentActivity} recentPRs={recentPRs} onView={onViewHistoryEntry} onSelectExercise={onSelectExercise} />

      <div className="border-t border-border pt-6">
        <CoachSection
          history={history}
          plan={plan}
          goals={goals}
          weeklyTarget={weeklyTarget}
          weightUnit={weightUnit}
          analytics={analytics}
        />
      </div>
    </div>
  );
}
