import type { Recommendation } from "@/types/insights";

interface NextActionsProps {
  recommendations: Recommendation[];
}

export default function NextActions({ recommendations }: NextActionsProps) {
  const top = recommendations.slice(0, 3);
  if (top.length === 0) return null;

  return (
    <div className="rounded-[var(--card-radius)] border border-accent/30 bg-accent-soft p-5 sm:p-6">
      <h3 className="text-label !text-accent">Suggested next actions</h3>
      <ul className="mt-3 flex flex-col gap-3">
        {top.map((rec) => (
          <li key={rec.id} className="rounded-[var(--control-radius)] bg-surface/70 p-3">
            <p className="text-sm font-semibold text-accent">{rec.message}</p>
            <p className="mt-0.5 text-xs text-accent">{rec.explanation}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}
