"use client";

import type { CoachRecommendation } from "@/types/analytics";

interface RecommendationsListProps {
  recommendations: CoachRecommendation[];
  dismissedIds: Set<string>;
  onDismiss: (id: string) => void;
}

const CATEGORY_LABELS: Record<CoachRecommendation["category"], string> = {
  progression: "Progression",
  plateau: "Plateau",
  consistency: "Consistency",
  recovery: "Recovery",
  muscle_balance: "Balance",
  readiness: "Readiness",
  exercise: "Exercise",
};

// Today's recommendation is simply the highest-priority one still visible —
// recommendations are regenerated on every history change (see
// lib/analytics/coach.ts), so "today's" naturally tracks whatever is most
// pressing right now rather than being pinned separately.
export default function RecommendationsList({ recommendations, dismissedIds, onDismiss }: RecommendationsListProps) {
  const visible = recommendations.filter((r) => !dismissedIds.has(r.id));

  if (visible.length === 0) {
    return (
      <div className="rounded-[var(--card-radius)] border border-border bg-surface p-5 shadow-sm sm:p-6">
        <h3 className="text-label">Coach</h3>
        <p className="mt-2 text-sm text-text-muted">
          {recommendations.length === 0
            ? "Complete a few workouts to start getting personalized coaching recommendations."
            : "You've cleared every recommendation — nice work. New ones will appear as your training data changes."}
        </p>
      </div>
    );
  }

  const [today, ...rest] = visible;

  return (
    <div className="flex flex-col gap-3">
      <div className="motion-safe:animate-step-in rounded-[var(--card-radius)] border border-accent/30 bg-accent-soft p-5 shadow-sm sm:p-6">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-label !text-accent">Today&apos;s recommendation</h3>
            <p className="mt-2 text-base font-semibold text-accent">{today.message}</p>
            <p className="mt-1 text-sm text-accent">{today.explanation}</p>
          </div>
          <button
            type="button"
            onClick={() => onDismiss(today.id)}
            aria-label={`Dismiss recommendation: ${today.message}`}
            className="flex-shrink-0 rounded-md px-2 py-1 text-xs font-medium text-accent transition active:scale-95 hover:bg-accent-soft"
          >
            Dismiss
          </button>
        </div>
      </div>

      {rest.length > 0 && (
        <div className="rounded-[var(--card-radius)] border border-border bg-surface p-5 shadow-sm sm:p-6">
          <h3 className="text-label">More recommendations</h3>
          <ul className="mt-3 flex flex-col gap-2">
            {rest.map((rec) => (
              <li
                key={rec.id}
                className="motion-safe:animate-step-in flex items-start justify-between gap-3 rounded-[var(--control-radius)] bg-surface-muted p-3"
              >
                <div>
                  <span className="text-[10px] font-semibold uppercase tracking-wide text-text-muted">
                    {CATEGORY_LABELS[rec.category]}
                  </span>
                  <p className="text-sm font-medium text-text-primary">{rec.message}</p>
                  <p className="mt-0.5 text-xs text-text-muted">{rec.explanation}</p>
                </div>
                <button
                  type="button"
                  onClick={() => onDismiss(rec.id)}
                  aria-label={`Dismiss recommendation: ${rec.message}`}
                  className="flex-shrink-0 rounded-md px-2 py-1 text-xs font-medium text-text-muted transition active:scale-95 hover:bg-surface"
                >
                  Dismiss
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
