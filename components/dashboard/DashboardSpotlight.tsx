import type { CoachAnalytics } from "@/types/analytics";
import type { WeightUnit } from "@/types/workout-log";
import { RECOVERY_STATUS_META } from "@/components/coach/RecoveryCard";

interface DashboardSpotlightProps {
  analytics: CoachAnalytics;
  weightUnit: WeightUnit;
  fallbackInsight: string;
  onGoToInsights: () => void;
}

// Phase 7 PART 5: "Recovery status," "Monthly consistency," "Next
// progression target," and "Coach insight of the day" — every value here
// is read straight off the CoachAnalytics object Dashboard.tsx already
// computes once (lib/analytics#computeCoachAnalytics) and threads down to
// both this component and CoachSection; nothing is recalculated. The full,
// detailed versions of recovery/targets/consistency still live in the
// Coach section further down the page — this is a compact "at a glance"
// summary, not a replacement for them.
export default function DashboardSpotlight({ analytics, weightUnit, fallbackInsight, onGoToInsights }: DashboardSpotlightProps) {
  const { recovery, consistency, overloadTargets, recommendations } = analytics;
  const recoveryMeta = RECOVERY_STATUS_META[recovery.status];
  const topTarget = overloadTargets[0] ?? null;
  const topRecommendation = recommendations[0] ?? null;

  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      <SpotlightTile label="Recovery">
        <div className="flex items-center gap-1.5">
          <span aria-hidden="true">{recoveryMeta.icon}</span>
          <span className="text-sm font-bold text-slate-900 dark:text-slate-100">{recoveryMeta.label}</span>
        </div>
      </SpotlightTile>

      <SpotlightTile label="This month">
        <p className="text-sm font-bold text-slate-900 dark:text-slate-100">
          {consistency.workoutsThisMonth} workout{consistency.workoutsThisMonth === 1 ? "" : "s"}
        </p>
        {consistency.adherencePercent !== null && (
          <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{consistency.adherencePercent}% of plan</p>
        )}
      </SpotlightTile>

      <SpotlightTile label="Next target">
        {topTarget ? (
          <>
            <p className="truncate text-sm font-bold text-slate-900 dark:text-slate-100">{topTarget.exerciseName}</p>
            <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
              {topTarget.nextWeight !== null ? `${topTarget.nextWeight} ${weightUnit} × ${topTarget.nextReps}` : topTarget.reasoning}
            </p>
          </>
        ) : (
          <p className="text-xs text-slate-400 dark:text-slate-500">Log a weight to unlock targets.</p>
        )}
      </SpotlightTile>

      <button type="button" onClick={onGoToInsights} className="text-left">
        <SpotlightTile label="Coach insight" interactive>
          <p className="line-clamp-2 text-sm font-medium text-slate-900 dark:text-slate-100">
            {topRecommendation ? topRecommendation.message : fallbackInsight}
          </p>
        </SpotlightTile>
      </button>
    </div>
  );
}

function SpotlightTile({ label, interactive, children }: { label: string; interactive?: boolean; children: React.ReactNode }) {
  return (
    <div
      className={`h-full rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition dark:border-slate-800 dark:bg-slate-900 ${
        interactive ? "hover:-translate-y-0.5 hover:shadow-md" : ""
      }`}
    >
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">{label}</p>
      <div className="mt-1.5">{children}</div>
    </div>
  );
}
