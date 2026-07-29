"use client";

import { useRef } from "react";
import { useFocusTrap } from "@/lib/useFocusTrap";

interface UseTemplateDialogProps {
  templateName: string;
  applying: boolean;
  errorMessage: string | null;
  onConfirm: () => void;
  onCancel: () => void;
}

// Only shown when starting a template would actually overwrite something —
// TemplateList skips this dialog entirely and applies the template
// immediately when there's no active plan yet (see
// TemplateList.tsx#handleUse).
export default function UseTemplateDialog({ templateName, applying, errorMessage, onConfirm, onCancel }: UseTemplateDialogProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  useFocusTrap(dialogRef, true);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 px-4" role="presentation" onClick={onCancel}>
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="use-template-title"
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-5 shadow-lg sm:p-6"
      >
        <h3 id="use-template-title" className="text-lg font-semibold text-slate-900">
          Replace your active plan?
        </h3>
        <p className="mt-2 text-sm text-slate-600">
          Starting <span className="font-medium text-slate-800">&quot;{templateName}&quot;</span> replaces your
          current active plan and preferences. Your workout history is never affected.
        </p>

        {errorMessage && <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">{errorMessage}</p>}

        <div className="mt-4 flex flex-wrap justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            disabled={applying}
            className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={applying}
            className="rounded-lg bg-teal-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {applying ? "Starting…" : "Replace plan"}
          </button>
        </div>
      </div>
    </div>
  );
}
