"use client";

import { useRef, useState } from "react";
import { useFocusTrap } from "@/lib/useFocusTrap";
import Button from "@/components/ui/Button";

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
  const dialogRef = useRef<HTMLFormElement>(null);
  useFocusTrap(dialogRef, true);

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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4" role="presentation" onClick={onCancel}>
      <form
        ref={dialogRef}
        onSubmit={handleSubmit}
        role="dialog"
        aria-modal="true"
        aria-labelledby="save-as-template-title"
        onClick={(e) => e.stopPropagation()}
        className="motion-safe:animate-scale-in w-full max-w-sm rounded-[var(--card-radius)] border border-border bg-surface-elevated p-5 shadow-lg sm:p-6"
      >
        <h3 id="save-as-template-title" className="text-section-heading text-text-primary">
          Save as template
        </h3>
        <p className="mt-1 text-supporting">Reuse this workout plan later from the Templates tab.</p>

        <label className="mt-4 flex flex-col gap-1 text-sm font-medium text-text-secondary">
          Template name
          <input
            type="text"
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={120}
            className="h-[var(--control-height)] rounded-[var(--control-radius)] border border-border bg-surface px-3 text-sm text-text-primary focus:border-accent focus:outline-none focus:ring-2 focus:ring-focus-ring/30"
          />
        </label>

        <label className="mt-3 flex flex-col gap-1 text-sm font-medium text-text-secondary">
          Description (optional)
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            maxLength={1000}
            rows={2}
            className="rounded-[var(--control-radius)] border border-border bg-surface px-3 py-2 text-sm text-text-primary focus:border-accent focus:outline-none focus:ring-2 focus:ring-focus-ring/30"
          />
        </label>

        {(validationError || errorMessage) && (
          <p className="mt-3 rounded-[var(--control-radius)] bg-danger-soft px-3 py-2 text-xs text-danger">{validationError ?? errorMessage}</p>
        )}

        <div className="mt-4 flex flex-wrap justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onCancel} disabled={saving}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" loading={saving}>
            {saving ? "Saving…" : "Save template"}
          </Button>
        </div>
      </form>
    </div>
  );
}
