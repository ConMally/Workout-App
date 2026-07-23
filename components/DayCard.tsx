import type { WorkoutPlan } from "@/types/workout";
import { hasSubstitutes } from "@/lib/exercise-substitutions";

type TrainingDay = WorkoutPlan["weeklySchedule"][number];

interface DayCardProps {
  day: TrainingDay;
  onStartWorkout: () => void;
  startDisabled: boolean;
  onSwapExercise: (exerciseIndex: number) => void;
}

export default function DayCard({ day, onStartWorkout, startDisabled, onSwapExercise }: DayCardProps) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <span className="text-xs font-semibold uppercase tracking-wide text-teal-600">
            {day.day}
          </span>
          <h3 className="mt-0.5 text-xl font-bold text-slate-900">{day.title}</h3>
          <p className="mt-1 text-sm text-slate-500">{day.focus}</p>
        </div>
        <span className="flex flex-shrink-0 items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1.5 text-sm font-semibold text-slate-700">
          <svg
            viewBox="0 0 24 24"
            className="h-4 w-4"
            fill="none"
            stroke="currentColor"
            strokeWidth={1.75}
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <circle cx="12" cy="12" r="9" />
            <path d="M12 7.5V12l3 2" />
          </svg>
          ~{day.estimatedDurationMinutes} min
        </span>
      </div>

      {day.warmup.length > 0 && (
        <section className="mt-5">
          <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-teal-700">
            <span className="h-1.5 w-1.5 rounded-full bg-teal-500" aria-hidden="true" />
            Warm-up
          </div>
          <ul className="mt-2 space-y-1 text-sm text-slate-600">
            {day.warmup.map((item, i) => (
              <li key={i} className="flex justify-between gap-3">
                <span>{item.name}</span>
                <span className="flex-shrink-0 text-slate-400">{item.duration}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="mt-5">
        <h4 className="text-sm font-bold uppercase tracking-wide text-slate-800">Exercises</h4>
        <ul className="mt-2 divide-y divide-slate-100">
          {day.exercises.map((exercise, i) => (
            <li
              key={i}
              className="flex flex-col gap-2 py-3 first:pt-2 sm:flex-row sm:items-center sm:justify-between sm:gap-4"
            >
              <div className="min-w-0">
                <p className="font-bold text-slate-900">{exercise.name}</p>
                {exercise.notes && (
                  <p className="mt-0.5 text-xs text-slate-500">{exercise.notes}</p>
                )}
              </div>
              <div className="flex flex-shrink-0 flex-wrap items-center gap-1.5 text-xs">
                <span className="rounded-full bg-slate-100 px-2.5 py-1 font-medium text-slate-700">
                  {exercise.sets} sets
                </span>
                <span className="rounded-full bg-slate-100 px-2.5 py-1 font-medium text-slate-700">
                  {exercise.reps} reps
                </span>
                <span className="rounded-full bg-slate-100 px-2.5 py-1 font-medium text-slate-700">
                  {exercise.restSeconds}s rest
                </span>
                {hasSubstitutes(exercise.name) && (
                  <button
                    type="button"
                    onClick={() => onSwapExercise(i)}
                    className="rounded-full border border-slate-200 px-2.5 py-1 font-medium text-slate-500 transition hover:border-teal-300 hover:bg-teal-50 hover:text-teal-700"
                  >
                    Swap
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      </section>

      {day.cooldown.length > 0 && (
        <section className="mt-5">
          <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Cooldown
          </h4>
          <ul className="mt-2 space-y-1 text-sm text-slate-600">
            {day.cooldown.map((item, i) => (
              <li key={i} className="flex justify-between gap-3">
                <span>{item.name}</span>
                <span className="flex-shrink-0 text-slate-400">{item.duration}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className="mt-5 border-t border-slate-100 pt-4">
        <button
          type="button"
          onClick={onStartWorkout}
          disabled={startDisabled}
          className="w-full rounded-lg bg-teal-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-teal-700 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400 disabled:shadow-none"
        >
          Start Workout
        </button>
      </div>
    </div>
  );
}
