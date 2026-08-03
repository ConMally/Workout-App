import { useMemo } from "react";
import type { CompletedWorkout, WeightUnit } from "@/types/workout-log";
import { getExerciseStats } from "@/lib/insights";
import { getProgressionSuggestion } from "@/lib/progression";
import { findLastPerformance, formatDate } from "@/lib/workout-log";
import MiniLineChart from "@/components/insights/MiniLineChart";

const TYPE_LABEL: Record<string, string> = {
  heaviest_weight: "Heaviest weight",
  most_reps_at_weight: "Most reps at this weight",
  estimated_one_rep_max: "Estimated one-rep max",
};

interface ExerciseProgressDetailProps {
  exerciseName: string;
  history: CompletedWorkout[];
  weightUnit: WeightUnit;
  onBack: () => void;
}

export default function ExerciseProgressDetail({ exerciseName, history, weightUnit, onBack }: ExerciseProgressDetailProps) {
  const stats = useMemo(() => getExerciseStats(history, exerciseName), [history, exerciseName]);
  const lastPerformance = useMemo(() => findLastPerformance(history, exerciseName), [history, exerciseName]);
  const suggestion = lastPerformance ? getProgressionSuggestion(lastPerformance) : null;

  const chartPoints = stats.history
    .filter((p) => p.estimatedOneRepMax !== null)
    .map((p) => ({ label: formatDate(p.completedAt), value: p.estimatedOneRepMax as number }));

  const weightChartPoints = stats.history
    .filter((p) => p.weight !== null)
    .map((p) => ({ label: formatDate(p.completedAt), value: p.weight as number }));

  return (
    <div className="motion-safe:animate-step-in flex flex-col gap-6">
      <button
        type="button"
        onClick={onBack}
        className="flex w-fit items-center gap-1.5 text-sm font-medium text-slate-600 hover:text-teal-700"
      >
        <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M12 15l-5-5 5-5" />
        </svg>
        Back
      </button>

      <div>
        <h2 className="text-2xl font-bold text-slate-900">{exerciseName}</h2>
        <p className="mt-1 text-sm text-slate-500">
          {stats.workoutCount} workout{stats.workoutCount === 1 ? "" : "s"} logged · {stats.totalCompletedSets} completed set
          {stats.totalCompletedSets === 1 ? "" : "s"}
        </p>
      </div>

      {stats.workoutCount === 0 ? (
        <p className="text-sm text-slate-400">No logged history for this exercise yet.</p>
      ) : (
        <>
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              <Stat label="First performance" value={stats.firstPerformance ? formatDate(stats.firstPerformance.completedAt) : "—"} />
              <Stat label="Most recent" value={stats.latestPerformance ? formatDate(stats.latestPerformance.completedAt) : "—"} />
              <Stat label="Heaviest weight" value={stats.heaviestWeight > 0 ? `${stats.heaviestWeight} ${weightUnit}` : "—"} />
              <Stat label="Best reps" value={stats.bestReps ? `${stats.bestReps.reps} @ ${stats.bestReps.weight} ${weightUnit}` : "—"} />
              <Stat label="Best est. 1RM" value={stats.bestEstimatedOneRepMax > 0 ? `~${stats.bestEstimatedOneRepMax} ${weightUnit}` : "—"} />
              <Stat label="Personal records" value={String(stats.prHistory.length)} />
            </div>

            <div className="mt-5">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Estimated 1RM over time</p>
              <div className="mt-2">
                <MiniLineChart points={chartPoints} ariaLabel={`Estimated one-rep max for ${exerciseName} over time`} />
              </div>
            </div>

            <div className="mt-5">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Weight progress</p>
              <div className="mt-2">
                <MiniLineChart
                  points={weightChartPoints}
                  unit={` ${weightUnit}`}
                  ariaLabel={`Heaviest logged weight for ${exerciseName} over time`}
                />
              </div>
            </div>
          </div>

          {suggestion && (
            <div className="rounded-2xl border border-teal-200 bg-teal-50 p-5 sm:p-6">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-teal-800">Progression recommendation</h3>
              <p className="mt-2 text-sm text-teal-900">{suggestion.message}</p>
            </div>
          )}

          {stats.prHistory.length > 0 && (
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">PR history</h3>
              <ul className="mt-3 flex flex-col gap-2">
                {stats.prHistory.map((pr, i) => (
                  <li key={i} className="flex items-center justify-between gap-3 text-sm">
                    <span className="text-slate-600">{TYPE_LABEL[pr.type] ?? pr.type}</span>
                    <span className="text-right font-semibold text-slate-900">
                      {pr.detail}
                      <span className="ml-2 font-normal text-slate-400">{formatDate(pr.completedAt)}</span>
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
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
