"use client";

import { useState } from "react";
import type { TemplateSummary, WorkoutTemplate } from "@/types/templates";
import { getFriendlyDataErrorMessage } from "@/lib/supabase/data-errors";
import EmptyState from "@/components/EmptyState";
import TemplateCard from "./TemplateCard";
import TemplateEditor, { type TemplateEditorSubmitInput } from "./TemplateEditor";
import DeleteTemplateDialog from "./DeleteTemplateDialog";

interface TemplateListProps {
  templates: TemplateSummary[];
  onCreate: (input: TemplateEditorSubmitInput) => Promise<void>;
  onUpdate: (template: WorkoutTemplate) => Promise<void>;
  onDelete: (templateId: string) => Promise<void>;
  onDuplicate: (templateId: string, newName: string) => Promise<void>;
  onLoadTemplate: (templateId: string) => Promise<WorkoutTemplate | null>;
  onUseTemplate: (templateId: string) => Promise<void>;
}

type View = { mode: "list" } | { mode: "create" } | { mode: "edit"; template: WorkoutTemplate };

// Templates are compared case-insensitively so "Push Day" and "push day"
// still collide — graceful duplicate-name handling per this phase's error
// requirements, checked client-side before ever attempting a write.
function nameCollides(templates: TemplateSummary[], name: string, excludeId?: string): boolean {
  const normalized = name.trim().toLowerCase();
  return templates.some((t) => t.id !== excludeId && t.name.trim().toLowerCase() === normalized);
}

function suggestDuplicateName(baseName: string, templates: TemplateSummary[]): string {
  let candidate = `${baseName} (copy)`;
  let n = 2;
  while (nameCollides(templates, candidate)) {
    candidate = `${baseName} (copy ${n})`;
    n += 1;
  }
  return candidate;
}

export default function TemplateList({
  templates,
  onCreate,
  onUpdate,
  onDelete,
  onDuplicate,
  onLoadTemplate,
  onUseTemplate,
}: TemplateListProps) {
  const [view, setView] = useState<View>({ mode: "list" });
  const [loadingTemplateId, setLoadingTemplateId] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<TemplateSummary | null>(null);
  const [busyTemplateId, setBusyTemplateId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [listError, setListError] = useState<string | null>(null);

  async function handleEditClick(summary: TemplateSummary) {
    setListError(null);
    setLoadingTemplateId(summary.id);
    try {
      const full = await onLoadTemplate(summary.id);
      if (full) setView({ mode: "edit", template: full });
      else setListError("That template no longer exists — it may have been deleted elsewhere.");
    } catch (error) {
      setListError(getFriendlyDataErrorMessage(error));
    } finally {
      setLoadingTemplateId(null);
    }
  }

  async function handleSubmit(input: TemplateEditorSubmitInput) {
    const excludeId = view.mode === "edit" ? view.template.id : undefined;
    if (nameCollides(templates, input.name, excludeId)) {
      setFormError(`You already have a template named "${input.name}" — choose a different name.`);
      return;
    }

    setFormError(null);
    setSubmitting(true);
    try {
      if (view.mode === "edit") {
        await onUpdate({ ...view.template, ...input, updatedAt: new Date().toISOString() });
      } else {
        await onCreate(input);
      }
      setView({ mode: "list" });
    } catch (error) {
      setFormError(getFriendlyDataErrorMessage(error));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleConfirmDelete() {
    if (!pendingDelete) return;
    setDeleting(true);
    try {
      await onDelete(pendingDelete.id);
      setPendingDelete(null);
    } catch (error) {
      setListError(getFriendlyDataErrorMessage(error));
    } finally {
      setDeleting(false);
    }
  }

  async function handleDuplicate(summary: TemplateSummary) {
    setListError(null);
    setBusyTemplateId(summary.id);
    try {
      await onDuplicate(summary.id, suggestDuplicateName(summary.name, templates));
    } catch (error) {
      setListError(getFriendlyDataErrorMessage(error));
    } finally {
      setBusyTemplateId(null);
    }
  }

  async function handleUse(summary: TemplateSummary) {
    setListError(null);
    setBusyTemplateId(summary.id);
    try {
      await onUseTemplate(summary.id);
    } catch (error) {
      setListError(getFriendlyDataErrorMessage(error));
    } finally {
      setBusyTemplateId(null);
    }
  }

  if (view.mode === "create" || view.mode === "edit") {
    return (
      <div className="flex flex-col gap-6">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">{view.mode === "edit" ? "Edit template" : "New template"}</h2>
          <p className="mt-1 text-sm text-slate-500">
            {view.mode === "edit" ? "Update the name, days, and exercises." : "Build a reusable weekly workout blueprint."}
          </p>
        </div>
        <TemplateEditor
          initialTemplate={view.mode === "edit" ? view.template : null}
          onSubmit={handleSubmit}
          onCancel={() => {
            setFormError(null);
            setView({ mode: "list" });
          }}
          submitting={submitting}
          errorMessage={formError}
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Templates</h2>
          <p className="mt-1 text-sm text-slate-500">Reusable workout blueprints you can start from anytime.</p>
        </div>
        <button
          type="button"
          onClick={() => setView({ mode: "create" })}
          className="rounded-lg bg-teal-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-teal-700"
        >
          Create template
        </button>
      </div>

      {listError && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{listError}</p>}

      {templates.length === 0 ? (
        <EmptyState
          title="No templates yet"
          message="Create one from scratch, or generate a plan and save it as a template to reuse later."
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {templates.map((template) => (
            <TemplateCard
              key={template.id}
              template={template}
              busy={busyTemplateId === template.id || loadingTemplateId === template.id}
              onEdit={() => handleEditClick(template)}
              onDuplicate={() => handleDuplicate(template)}
              onDelete={() => setPendingDelete(template)}
              onUse={() => handleUse(template)}
            />
          ))}
        </div>
      )}

      {pendingDelete && (
        <DeleteTemplateDialog
          templateName={pendingDelete.name}
          deleting={deleting}
          errorMessage={null}
          onConfirm={handleConfirmDelete}
          onCancel={() => setPendingDelete(null)}
        />
      )}
    </div>
  );
}
