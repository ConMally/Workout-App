"use client";

import { useRef } from "react";
import type { LoggedExercise } from "@/types/workout-log";
import { getExerciseCompletion } from "@/lib/workout-log";
import { useFocusTrap } from "@/lib/useFocusTrap";
import { useSwipeGesture } from "@/lib/useSwipeGesture";

interface WorkoutOverviewDrawerProps {
  exercises: LoggedExercise[];
  activeExerciseId: string;
  onSelect: (id: string) => void;
  onClose: () => void;
}

// PART 3: full workout overview, kept accessible from the focused view
// instead of being replaced by it. Bottom sheet on mobile (items-end +
// rounded-t-2xl + full width), side panel on larger screens (sm:items-center
// sm:justify-end + fixed width) — both driven by the same Tailwind
// breakpoints already used elsewhere in this app, no JS media query needed.
// Swipe-down-to-dismiss is attached only to the header/handle, not the
// scrollable exercise list, so a fast scroll gesture inside the list can
// never be mistaken for "close the sheet."
export default function WorkoutOverviewDrawer({ exercises, activeExerciseId, onSelect, onClose }: WorkoutOverviewDrawerProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  useFocusTrap(panelRef, true);
  const swipeDownToClose = useSwipeGesture({ onSwipeDown: onClose });

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Escape") onClose();
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center sm:justify-end sm:p-4"
      role="presentation"
      onClick={onClose}
      onKeyDown={handleKeyDown}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="workout-overview-title"
        onClick={(e) => e.stopPropagation()}
        className="motion-safe:animate-sheet-up flex max-h-[80vh] w-full flex-col overflow-hidden rounded-t-[var(--card-radius)] border border-border bg-surface-elevated shadow-lg sm:h-full sm:max-h-full sm:w-96 sm:rounded-[var(--card-radius)] sm:motion-safe:animate-scale-in"
      >
        <div
          onTouchStart={swipeDownToClose.onTouchStart}
          onTouchEnd={swipeDownToClose.onTouchEnd}
          className="flex flex-col items-center gap-2 border-b border-border pt-2"
        >
          <span aria-hidden="true" className="h-1 w-10 rounded-full bg-surface-muted sm:hidden" />
          <div className="flex w-full items-center justify-between gap-3 p-4 pt-1">
            <h2 id="workout-overview-title" className="text-card-title text-text-primary">
              Workout overview
            </h2>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close workout overview"
              className="rounded-[var(--control-radius)] p-1.5 text-text-muted transition hover:bg-surface-muted hover:text-text-secondary"
            >
              ✕
            </button>
          </div>
        </div>

        <ul className="flex-1 divide-y divide-border overflow-y-auto p-2">
          {exercises.map((exercise, index) => {
            const completion = getExerciseCompletion(exercise);
            const isActive = exercise.id === activeExerciseId;
            return (
              <li key={exercise.id}>
                <button
                  type="button"
                  onClick={() => onSelect(exercise.id)}
                  aria-current={isActive ? "true" : undefined}
                  className={`flex w-full items-center gap-3 rounded-[var(--control-radius)] px-3 py-3 text-left transition active:scale-[0.99] ${
                    isActive ? "bg-accent-soft ring-1 ring-accent/40" : "hover:bg-surface-muted"
                  }`}
                >
                  <span
                    className={`flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                      completion.isComplete
                        ? "bg-accent text-accent-foreground"
                        : "border border-border text-text-muted"
                    }`}
                    aria-hidden="true"
                  >
                    {completion.isComplete ? "✓" : index + 1}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold text-text-primary">{exercise.name}</span>
                    <span className="block text-xs text-text-muted">
                      {completion.completedSets}/{completion.totalSets} sets
                      {completion.isComplete ? " · Complete" : isActive ? " · Current" : ""}
                    </span>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
