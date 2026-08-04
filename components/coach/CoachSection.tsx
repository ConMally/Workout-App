"use client";

import { useEffect, useState } from "react";
import type { WorkoutPlan } from "@/types/workout";
import type { CompletedWorkout, WeightUnit } from "@/types/workout-log";
import type { Goal } from "@/types/goals";
import type { CoachAnalytics } from "@/types/analytics";
import { useTrackEvent } from "@/lib/analytics-events/useTrackEvent";
import RecommendationsList from "./RecommendationsList";
import RecoveryCard from "./RecoveryCard";
import WeeklySummaryCard from "./WeeklySummaryCard";
import NextTargetsCard from "./NextTargetsCard";
import WeeklyReportCard from "./WeeklyReportCard";
import GoalProgressChart from "@/components/charts/GoalProgressChart";
import ConsistencyCalendar from "@/components/charts/ConsistencyCalendar";

interface CoachSectionProps {
  history: CompletedWorkout[];
  plan: WorkoutPlan | null;
  goals: Goal[];
  weeklyTarget: number | null;
  weightUnit: WeightUnit;
  analytics: CoachAnalytics;
}

// Every card below only ever receives already-computed results as props —
// Dashboard.tsx is the single place that calls computeCoachAnalytics,
// mirroring how InsightsPage.tsx already treats lib/insights.ts (see
// PART 9/10: analytics stays out of components). Streak/recent-PR counts
// are shown once, in Dashboard.tsx's KeyMetrics — not repeated here.
export default function CoachSection({
  history,
  plan,
  goals,
  weeklyTarget,
  weightUnit,
  analytics,
}: CoachSectionProps) {
  // Dismissal is session-scoped (cleared on reload), not persisted — every
  // recommendation is a deterministic function of history, so a dismissed
  // one only reappears if its underlying condition still holds after the
  // next real data change, which is what "regenerated automatically" means
  // here rather than a second database table just for dismissal state.
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());
  const trackEvent = useTrackEvent();

  // CoachSection is code-split and only mounts once the user actually
  // reaches this part of the Dashboard (see components/dashboard/Dashboard.tsx's
  // dynamic() import) — its mount is a reasonable proxy for "opened the
  // coach recommendations," fired once per mount rather than per card.
  useEffect(() => {
    if (analytics.recommendations.length > 0) {
      trackEvent("coach_recommendation_opened", { recommendationCount: analytics.recommendations.length });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const effectiveWeeklyTarget = weeklyTarget ?? plan?.summary.daysPerWeek ?? 3;

  function handleDismiss(id: string) {
    setDismissedIds((prev) => new Set(prev).add(id));
  }

  if (history.length === 0) {
    return (
      <div className="rounded-[var(--card-radius)] border border-dashed border-border bg-surface-muted px-6 py-10 text-center">
        <p className="text-sm font-medium text-text-secondary">Your coach is warming up</p>
        <p className="mx-auto mt-1 max-w-xs text-sm text-text-muted">
          Complete a workout to start getting personalized recommendations, progression targets, and a recovery score.
        </p>
      </div>
    );
  }

  return (
    <section aria-label="Coach" className="flex flex-col gap-4">
      <h2 className="text-section-heading text-text-primary">Coach</h2>

      <RecommendationsList
        recommendations={analytics.recommendations}
        dismissedIds={dismissedIds}
        onDismiss={handleDismiss}
      />

      <div className="grid gap-4 lg:grid-cols-2">
        <WeeklySummaryCard
          consistency={analytics.consistency}
          volume={analytics.volume}
          trends={analytics.trends}
          weeklyTarget={effectiveWeeklyTarget}
          weightUnit={weightUnit}
        />
        <RecoveryCard recovery={analytics.recovery} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <NextTargetsCard targets={analytics.overloadTargets} weightUnit={weightUnit} />
        <div className="rounded-[var(--card-radius)] border border-border bg-surface p-5 shadow-sm sm:p-6">
          <h3 className="text-label">Goal progress</h3>
          <div className="mt-3">
            <GoalProgressChart goals={goals} history={history} />
          </div>
        </div>
      </div>

      <div className="rounded-[var(--card-radius)] border border-border bg-surface p-5 shadow-sm sm:p-6">
        <h3 className="text-label">Consistency</h3>
        <div className="mt-3 overflow-x-auto">
          <ConsistencyCalendar history={history} />
        </div>
      </div>

      <WeeklyReportCard report={analytics.weeklyReport} weightUnit={weightUnit} />
    </section>
  );
}
