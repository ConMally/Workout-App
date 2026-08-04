import type { VolumeTrendResult } from "@/types/insights";
import type { WeightUnit } from "@/types/workout-log";

interface VolumeTrendProps {
  volumeTrend: VolumeTrendResult;
  weightUnit: WeightUnit;
}

export default function VolumeTrend({ volumeTrend, weightUnit }: VolumeTrendProps) {
  const { currentWeekVolume, previousWeekVolume, percentChange, rollingFourWeekAverage, weeklyTotals, hasEnoughData } = volumeTrend;

  if (!hasEnoughData) {
    return (
      <div className="rounded-[var(--card-radius)] border border-border bg-surface p-5 shadow-sm sm:p-6">
        <h3 className="text-label">Weekly training volume</h3>
        <p className="mt-2 text-sm text-text-muted">
          Log weight and reps for a few sets to start tracking your logged weighted volume here.
        </p>
      </div>
    );
  }

  const maxVolume = Math.max(...weeklyTotals.map((w) => w.volume), 1);

  return (
    <div className="rounded-[var(--card-radius)] border border-border bg-surface p-5 shadow-sm sm:p-6">
      <h3 className="text-label">Weekly training volume</h3>
      <p className="mt-1 text-xs text-text-muted">
        &ldquo;Logged weighted volume&rdquo; = weight × reps across completed sets with a logged weight. Bodyweight
        and unlogged sets aren&apos;t counted, since no weight value is invented for them.
      </p>

      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
        <Stat label="This week" value={`${currentWeekVolume.toLocaleString()} ${weightUnit}`} />
        <Stat label="Last week" value={`${previousWeekVolume.toLocaleString()} ${weightUnit}`} />
        <Stat label="Change" value={percentChange === null ? "N/A" : `${percentChange >= 0 ? "+" : ""}${percentChange}%`} />
        <Stat label="4-week average" value={`${rollingFourWeekAverage.toLocaleString()} ${weightUnit}`} />
      </div>

      <div className="mt-5 flex items-end gap-3" role="img" aria-label="Weekly volume for the last 4 weeks, oldest to newest">
        {weeklyTotals.map((week, i) => (
          <div key={week.weekStart} className="flex flex-1 flex-col items-center gap-1.5">
            <div className="flex h-24 w-full items-end rounded-[var(--control-radius)] bg-surface-muted">
              <div
                className="w-full rounded-[var(--control-radius)] bg-accent motion-safe:transition-all motion-safe:duration-500"
                style={{ height: `${Math.max(4, (week.volume / maxVolume) * 100)}%` }}
              />
            </div>
            <span className="text-xs text-text-muted">{i === weeklyTotals.length - 1 ? "This week" : `${weeklyTotals.length - 1 - i}w ago`}</span>
          </div>
        ))}
      </div>
      <p className="mt-2 text-xs text-text-muted">
        {weeklyTotals.map((w) => w.volume.toLocaleString()).join(" → ")} {weightUnit}
      </p>
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
