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
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Recovery patterns</h3>
        <p className="mt-2 text-sm text-slate-400">
          Complete a post-workout check-in on a couple more workouts to see recovery trends here.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Recovery patterns</h3>
      <p className="mt-1 text-xs text-slate-400">Averages from {readiness.entryCount} check-in{readiness.entryCount === 1 ? "" : "s"}.</p>

      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
        {LABELS.map(({ key, label }) => (
          <div key={key} className="rounded-xl bg-slate-50 px-3 py-2">
            <p className="text-xs font-medium text-slate-400">{label}</p>
            <p className="mt-0.5 text-sm font-bold text-slate-900">
              {readiness.averages[key] === null ? "—" : `${readiness.averages[key]} / 10`}
            </p>
          </div>
        ))}
      </div>

      {readiness.flags.length > 0 && (
        <ul className="mt-4 flex flex-col gap-1.5 text-sm text-slate-700">
          {readiness.flags.map((flag, i) => (
            <li key={i} className="flex gap-2">
              <span className="mt-1.5 h-1 w-1 flex-shrink-0 rounded-full bg-teal-500" aria-hidden="true" />
              <span>{flag}</span>
            </li>
          ))}
        </ul>
      )}

      {readiness.showSafetyMessage && (
        <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
          Soreness has been rated very high recently. Consider extra rest, and check in with a doctor or physical
          therapist if soreness or pain persists.
        </div>
      )}
    </div>
  );
}
