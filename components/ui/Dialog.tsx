"use client";

import { useRef, type KeyboardEvent, type ReactNode } from "react";
import { useFocusTrap } from "@/lib/useFocusTrap";

interface DialogProps {
  onClose: () => void;
  titleId: string;
  children: ReactNode;
  className?: string;
}

// Reusable modal shell (overlay + focus-trapped panel + Escape-to-close) —
// the pattern every existing modal in this app (ExerciseDetailModal,
// ReplacementPicker, ExercisePickerDialog, ...) already hand-rolls
// identically. Introduced here as a foundation for new dialogs; existing
// modals are left as-is for this phase (Phase 10B territory) rather than
// migrated, per "do not redesign every screen yet."
export default function Dialog({ onClose, titleId, children, className = "" }: DialogProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  useFocusTrap(dialogRef, true);

  function handleKeyDown(e: KeyboardEvent) {
    if (e.key === "Escape") onClose();
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 py-8"
      role="presentation"
      onClick={onClose}
      onKeyDown={handleKeyDown}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onClick={(e) => e.stopPropagation()}
        className={`motion-safe:animate-scale-in flex max-h-full w-full flex-col overflow-hidden rounded-[var(--card-radius)] border border-border bg-surface-elevated shadow-lg ${className}`}
      >
        {children}
      </div>
    </div>
  );
}
