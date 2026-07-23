import type { CompletedWorkout, PersonalRecordEvent, WeightUnit } from "@/types/workout-log";
import { countCompletedExercises, countCompletedSets, formatDate, formatDuration } from "@/lib/workout-log";
import WorkoutHistoryDetail from "./WorkoutHistoryDetail";
import PRCelebration from "../PRCelebration";

interface WorkoutHistoryProps {
  history: CompletedWorkout[];
  recentPRs: PersonalRecordEvent[];
  weightUnit: WeightUnit;
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  onDismissPRs: () => void;
  onSelectExercise: (name: string) => void;
}

export default function WorkoutHistory({
  history,
  recentPRs,
  weightUnit,
  selectedId,
  onSelect,
  onDismissPRs,
  onSelectExercise,
}: WorkoutHistoryProps) {
  const selected = history.find((workout) => workout.id === selectedId) ?? null;
  if (selected) {
    return (
      <WorkoutHistoryDetail
        workout={selected}
        weightUnit={weightUnit}
        onBack={() => onSelect(null)}
        onSelectExercise={onSelectExercise}
      />
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <PRCelebration events={recentPRs} onDismiss={onDismissPRs} />

      <div>
        <h2 className="text-2xl font-bold text-slate-900">Workout history</h2>
        <p className="mt-1 text-sm text-slate-500">Review what you&apos;ve completed.</p>
      </div>

      {history.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-slate-300 bg-slate-50/60 px-6 py-10 text-center">
          <span
            className="flex h-10 w-10 items-center justify-center rounded-full bg-teal-50 text-teal-600"
            aria-hidden="true"
          >
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 8v4l2.5 2.5" />
              <circle cx="12" cy="12" r="9" />
            </svg>
          </span>
          <p className="text-sm font-medium text-slate-600">No workouts completed yet</p>
          <p className="max-w-xs text-sm text-slate-400">
            Start a workout from your plan and finish it to see it here.
          </p>
        </div>
      ) : (
        <ul className="flex flex-col gap-3">
          {history.map((workout) => (
            <li key={workout.id}>
              <button
                type="button"
                onClick={() => onSelect(workout.id)}
                className="w-full rounded-2xl border border-slate-200 bg-white p-5 text-left shadow-sm transition hover:border-teal-300 hover:shadow-md"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="text-xs font-medium text-slate-400">{formatDate(workout.completedAt)}</p>
                    <p className="mt-0.5 text-lg font-bold text-slate-900">{workout.dayTitle}</p>
                    <p className="text-sm text-slate-500">{workout.dayFocus}</p>
                  </div>
                  <span className="flex-shrink-0 rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                    {formatDuration(workout.durationSeconds)}
                  </span>
                </div>
                <div className="mt-3 flex gap-4 text-xs text-slate-500">
                  <span>{countCompletedExercises(workout.exercises)} exercises completed</span>
                  <span>{countCompletedSets(workout.exercises)} sets completed</span>
                </div>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
