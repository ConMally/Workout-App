"use client";

import { useRef } from "react";
import { useFocusTrap } from "@/lib/useFocusTrap";

interface UnsavedChangesDialogProps {
  onDiscard: () => void;
  onKeepEditing: () => void;
}

// Generic in-app confirmation for leaving a dirty editor — used instead of
// a native confirm() so it matches the rest of the app's dialogs (focus
// trap, restore-on-close, styling) and works the same for every kind of
// "navigate away" (Cancel, switching templates, changing tabs), not just
// the browser-refresh/tab-close case beforeunload covers.
export default function UnsavedChangesDialog({ onDiscard, onKeepEditing }: UnsavedChangesDialogProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  useFocusTrap(dialogRef, true);

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Escape") onKeepEditing();
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 px-4"
      role="presentation"
      onClick={onKeepEditing}
      onKeyDown={handleKeyDown}
    >
      <div
        ref={dialogRef}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="unsaved-changes-title"
        aria-describedby="unsaved-changes-description"
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-5 shadow-lg sm:p-6"
      >
        <h3 id="unsaved-changes-title" className="text-lg font-semibold text-slate-900">
          Discard unsaved changes?
        </h3>
        <p id="unsaved-changes-description" className="mt-2 text-sm text-slate-600">
          You have changes to this template that haven&apos;t been saved yet. Leaving now will lose them.
        </p>

        <div className="mt-4 flex flex-wrap justify-end gap-2">
          <button
            type="button"
            onClick={onKeepEditing}
            className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
          >
            Keep editing
          </button>
          <button
            type="button"
            onClick={onDiscard}
            className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-red-700"
          >
            Discard changes
          </button>
        </div>
      </div>
    </div>
  );
}
