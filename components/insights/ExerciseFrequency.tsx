import type { ExerciseFrequencyResult } from "@/types/insights";
import { formatDate } from "@/lib/workout-log";

interface ExerciseFrequencyProps {
  exerciseFrequency: ExerciseFrequencyResult;
  onSelectExercise: (name: string) => void;
}

export default function ExerciseFrequency({ exerciseFrequency, onSelectExercise }: ExerciseFrequencyProps) {
  const { hasEnoughData, mostFrequent, notPerformedInLast30Days, neglectedMuscleGroups, recentSwaps } = exerciseFrequency;

  if (!hasEnoughData) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Exercise frequency</h3>
        <p className="mt-2 text-sm text-slate-400">Complete a few more workouts to see your most-trained exercises here.</p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Exercise frequency</h3>

      <div className="mt-3">
        <p className="text-xs font-semibold text-slate-600">Most frequent</p>
        <ul className="mt-1.5 flex flex-col gap-1">
          {mostFrequent.map((e) => (
            <li key={e.exerciseName}>
              <button type="button" onClick={() => onSelectExercise(e.exerciseName)} className="text-sm text-teal-700 hover:underline">
                {e.exerciseName}
              </button>
              <span className="ml-1.5 text-xs text-slate-400">
                {e.workoutCount} workout{e.workoutCount === 1 ? "" : "s"}
              </span>
            </li>
          ))}
        </ul>
      </div>

      {neglectedMuscleGroups.length > 0 && (
        <div className="mt-4">
          <p className="text-xs font-semibold text-slate-600">Not trained recently</p>
          <ul className="mt-1.5 flex flex-col gap-1 text-sm text-slate-600">
            {neglectedMuscleGroups.map((g) => (
              <li key={g.group}>
                {g.label} — {g.daysSinceTrained === null ? "not yet logged" : `${g.daysSinceTrained} days ago`}
              </li>
            ))}
          </ul>
        </div>
      )}

      {notPerformedInLast30Days.length > 0 && (
        <div className="mt-4">
          <p className="text-xs font-semibold text-slate-600">Not performed in the last 30 days</p>
          <ul className="mt-1.5 flex flex-col gap-1">
            {notPerformedInLast30Days.map((e) => (
              <li key={e.exerciseName}>
                <button type="button" onClick={() => onSelectExercise(e.exerciseName)} className="text-sm text-teal-700 hover:underline">
                  {e.exerciseName}
                </button>
                <span className="ml-1.5 text-xs text-slate-400">last on {formatDate(e.lastPerformedAt)}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {recentSwaps.length > 0 && (
        <div className="mt-4">
          <p className="text-xs font-semibold text-slate-600">Recently swapped exercises</p>
          <ul className="mt-1.5 flex flex-col gap-1 text-sm text-slate-600">
            {recentSwaps.map((s) => (
              <li key={s.slotKey}>
                {s.fromName} → {s.toName}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
