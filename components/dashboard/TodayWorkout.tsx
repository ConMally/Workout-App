import type { TodayWorkoutInfo } from "@/types/dashboard";

interface TodayWorkoutProps {
  info: TodayWorkoutInfo;
  onStart: (dayIndex: number) => void;
  onResume: () => void;
  onGoToPlan: () => void;
}

export default function TodayWorkout({ info, onStart, onResume, onGoToPlan }: TodayWorkoutProps) {
  if (info.status === "no_plan") {
    return (
      <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-slate-300 bg-slate-50/60 px-6 py-8 text-center">
        <span
          className="flex h-10 w-10 items-center justify-center rounded-full bg-teal-50 text-teal-600"
          aria-hidden="true"
        >
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round">
            <path d="M6 12h12M9 8v8M15 8v8" />
          </svg>
        </span>
        <p className="text-sm font-medium text-slate-600">No workout plan yet</p>
        <p className="max-w-xs text-sm text-slate-400">
          Generate a plan to see your next workout here.
        </p>
        <button
          type="button"
          onClick={onGoToPlan}
          className="mt-2 rounded-lg bg-teal-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-teal-700"
        >
          Generate a plan
        </button>
      </div>
    );
  }

  if (info.status === "resume") {
    return (
      <div className="rounded-2xl border border-teal-200 bg-teal-50 p-5 sm:p-6">
        <span className="text-xs font-semibold uppercase tracking-wide text-teal-700">In progress</span>
        <h3 className="mt-0.5 text-xl font-bold text-slate-900">{info.dayTitle}</h3>
        <p className="mt-1 text-sm text-slate-600">{info.dayFocus}</p>
        <button
          type="button"
          onClick={onResume}
          className="mt-4 w-full rounded-lg bg-teal-600 px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-teal-700 sm:w-auto sm:px-8"
        >
          Resume Workout
        </button>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <span className="text-xs font-semibold uppercase tracking-wide text-teal-600">Today&apos;s workout</span>
      <h3 className="mt-0.5 text-xl font-bold text-slate-900">{info.dayTitle}</h3>
      <p className="mt-1 text-sm text-slate-500">{info.dayFocus}</p>
      <div className="mt-3 flex flex-wrap gap-1.5 text-xs">
        <span className="rounded-full bg-slate-100 px-2.5 py-1 font-medium text-slate-700">
          ~{info.estimatedDurationMinutes} min
        </span>
        <span className="rounded-full bg-slate-100 px-2.5 py-1 font-medium text-slate-700">
          {info.exerciseCount} exercises
        </span>
      </div>
      <button
        type="button"
        onClick={() => onStart(info.dayIndex)}
        className="mt-4 w-full rounded-lg bg-teal-600 px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-teal-700 sm:w-auto sm:px-8"
      >
        Start Workout
      </button>
    </div>
  );
}
