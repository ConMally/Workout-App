"use client";

import { useState } from "react";

interface SaveAsTemplateDialogProps {
  saving: boolean;
  errorMessage: string | null;
  onSave: (name: string, description: string | null) => void;
  onCancel: () => void;
}

export default function SaveAsTemplateDialog({ saving, errorMessage, onSave, onCancel }: SaveAsTemplateDialogProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [validationError, setValidationError] = useState<string | null>(null);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmedName = name.trim();
    if (!trimmedName) {
      setValidationError("Give this template a name.");
      return;
    }
    setValidationError(null);
    onSave(trimmedName, description.trim() || null);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 px-4" role="presentation" onClick={onCancel}>
      <form
        onSubmit={handleSubmit}
        role="dialog"
        aria-modal="true"
        aria-labelledby="save-as-template-title"
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-5 shadow-lg sm:p-6"
      >
        <h3 id="save-as-template-title" className="text-lg font-semibold text-slate-900">
          Save as template
        </h3>
        <p className="mt-1 text-sm text-slate-500">Reuse this workout plan later from the Templates tab.</p>

        <label className="mt-4 flex flex-col gap-1 text-sm font-medium text-slate-700">
          Template name
          <input
            type="text"
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={120}
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/30"
          />
        </label>

        <label className="mt-3 flex flex-col gap-1 text-sm font-medium text-slate-700">
          Description (optional)
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            maxLength={1000}
            rows={2}
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/30"
          />
        </label>

        {(validationError || errorMessage) && (
          <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">{validationError ?? errorMessage}</p>
        )}

        <div className="mt-4 flex flex-wrap justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            disabled={saving}
            className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="rounded-lg bg-teal-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {saving ? "Saving…" : "Save template"}
          </button>
        </div>
      </form>
    </div>
  );
}
