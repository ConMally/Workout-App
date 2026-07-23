import type { MuscleBalanceResult } from "@/types/insights";

interface MuscleBalanceProps {
  muscleBalance: MuscleBalanceResult;
}

export default function MuscleBalance({ muscleBalance }: MuscleBalanceProps) {
  const { pairs, coreSetsLast4Weeks, hasEnoughData } = muscleBalance;

  if (!hasEnoughData) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Muscle-group balance</h3>
        <p className="mt-2 text-sm text-slate-400">
          Log a few more workouts to see how your training balances across muscle groups.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Muscle-group balance</h3>
      <p className="mt-1 text-xs text-slate-400">
        Based on completed sets over the last 4 weeks. These are training-volume observations, not medical
        conclusions.
      </p>

      <div className="mt-4 flex flex-col gap-4">
        {pairs.map((pair) => (
          <div key={pair.label}>
            <div className="flex items-center justify-between text-xs font-medium text-slate-600">
              <span>
                {pair.aLabel} · {pair.aCount} sets
              </span>
              <span>
                {pair.bLabel} · {pair.bCount} sets
              </span>
            </div>
            <div
              className="mt-1.5 flex h-2.5 w-full overflow-hidden rounded-full bg-slate-100"
              role="img"
              aria-label={`${pair.label}: ${pair.aLabel} ${pair.aCount} sets, ${pair.bLabel} ${pair.bCount} sets`}
            >
              {pair.hasEnoughData ? (
                <>
                  <div className="h-full bg-teal-500" style={{ width: `${pair.aPercent}%` }} />
                  <div className="h-full bg-slate-300" style={{ width: `${100 - pair.aPercent}%` }} />
                </>
              ) : (
                <div className="h-full w-full bg-slate-100" />
              )}
            </div>
            <p className="mt-1 text-xs text-slate-500">
              {pair.hasEnoughData ? pair.observation : "Not enough data yet for this comparison."}
            </p>
          </div>
        ))}
      </div>

      <div className="mt-4 rounded-xl bg-slate-50 px-3 py-2">
        <p className="text-xs font-medium text-slate-400">Core frequency (last 4 weeks)</p>
        <p className="mt-0.5 text-sm font-bold text-slate-900">{coreSetsLast4Weeks} completed sets</p>
      </div>
    </div>
  );
}
