"use client";

import Dialog from "@/components/ui/Dialog";
import Button from "@/components/ui/Button";

interface DeleteTemplateDialogProps {
  templateName: string;
  deleting: boolean;
  errorMessage: string | null;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function DeleteTemplateDialog({ templateName, deleting, errorMessage, onConfirm, onCancel }: DeleteTemplateDialogProps) {
  return (
    <Dialog onClose={onCancel} titleId="delete-template-title" className="max-w-sm p-5 sm:p-6">
      <h3 id="delete-template-title" className="text-section-heading text-text-primary">
        Delete template?
      </h3>
      <p className="mt-2 text-sm text-text-secondary">
        This permanently deletes <span className="font-medium text-text-primary">&quot;{templateName}&quot;</span>.
        This can&apos;t be undone.
      </p>

      {errorMessage && <p className="mt-3 rounded-[var(--control-radius)] bg-danger-soft px-3 py-2 text-xs text-danger">{errorMessage}</p>}

      <div className="mt-4 flex flex-wrap justify-end gap-2">
        <Button type="button" variant="secondary" onClick={onCancel} disabled={deleting}>
          Cancel
        </Button>
        <Button type="button" variant="destructive" onClick={onConfirm} loading={deleting}>
          {deleting ? "Deleting…" : "Delete"}
        </Button>
      </div>
    </Dialog>
  );
}
