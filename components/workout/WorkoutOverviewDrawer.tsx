"use client";

import { useRef } from "react";
import type { LoggedExercise } from "@/types/workout-log";
import { getExerciseCompletion } from "@/lib/workout-log";
import { useFocusTrap } from "@/lib/useFocusTrap";
import { useSwipeGesture } from "@/lib/useSwipeGesture";

interface WorkoutOverviewDrawerProps {
  exercises: LoggedExercise[];
  activeIndex: number;
  onSelect: (index: number) => void;
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
export default function WorkoutOverviewDrawer({ exercises, activeIndex, onSelect, onClose }: WorkoutOverviewDrawerProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  useFocusTrap(panelRef, true);
  const swipeDownToClose = useSwipeGesture({ onSwipeDown: onClose });

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Escape") onClose();
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/40 sm:items-center sm:justify-end sm:p-4"
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
        className="motion-safe:animate-sheet-up flex max-h-[80vh] w-full flex-col overflow-hidden rounded-t-2xl border border-slate-200 bg-white shadow-lg sm:h-full sm:max-h-full sm:w-96 sm:rounded-2xl sm:motion-safe:animate-scale-in dark:border-slate-800 dark:bg-slate-900"
      >
        <div
          onTouchStart={swipeDownToClose.onTouchStart}
          onTouchEnd={swipeDownToClose.onTouchEnd}
          className="flex flex-col items-center gap-2 border-b border-slate-100 pt-2 dark:border-slate-800"
        >
          <span aria-hidden="true" className="h-1 w-10 rounded-full bg-slate-200 sm:hidden dark:bg-slate-700" />
          <div className="flex w-full items-center justify-between gap-3 p-4 pt-1">
            <h2 id="workout-overview-title" className="text-base font-bold text-slate-900 dark:text-slate-100">
              Workout overview
            </h2>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close workout overview"
              className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-300"
            >
              ✕
            </button>
          </div>
        </div>

        <ul className="flex-1 divide-y divide-slate-100 overflow-y-auto p-2 dark:divide-slate-800">
          {exercises.map((exercise, index) => {
            const completion = getExerciseCompletion(exercise);
            const isActive = index === activeIndex;
            return (
              <li key={index}>
                <button
                  type="button"
                  onClick={() => onSelect(index)}
                  aria-current={isActive ? "true" : undefined}
                  className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left transition active:scale-[0.99] ${
                    isActive
                      ? "bg-teal-50 ring-1 ring-teal-300 dark:bg-teal-950/30 dark:ring-teal-700"
                      : "hover:bg-slate-50 dark:hover:bg-slate-800"
                  }`}
                >
                  <span
                    className={`flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                      completion.isComplete
                        ? "bg-teal-600 text-white"
                        : "border border-slate-300 text-slate-500 dark:border-slate-600 dark:text-slate-400"
                    }`}
                    aria-hidden="true"
                  >
                    {completion.isComplete ? "✓" : index + 1}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold text-slate-900 dark:text-slate-100">{exercise.name}</span>
                    <span className="block text-xs text-slate-500 dark:text-slate-400">
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
