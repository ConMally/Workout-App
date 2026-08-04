import type { ConsistencyResult } from "@/types/insights";

interface ConsistencyCardProps {
  consistency: ConsistencyResult;
}

export default function ConsistencyCard({ consistency }: ConsistencyCardProps) {
  const {
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
  } = consistency;

  return (
    <div className="rounded-[var(--card-radius)] border border-border bg-surface p-5 shadow-sm sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <h3 className="text-label">Training consistency</h3>
        <div className="text-right">
          <p className="text-metric text-accent">{score}</p>
          <p className="text-xs text-text-muted">out of 100</p>
        </div>
      </div>

      <details className="mt-2 text-xs text-text-muted">
        <summary className="cursor-pointer select-none font-medium text-text-secondary">How this score is calculated</summary>
        <p className="mt-1.5 leading-relaxed">
          Up to 60 points for this week&apos;s workouts vs. your target of {weeklyTarget}/week, up to 20 points for
          your current streak (caps at 7 days), and up to 20 points for the last 30 days vs. your target pace.
        </p>
      </details>

      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
        <Stat label="Last 7 days" value={`${workoutsLast7Days}`} />
        <Stat label="Last 30 days" value={`${workoutsLast30Days}`} />
        <Stat label="Weekly average" value={`${weeklyAverage}`} />
        <Stat label="Current streak" value={`${currentStreak} day${currentStreak === 1 ? "" : "s"}`} />
        <Stat label="Longest streak" value={`${longestStreak} day${longestStreak === 1 ? "" : "s"}`} />
        {plannedCompletionPercent !== null && <Stat label="Plan completion" value={`${plannedCompletionPercent}%`} />}
      </div>

      {findings.length > 0 && (
        <ul className="mt-4 flex flex-col gap-1.5 text-sm text-text-secondary">
          {findings.map((finding, i) => (
            <li key={i} className="flex gap-2">
              <span className="mt-1.5 h-1 w-1 flex-shrink-0 rounded-full bg-accent" aria-hidden="true" />
              <span>{finding}</span>
            </li>
          ))}
        </ul>
      )}

      {findings.length > 0 && !hasEnoughDataForTrend && (
        <p className="mt-3 text-xs text-text-muted">
          Trend comparisons (vs. last month, missed-target streaks) appear once you have at least 2 weeks of
          history.
        </p>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[var(--control-radius)] bg-surface-muted px-3 py-2">
      <p className="text-xs font-medium text-text-muted">{label}</p>
      <p className="mt-0.5 text-sm font-bold text-text-primary">{value}</p>
    </div>
  );
}
