"use client";

import { useRef } from "react";
import { useFocusTrap } from "@/lib/useFocusTrap";
import Button from "@/components/ui/Button";

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
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
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
        className="motion-safe:animate-scale-in w-full max-w-sm rounded-[var(--card-radius)] border border-border bg-surface-elevated p-5 shadow-lg sm:p-6"
      >
        <h3 id="unsaved-changes-title" className="text-section-heading text-text-primary">
          Discard unsaved changes?
        </h3>
        <p id="unsaved-changes-description" className="mt-2 text-sm text-text-secondary">
          You have changes to this template that haven&apos;t been saved yet. Leaving now will lose them.
        </p>

        <div className="mt-4 flex flex-wrap justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onKeepEditing}>
            Keep editing
          </Button>
          <Button type="button" variant="destructive" onClick={onDiscard}>
            Discard changes
          </Button>
        </div>
      </div>
    </div>
  );
}
