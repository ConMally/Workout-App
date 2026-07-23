import type { CompletedWorkout } from "@/types/workout-log";
import { countCompletedExercises, formatDate, formatDuration } from "@/lib/workout-log";

interface RecentActivityProps {
  workouts: CompletedWorkout[];
  onView: (id: string) => void;
}

export default function RecentActivity({ workouts, onView }: RecentActivityProps) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Recent activity</h3>

      {workouts.length === 0 ? (
        <p className="mt-3 text-sm text-slate-400">Finish a workout to see it show up here.</p>
      ) : (
        <ul className="mt-3 divide-y divide-slate-100">
          {workouts.map((workout) => (
            <li key={workout.id} className="flex items-center justify-between gap-3 py-3 first:pt-0">
              <div className="min-w-0">
                <p className="text-xs font-medium text-slate-400">{formatDate(workout.completedAt)}</p>
                <p className="truncate text-sm font-semibold text-slate-900">{workout.dayTitle}</p>
                <p className="text-xs text-slate-500">
                  {formatDuration(workout.durationSeconds)} · {countCompletedExercises(workout.exercises)} exercises
                </p>
              </div>
              <button
                type="button"
                onClick={() => onView(workout.id)}
                className="flex-shrink-0 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 transition hover:border-teal-300 hover:bg-teal-50 hover:text-teal-700"
              >
                View
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
