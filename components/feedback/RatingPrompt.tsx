"use client";

import { useRef, useState } from "react";
import { useFocusTrap } from "@/lib/useFocusTrap";

interface RatingPromptProps {
  onSubmit: (rating: number, comment: string) => Promise<void>;
  onDismiss: () => void;
}

const STAR_LABELS = ["Poor", "Fair", "Good", "Great", "Excellent"];

// PART 5 — shown after 5 completed workouts or 7 days of use (trigger
// logic lives in app/page.tsx, since it needs history/account-age data
// this component doesn't need to know about). Both submitting and
// dismissing are permanent — app/page.tsx#handleDismissRatingPrompt sets
// profiles.feedback_prompt_dismissed_at either way, so "never ask again if
// dismissed" holds regardless of which path the user takes out of here.
export default function RatingPrompt({ onSubmit, onDismiss }: RatingPromptProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  useFocusTrap(dialogRef, true);

  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Escape") onDismiss();
  }

  async function handleSubmit() {
    if (rating === 0) return;
    setSubmitting(true);
    try {
      await onSubmit(rating, comment);
    } finally {
      setSubmitting(false);
    }
  }

  const displayedRating = hoverRating || rating;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/40 px-4 sm:items-center"
      role="presentation"
      onClick={onDismiss}
      onKeyDown={handleKeyDown}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="rating-prompt-title"
        onClick={(e) => e.stopPropagation()}
        className="motion-safe:animate-scale-in w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-5 shadow-lg sm:p-6 dark:border-slate-800 dark:bg-slate-900"
      >
        <h2 id="rating-prompt-title" className="text-lg font-semibold text-slate-900 dark:text-slate-100">
          How has your experience been so far?
        </h2>

        <div role="radiogroup" aria-label="Rating" className="mt-4 flex justify-center gap-1.5">
          {[1, 2, 3, 4, 5].map((value) => (
            <button
              key={value}
              type="button"
              role="radio"
              aria-checked={rating === value}
              aria-label={`${value} star${value === 1 ? "" : "s"} — ${STAR_LABELS[value - 1]}`}
              onClick={() => setRating(value)}
              onMouseEnter={() => setHoverRating(value)}
              onMouseLeave={() => setHoverRating(0)}
              className="p-1 text-3xl transition active:scale-90"
            >
              <span aria-hidden="true" className={value <= displayedRating ? "text-amber-400" : "text-slate-200 dark:text-slate-700"}>
                ★
              </span>
            </button>
          ))}
        </div>
        {displayedRating > 0 && (
          <p className="mt-1 text-center text-xs font-medium text-slate-500 dark:text-slate-400">{STAR_LABELS[displayedRating - 1]}</p>
        )}

        <label htmlFor="rating-comment" className="mt-4 block text-xs font-medium text-slate-600 dark:text-slate-300">
          Anything you&apos;d add? (optional)
          <textarea
            id="rating-comment"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            rows={3}
            maxLength={2000}
            className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/30 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
          />
        </label>

        <div className="mt-5 flex flex-wrap justify-end gap-2">
          <button
            type="button"
            onClick={onDismiss}
            disabled={submitting}
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-50 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            Not now
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={rating === 0 || submitting}
            className="rounded-lg bg-teal-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition active:scale-95 hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {submitting ? "Sending…" : "Submit"}
          </button>
        </div>
      </div>
    </div>
  );
}
