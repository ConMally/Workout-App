"use client";

import { useState } from "react";
import Dialog from "@/components/ui/Dialog";
import Button from "@/components/ui/Button";

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
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);

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
    <Dialog onClose={onDismiss} titleId="rating-prompt-title" className="max-w-sm p-5 sm:p-6">
      <h2 id="rating-prompt-title" className="text-section-heading text-text-primary">
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
            className="p-1 text-3xl transition motion-safe:active:scale-90"
          >
            <span aria-hidden="true" className={value <= displayedRating ? "text-warning" : "text-text-muted"}>
              ★
            </span>
          </button>
        ))}
      </div>
      {displayedRating > 0 && (
        <p className="mt-1 text-center text-xs font-medium text-text-muted">{STAR_LABELS[displayedRating - 1]}</p>
      )}

      <label htmlFor="rating-comment" className="mt-4 block text-xs font-medium text-text-secondary">
        Anything you&apos;d add? (optional)
        <textarea
          id="rating-comment"
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          rows={3}
          maxLength={2000}
          className="mt-1 w-full rounded-[var(--control-radius)] border border-border bg-surface px-3 py-2 text-sm text-text-primary focus:border-accent focus:outline-none focus:ring-2 focus:ring-focus-ring/30"
        />
      </label>

      <div className="mt-5 flex flex-wrap justify-end gap-2">
        <Button type="button" variant="secondary" onClick={onDismiss} disabled={submitting}>
          Not now
        </Button>
        <Button type="button" variant="primary" onClick={handleSubmit} disabled={rating === 0} loading={submitting}>
          {submitting ? "Sending…" : "Submit"}
        </Button>
      </div>
    </Dialog>
  );
}
