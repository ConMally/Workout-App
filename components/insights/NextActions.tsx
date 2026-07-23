import type { Recommendation } from "@/types/insights";

interface NextActionsProps {
  recommendations: Recommendation[];
}

export default function NextActions({ recommendations }: NextActionsProps) {
  const top = recommendations.slice(0, 3);
  if (top.length === 0) return null;

  return (
    <div className="rounded-2xl border border-teal-200 bg-teal-50 p-5 sm:p-6">
      <h3 className="text-sm font-semibold uppercase tracking-wide text-teal-800">Suggested next actions</h3>
      <ul className="mt-3 flex flex-col gap-3">
        {top.map((rec) => (
          <li key={rec.id} className="rounded-xl bg-white/70 p-3">
            <p className="text-sm font-semibold text-teal-900">{rec.message}</p>
            <p className="mt-0.5 text-xs text-teal-700">{rec.explanation}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}
