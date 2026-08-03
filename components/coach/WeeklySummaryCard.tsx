import type { ConsistencyAnalytics, VolumeAnalytics, WorkoutTrends } from "@/types/analytics";
import type { WeightUnit } from "@/types/workout-log";
import BarChart from "@/components/charts/BarChart";

interface WeeklySummaryCardProps {
  consistency: ConsistencyAnalytics;
  volume: VolumeAnalytics;
  trends: WorkoutTrends;
  weeklyTarget: number;
  weightUnit: WeightUnit;
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-slate-50 px-3 py-2">
      <p className="text-xs font-medium text-slate-400">{label}</p>
      <p className="mt-0.5 text-sm font-bold text-slate-900">{value}</p>
    </div>
  );
}

export default function WeeklySummaryCard({ consistency, volume, trends, weeklyTarget, weightUnit }: WeeklySummaryCardProps) {
  const thisWeek = volume.weekly[volume.weekly.length - 1];

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Weekly summary</h3>

      <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Workouts" value={`${consistency.workoutsThisWeek} / ${weeklyTarget}`} />
        <Stat label="Sets this week" value={String(thisWeek?.sets ?? 0)} />
        <Stat
          label="Volume this week"
          value={thisWeek?.volume ? `${thisWeek.volume.toLocaleString()} ${weightUnit}` : "—"}
        />
        <Stat
          label="Avg duration"
          value={trends.averageDurationMinutes !== null ? `${trends.averageDurationMinutes} min` : "—"}
        />
      </div>

      <div className="mt-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Training volume (8 weeks)</p>
        <div className="mt-2">
          <BarChart
            bars={volume.weekly.map((w) => ({ label: w.label, value: w.volume }))}
            unit={` ${weightUnit}`}
            ariaLabel="Total training volume per week over the last 8 weeks"
          />
        </div>
      </div>
    </div>
  );
}
