import type { OverloadTarget } from "@/types/analytics";
import type { WeightUnit } from "@/types/workout-log";

interface NextTargetsCardProps {
  targets: OverloadTarget[];
  weightUnit: WeightUnit;
}

const DIRECTION_META: Record<OverloadTarget["direction"], { label: string; icon: string; className: string }> = {
  increase: { label: "Increase", icon: "↑", className: "text-teal-700" },
  hold: { label: "Hold", icon: "→", className: "text-slate-500" },
  decrease: { label: "Decrease", icon: "↓", className: "text-amber-700" },
};

export default function NextTargetsCard({ targets, weightUnit }: NextTargetsCardProps) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Next progression targets</h3>
      {targets.length === 0 ? (
        <p className="mt-2 text-sm text-slate-400">Log a weight on an exercise to get concrete next-session targets.</p>
      ) : (
        <ul className="mt-3 flex flex-col divide-y divide-slate-100">
          {targets.map((target) => {
            const meta = DIRECTION_META[target.direction];
            return (
              <li key={target.exerciseName} className="flex items-center justify-between gap-3 py-2.5 first:pt-0 last:pb-0">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-slate-800">{target.exerciseName}</p>
                  <p className="text-xs text-slate-500">{target.reasoning}</p>
                </div>
                <div className={`flex-shrink-0 text-right text-sm font-semibold ${meta.className}`}>
                  <span aria-hidden="true">{meta.icon}</span> {meta.label}
                  {target.nextWeight !== null && (
                    <p className="text-xs font-normal text-slate-500">
                      {target.nextWeight} {weightUnit} × {target.nextReps} × {target.nextSets}
                    </p>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
