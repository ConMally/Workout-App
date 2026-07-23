import type { WeeklyProgress as WeeklyProgressStats } from "@/types/dashboard";

interface WeeklyProgressProps {
  progress: WeeklyProgressStats;
  weeklyTarget: number | null;
}

export default function WeeklyProgress({ progress, weeklyTarget }: WeeklyProgressProps) {
  const dayProgressPercent = Math.min(100, Math.round((progress.daysWorkedOut / 7) * 100));

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">This week</h3>

      <div className="mt-4">
        <div className="flex items-baseline justify-between">
          <span className="text-sm font-medium text-slate-600">Days worked out</span>
          <span className="text-sm font-bold text-slate-900">{progress.daysWorkedOut} / 7</span>
        </div>
        <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-slate-100">
          <div
            className="h-full rounded-full bg-teal-500 motion-safe:transition-all motion-safe:duration-500"
            style={{ width: `${dayProgressPercent}%` }}
          />
        </div>
      </div>

      <div className="mt-5 grid grid-cols-3 gap-3 text-center">
        <div>
          <p className="text-lg font-bold text-slate-900">
            {progress.workoutsThisWeek}
            {weeklyTarget !== null && <span className="text-sm font-normal text-slate-400"> / {weeklyTarget}</span>}
          </p>
          <p className="text-xs text-slate-500">Workouts</p>
        </div>
        <div>
          <p className="text-lg font-bold text-slate-900">{progress.setsThisWeek}</p>
          <p className="text-xs text-slate-500">Sets</p>
        </div>
        <div>
          <p className="text-lg font-bold text-slate-900">{progress.trainingMinutesThisWeek}</p>
          <p className="text-xs text-slate-500">Minutes</p>
        </div>
      </div>
    </div>
  );
}
