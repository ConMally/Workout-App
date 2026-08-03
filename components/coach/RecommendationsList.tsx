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
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Coach</h3>
        <p className="mt-2 text-sm text-slate-400">
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
      <div className="motion-safe:animate-step-in rounded-2xl border border-teal-200 bg-teal-50 p-5 shadow-sm sm:p-6 dark:border-teal-900 dark:bg-teal-950/30">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wide text-teal-800 dark:text-teal-300">Today&apos;s recommendation</h3>
            <p className="mt-2 text-base font-semibold text-teal-900 dark:text-teal-200">{today.message}</p>
            <p className="mt-1 text-sm text-teal-700 dark:text-teal-400">{today.explanation}</p>
          </div>
          <button
            type="button"
            onClick={() => onDismiss(today.id)}
            aria-label={`Dismiss recommendation: ${today.message}`}
            className="flex-shrink-0 rounded-md px-2 py-1 text-xs font-medium text-teal-700 transition active:scale-95 hover:bg-teal-100 dark:text-teal-300 dark:hover:bg-teal-900/40"
          >
            Dismiss
          </button>
        </div>
      </div>

      {rest.length > 0 && (
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6 dark:border-slate-800 dark:bg-slate-900">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">More recommendations</h3>
          <ul className="mt-3 flex flex-col gap-2">
            {rest.map((rec) => (
              <li
                key={rec.id}
                className="motion-safe:animate-step-in flex items-start justify-between gap-3 rounded-xl bg-slate-50 p-3 dark:bg-slate-800"
              >
                <div>
                  <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">
                    {CATEGORY_LABELS[rec.category]}
                  </span>
                  <p className="text-sm font-medium text-slate-800 dark:text-slate-200">{rec.message}</p>
                  <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{rec.explanation}</p>
                </div>
                <button
                  type="button"
                  onClick={() => onDismiss(rec.id)}
                  aria-label={`Dismiss recommendation: ${rec.message}`}
                  className="flex-shrink-0 rounded-md px-2 py-1 text-xs font-medium text-slate-500 transition active:scale-95 hover:bg-slate-200 dark:text-slate-400 dark:hover:bg-slate-700"
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
