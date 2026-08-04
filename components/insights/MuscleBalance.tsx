import type { MuscleBalanceResult } from "@/types/insights";

interface MuscleBalanceProps {
  muscleBalance: MuscleBalanceResult;
}

export default function MuscleBalance({ muscleBalance }: MuscleBalanceProps) {
  const { pairs, coreSetsLast4Weeks, hasEnoughData } = muscleBalance;

  if (!hasEnoughData) {
    return (
      <div className="rounded-[var(--card-radius)] border border-border bg-surface p-5 shadow-sm sm:p-6">
        <h3 className="text-label">Muscle-group balance</h3>
        <p className="mt-2 text-sm text-text-muted">
          Log a few more workouts to see how your training balances across muscle groups.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-[var(--card-radius)] border border-border bg-surface p-5 shadow-sm sm:p-6">
      <h3 className="text-label">Muscle-group balance</h3>
      <p className="mt-1 text-xs text-text-muted">
        Based on completed sets over the last 4 weeks. These are training-volume observations, not medical
        conclusions.
      </p>

      <div className="mt-4 flex flex-col gap-4">
        {pairs.map((pair) => (
          <div key={pair.label}>
            <div className="flex items-center justify-between text-xs font-medium text-text-secondary">
              <span>
                {pair.aLabel} · {pair.aCount} sets
              </span>
              <span>
                {pair.bLabel} · {pair.bCount} sets
              </span>
            </div>
            <div
              className="mt-1.5 flex h-2.5 w-full overflow-hidden rounded-full bg-surface-muted"
              role="img"
              aria-label={`${pair.label}: ${pair.aLabel} ${pair.aCount} sets, ${pair.bLabel} ${pair.bCount} sets`}
            >
              {pair.hasEnoughData ? (
                <>
                  <div className="h-full bg-accent" style={{ width: `${pair.aPercent}%` }} />
                  <div className="h-full bg-text-muted/40" style={{ width: `${100 - pair.aPercent}%` }} />
                </>
              ) : (
                <div className="h-full w-full bg-surface-muted" />
              )}
            </div>
            <p className="mt-1 text-xs text-text-muted">
              {pair.hasEnoughData ? pair.observation : "Not enough data yet for this comparison."}
            </p>
          </div>
        ))}
      </div>

      <div className="mt-4 rounded-[var(--control-radius)] bg-surface-muted px-3 py-2">
        <p className="text-xs font-medium text-text-muted">Core frequency (last 4 weeks)</p>
        <p className="mt-0.5 text-sm font-bold text-text-primary">{coreSetsLast4Weeks} completed sets</p>
      </div>
    </div>
  );
}
