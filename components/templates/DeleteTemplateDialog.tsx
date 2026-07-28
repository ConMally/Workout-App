"use client";

interface DeleteTemplateDialogProps {
  templateName: string;
  deleting: boolean;
  errorMessage: string | null;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function DeleteTemplateDialog({ templateName, deleting, errorMessage, onConfirm, onCancel }: DeleteTemplateDialogProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 px-4" role="presentation" onClick={onCancel}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="delete-template-title"
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-5 shadow-lg sm:p-6"
      >
        <h3 id="delete-template-title" className="text-lg font-semibold text-slate-900">
          Delete template?
        </h3>
        <p className="mt-2 text-sm text-slate-600">
          This permanently deletes <span className="font-medium text-slate-800">&quot;{templateName}&quot;</span>.
          This can&apos;t be undone.
        </p>

        {errorMessage && <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">{errorMessage}</p>}

        <div className="mt-4 flex flex-wrap justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            disabled={deleting}
            className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={deleting}
            className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {deleting ? "Deleting…" : "Delete"}
          </button>
        </div>
      </div>
    </div>
  );
}
