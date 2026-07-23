import type { ExerciseStats } from "@/types/insights";
import type { WeightUnit } from "@/types/workout-log";
import { getPercentChange } from "@/lib/insights";
import { formatDate } from "@/lib/workout-log";
import MiniLineChart from "./MiniLineChart";

interface StrengthProgressProps {
  exerciseNames: string[];
  selectedExercise: string | null;
  stats: ExerciseStats | null;
  weightUnit: WeightUnit;
  onSelectExercise: (name: string) => void;
  onViewFullHistory: (name: string) => void;
}

export default function StrengthProgress({
  exerciseNames,
  selectedExercise,
  stats,
  weightUnit,
  onSelectExercise,
  onViewFullHistory,
}: StrengthProgressProps) {
  if (exerciseNames.length === 0) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Strength progress</h3>
        <p className="mt-2 text-sm text-slate-400">
          Log the same exercise across a couple of workouts to see strength trends here.
        </p>
      </div>
    );
  }

  const first = stats?.firstPerformance;
  const latest = stats?.latestPerformance;
  const percentChange =
    first?.estimatedOneRepMax && latest?.estimatedOneRepMax ? getPercentChange(first.estimatedOneRepMax, latest.estimatedOneRepMax) : null;

  const chartPoints =
    stats?.history
      .filter((p) => p.estimatedOneRepMax !== null)
      .map((p) => ({ label: formatDate(p.completedAt), value: p.estimatedOneRepMax as number })) ?? [];

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Strength progress</h3>
        <select
          value={selectedExercise ?? ""}
          onChange={(e) => onSelectExercise(e.target.value)}
          className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-sm text-slate-800 focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/30"
        >
          {exerciseNames.map((name) => (
            <option key={name} value={name}>
              {name}
            </option>
          ))}
        </select>
      </div>

      {stats && (
        <>
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
            <Stat label="First est. 1RM" value={first?.estimatedOneRepMax ? `~${first.estimatedOneRepMax}` : "—"} />
            <Stat label="Current est. 1RM" value={latest?.estimatedOneRepMax ? `~${latest.estimatedOneRepMax}` : "—"} />
            <Stat label="Change" value={percentChange === null ? "—" : `${percentChange >= 0 ? "+" : ""}${percentChange}%`} />
            <Stat label="Heaviest weight" value={stats.heaviestWeight > 0 ? `${stats.heaviestWeight} ${weightUnit}` : "—"} />
            <Stat label="Best reps" value={stats.bestReps ? `${stats.bestReps.reps} @ ${stats.bestReps.weight}` : "—"} />
            <Stat label="Latest PR" value={stats.prHistory[0] ? formatDate(stats.prHistory[0].completedAt) : "None yet"} />
          </div>

          <div className="mt-4">
            <MiniLineChart points={chartPoints} ariaLabel={`Estimated one-rep max for ${stats.exerciseName} over time`} />
          </div>

          <button
            type="button"
            onClick={() => onViewFullHistory(stats.exerciseName)}
            className="mt-4 text-sm font-medium text-teal-700 hover:underline"
          >
            View full exercise history →
          </button>
        </>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-slate-50 px-3 py-2">
      <p className="text-xs font-medium text-slate-400">{label}</p>
      <p className="mt-0.5 text-sm font-bold text-slate-900">{value}</p>
    </div>
  );
}
