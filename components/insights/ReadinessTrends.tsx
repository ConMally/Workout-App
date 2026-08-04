import type { ReadinessTrendResult } from "@/types/insights";

interface ReadinessTrendsProps {
  readiness: ReadinessTrendResult;
}

const LABELS: { key: keyof ReadinessTrendResult["averages"]; label: string }[] = [
  { key: "difficulty", label: "Difficulty" },
  { key: "energy", label: "Energy" },
  { key: "soreness", label: "Soreness" },
  { key: "sleepQuality", label: "Sleep quality" },
  { key: "satisfaction", label: "Satisfaction" },
];

export default function ReadinessTrends({ readiness }: ReadinessTrendsProps) {
  if (!readiness.hasEnoughData) {
    return (
      <div className="rounded-[var(--card-radius)] border border-border bg-surface p-5 shadow-sm sm:p-6">
        <h3 className="text-label">Recovery patterns</h3>
        <p className="mt-2 text-sm text-text-muted">
          Complete a post-workout check-in on a couple more workouts to see recovery trends here.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-[var(--card-radius)] border border-border bg-surface p-5 shadow-sm sm:p-6">
      <h3 className="text-label">Recovery patterns</h3>
      <p className="mt-1 text-xs text-text-muted">Averages from {readiness.entryCount} check-in{readiness.entryCount === 1 ? "" : "s"}.</p>

      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
        {LABELS.map(({ key, label }) => (
          <div key={key} className="rounded-[var(--control-radius)] bg-surface-muted px-3 py-2">
            <p className="text-xs font-medium text-text-muted">{label}</p>
            <p className="mt-0.5 text-sm font-bold text-text-primary">
              {readiness.averages[key] === null ? "—" : `${readiness.averages[key]} / 10`}
            </p>
          </div>
        ))}
      </div>

      {readiness.flags.length > 0 && (
        <ul className="mt-4 flex flex-col gap-1.5 text-sm text-text-secondary">
          {readiness.flags.map((flag, i) => (
            <li key={i} className="flex gap-2">
              <span className="mt-1.5 h-1 w-1 flex-shrink-0 rounded-full bg-accent" aria-hidden="true" />
              <span>{flag}</span>
            </li>
          ))}
        </ul>
      )}

      {readiness.showSafetyMessage && (
        <div className="mt-4 rounded-[var(--control-radius)] border border-warning/30 bg-warning-soft p-3 text-sm text-warning">
          Soreness has been rated very high recently. Consider extra rest, and check in with a doctor or physical
          therapist if soreness or pain persists.
        </div>
      )}
    </div>
  );
}
