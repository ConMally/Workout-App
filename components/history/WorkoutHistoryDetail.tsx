import type { CompletedWorkout, WeightUnit } from "@/types/workout-log";
import { formatDate, formatDuration } from "@/lib/workout-log";

const READINESS_LABELS: { key: keyof NonNullable<CompletedWorkout["readiness"]>; label: string }[] = [
  { key: "difficulty", label: "Difficulty" },
  { key: "energy", label: "Energy" },
  { key: "soreness", label: "Soreness" },
  { key: "sleepQuality", label: "Sleep quality" },
  { key: "satisfaction", label: "Satisfaction" },
];

interface WorkoutHistoryDetailProps {
  workout: CompletedWorkout;
  weightUnit: WeightUnit;
  onBack: () => void;
  onSelectExercise: (name: string) => void;
}

export default function WorkoutHistoryDetail({ workout, weightUnit, onBack, onSelectExercise }: WorkoutHistoryDetailProps) {
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
        Back to history
      </button>

      <div>
        <p className="text-xs font-medium text-slate-400">{formatDate(workout.completedAt)}</p>
        <h2 className="mt-0.5 text-2xl font-bold text-slate-900">{workout.dayTitle}</h2>
        <p className="text-sm text-slate-500">{workout.dayFocus}</p>
        <p className="mt-1 text-xs text-slate-400">Duration: {formatDuration(workout.durationSeconds)}</p>
      </div>

      {workout.readiness && (
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">Check-in</h3>
          <div className="mt-2 grid grid-cols-2 gap-3 sm:grid-cols-5">
            {READINESS_LABELS.map(({ key, label }) => (
              <div key={key}>
                <p className="text-xs text-slate-400">{label}</p>
                <p className="text-sm font-semibold text-slate-800">
                  {workout.readiness![key] === null ? "—" : `${workout.readiness![key]}/10`}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="flex flex-col gap-4">
        {workout.exercises.map((exercise, i) => (
          <div key={i} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <button
                type="button"
                onClick={() => onSelectExercise(exercise.name)}
                className="text-lg font-bold text-slate-900 hover:text-teal-700 hover:underline"
              >
                {exercise.name}
              </button>
              {exercise.completed && (
                <span className="rounded-full bg-teal-50 px-2.5 py-1 text-xs font-semibold text-teal-700">
                  Completed
                </span>
              )}
            </div>
            <p className="mt-0.5 text-xs text-slate-500">
              Target: {exercise.targetSets} sets x {exercise.targetReps} reps
            </p>

            <ul className="mt-3 divide-y divide-slate-100">
              {exercise.sets.map((set) => (
                <li key={set.setNumber} className="flex items-center justify-between gap-3 py-2 text-sm">
                  <span className="text-slate-500">Set {set.setNumber}</span>
                  <span className={set.completed ? "font-semibold text-slate-800" : "text-slate-400"}>
                    {set.weight !== null && set.reps !== null
                      ? `${set.weight} ${weightUnit} x ${set.reps}`
                      : "Not logged"}
                  </span>
                </li>
              ))}
            </ul>

            {exercise.note && (
              <p className="mt-3 rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-600">{exercise.note}</p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
