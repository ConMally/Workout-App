import type { DatedPersonalRecord } from "@/types/dashboard";
import { formatDate } from "@/lib/workout-log";

const TYPE_LABEL: Record<DatedPersonalRecord["type"], string> = {
  heaviest_weight: "Heaviest weight",
  most_reps_at_weight: "Most reps at this weight",
  estimated_one_rep_max: "Estimated one-rep max",
};

interface RecentPRsProps {
  prs: DatedPersonalRecord[];
  onSelectExercise: (name: string) => void;
}

export default function RecentPRs({ prs, onSelectExercise }: RecentPRsProps) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Recent personal records</h3>

      {prs.length === 0 ? (
        <p className="mt-3 text-sm text-slate-400">
          No personal records yet — complete a few workouts to start setting them.
        </p>
      ) : (
        <ul className="mt-3 flex flex-col gap-3">
          {prs.map((pr, i) => (
            <li key={i} className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <button
                  type="button"
                  onClick={() => onSelectExercise(pr.exerciseName)}
                  className="truncate text-sm font-semibold text-slate-900 hover:text-teal-700 hover:underline"
                >
                  {pr.exerciseName}
                </button>
                <p className="text-xs text-slate-500">{TYPE_LABEL[pr.type]}</p>
              </div>
              <div className="flex-shrink-0 text-right">
                <p className="text-sm font-bold text-teal-700">{pr.detail}</p>
                <p className="text-xs text-slate-400">{formatDate(pr.completedAt)}</p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
