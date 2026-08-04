import type { WeeklyProgress as WeeklyProgressStats } from "@/types/dashboard";
import type { WeightUnit } from "@/types/workout-log";
import Card from "@/components/ui/Card";

interface WeeklyProgressProps {
  progress: WeeklyProgressStats;
  weeklyTarget: number | null;
  streakDays: number;
  // Both already computed by lib/analytics/index.ts#computeCoachAnalytics
  // (analytics.volume.weekly's latest entry and
  // analytics.weeklyReport.volumeChangePercent respectively) — never
  // recalculated here. volumeChangePercent is null when there isn't a
  // meaningful previous week to compare against (see
  // lib/insights.ts#getPercentChange), in which case the trend is simply
  // omitted rather than shown as 0%.
  volumeThisWeek: number | null;
  volumeChangePercent: number | null;
  weightUnit: WeightUnit;
}

// PART 3: workouts vs. target, a progress bar, current streak, weekly
// volume, and the week-over-week comparison — all in one compact card.
export default function WeeklyProgress({
  progress,
  weeklyTarget,
  streakDays,
  volumeThisWeek,
  volumeChangePercent,
  weightUnit,
}: WeeklyProgressProps) {
  const target = weeklyTarget ?? 7;
  const workoutProgressPercent = Math.min(100, Math.round((progress.workoutsThisWeek / target) * 100));

  return (
    <Card>
      <h3 className="text-label">This week</h3>

      <div className="mt-3">
        <div className="flex items-baseline justify-between">
          <span className="text-sm font-medium text-text-secondary">Workouts</span>
          <span className="text-sm font-bold text-text-primary">
            {progress.workoutsThisWeek} / {target}
          </span>
        </div>
        <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-surface-muted">
          <div
            className="h-full rounded-full bg-accent motion-safe:transition-all motion-safe:duration-500"
            style={{ width: `${workoutProgressPercent}%` }}
          />
        </div>
      </div>

      <div className="mt-5 grid grid-cols-3 gap-3 text-center">
        <div>
          <p className="text-lg font-bold text-text-primary">
            🔥 {streakDays}
          </p>
          <p className="text-xs text-text-secondary">Day streak</p>
        </div>
        <div>
          <p className="text-lg font-bold text-text-primary">{progress.setsThisWeek}</p>
          <p className="text-xs text-text-secondary">Sets</p>
        </div>
        <div>
          <p className="text-lg font-bold text-text-primary">
            {volumeThisWeek !== null && volumeThisWeek > 0 ? volumeThisWeek.toLocaleString() : progress.trainingMinutesThisWeek}
          </p>
          <p className="text-xs text-text-secondary">
            {volumeThisWeek !== null && volumeThisWeek > 0 ? `${weightUnit} volume` : "Minutes"}
          </p>
        </div>
      </div>

      {volumeChangePercent !== null && (
        <p className="mt-3 text-xs font-medium text-text-muted">
          {volumeChangePercent > 0 ? "▲" : volumeChangePercent < 0 ? "▼" : "—"} {Math.abs(volumeChangePercent)}%
          volume vs. last week
        </p>
      )}
    </Card>
  );
}
