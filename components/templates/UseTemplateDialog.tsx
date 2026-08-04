"use client";

import Dialog from "@/components/ui/Dialog";
import Button from "@/components/ui/Button";

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
  return (
    <Dialog onClose={onCancel} titleId="use-template-title" className="max-w-sm p-5 sm:p-6">
      <h3 id="use-template-title" className="text-section-heading text-text-primary">
        Replace your active plan?
      </h3>
      <p className="mt-2 text-sm text-text-secondary">
        Starting <span className="font-medium text-text-primary">&quot;{templateName}&quot;</span> replaces your
        current active plan and preferences. Your workout history is never affected.
      </p>

      {errorMessage && <p className="mt-3 rounded-[var(--control-radius)] bg-danger-soft px-3 py-2 text-xs text-danger">{errorMessage}</p>}

      <div className="mt-4 flex flex-wrap justify-end gap-2">
        <Button type="button" variant="secondary" onClick={onCancel} disabled={applying}>
          Cancel
        </Button>
        <Button type="button" variant="primary" onClick={onConfirm} loading={applying}>
          {applying ? "Starting…" : "Replace plan"}
        </Button>
      </div>
    </Dialog>
  );
}
