"use client";

import { useMemo, useState } from "react";
import type { TemplateSummary, WorkoutTemplate } from "@/types/templates";
import type { CompletedWorkout, WeightUnit } from "@/types/workout-log";
import {
  filterTemplates,
  nextDuplicateName,
  searchTemplates,
  sortTemplates,
  type TemplateFilter,
  type TemplateSortMode,
} from "@/lib/templates";
import { getFriendlyDataErrorMessage } from "@/lib/supabase/data-errors";
import EmptyState from "@/components/EmptyState";
import Button from "@/components/ui/Button";
import TemplateCard from "./TemplateCard";
import TemplateToolbar from "./TemplateToolbar";
import TemplateEditor, { type TemplateEditorSubmitInput } from "./TemplateEditor";
import DeleteTemplateDialog from "./DeleteTemplateDialog";
import UseTemplateDialog from "./UseTemplateDialog";

interface TemplateListProps {
  templates: TemplateSummary[];
  hasActivePlan: boolean;
  history: CompletedWorkout[];
  weightUnit: WeightUnit;
  favoriteExerciseIds: Set<string>;
  onToggleExerciseFavorite: (exerciseId: string) => void;
  onCreate: (input: TemplateEditorSubmitInput) => Promise<void>;
  onUpdate: (template: WorkoutTemplate) => Promise<void>;
  onDelete: (templateId: string) => Promise<void>;
  onDuplicate: (templateId: string, newName: string) => Promise<void>;
  onLoadTemplate: (templateId: string) => Promise<WorkoutTemplate | null>;
  onUseTemplate: (templateId: string) => Promise<void>;
  onToggleFavorite: (templateId: string, isFavorite: boolean) => Promise<void>;
  onDirtyChange?: (dirty: boolean) => void;
}

type View = { mode: "list" } | { mode: "create" } | { mode: "edit"; template: WorkoutTemplate };

// Templates are compared case-insensitively so "Push Day" and "push day"
// still collide — graceful duplicate-name handling per this phase's error
// requirements, checked client-side before ever attempting a write.
function nameCollides(templates: TemplateSummary[], name: string, excludeId?: string): boolean {
  const normalized = name.trim().toLowerCase();
  return templates.some((t) => t.id !== excludeId && t.name.trim().toLowerCase() === normalized);
}

export default function TemplateList({
  templates,
  hasActivePlan,
  history,
  weightUnit,
  favoriteExerciseIds,
  onToggleExerciseFavorite,
  onCreate,
  onUpdate,
  onDelete,
  onDuplicate,
  onLoadTemplate,
  onUseTemplate,
  onToggleFavorite,
  onDirtyChange,
}: TemplateListProps) {
  const [view, setView] = useState<View>({ mode: "list" });
  const [loadingTemplateId, setLoadingTemplateId] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<TemplateSummary | null>(null);
  const [pendingUse, setPendingUse] = useState<TemplateSummary | null>(null);
  const [busyTemplateId, setBusyTemplateId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [applyingTemplate, setApplyingTemplate] = useState(false);
  const [useError, setUseError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [listError, setListError] = useState<string | null>(null);

  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<TemplateFilter>("all");
  const [sort, setSort] = useState<TemplateSortMode>("favorites_first");

  // All three run over the already-loaded `templates` list — no network
  // call on any keystroke or toggle (see lib/templates.ts).
  const visibleTemplates = useMemo(
    () => sortTemplates(filterTemplates(searchTemplates(templates, query), filter), sort),
    [templates, query, filter, sort]
  );

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
      onDirtyChange?.(false);
      setView({ mode: "list" });
    } catch (error) {
      setFormError(getFriendlyDataErrorMessage(error));
    } finally {
      setSubmitting(false);
    }
  }

  function handleEditorCancel() {
    onDirtyChange?.(false);
    setFormError(null);
    setView({ mode: "list" });
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
      const existingNames = templates.filter((t) => t.id !== summary.id).map((t) => t.name);
      await onDuplicate(summary.id, nextDuplicateName(summary.name, existingNames));
    } catch (error) {
      setListError(getFriendlyDataErrorMessage(error));
    } finally {
      setBusyTemplateId(null);
    }
  }

  // Only warns when starting this template would actually replace
  // something — a brand-new account with no active plan yet just starts it
  // immediately, matching "require confirmation when replacement is
  // destructive" (not when it isn't).
  function handleUseClick(summary: TemplateSummary) {
    if (hasActivePlan) {
      setUseError(null);
      setPendingUse(summary);
      return;
    }
    void applyTemplate(summary);
  }

  async function applyTemplate(summary: TemplateSummary) {
    setListError(null);
    setBusyTemplateId(summary.id);
    try {
      await onUseTemplate(summary.id);
      setPendingUse(null);
    } catch (error) {
      const message = getFriendlyDataErrorMessage(error);
      if (pendingUse) setUseError(message);
      else setListError(message);
    } finally {
      setBusyTemplateId(null);
    }
  }

  async function handleConfirmUse() {
    if (!pendingUse) return;
    setApplyingTemplate(true);
    try {
      await applyTemplate(pendingUse);
    } finally {
      setApplyingTemplate(false);
    }
  }

  // Optimistic — flips the star immediately, rolls back only the local
  // view if the write fails (the actual template list state lives in
  // app/page.tsx, which onToggleFavorite already updates on success; on
  // failure it's simply never updated, so nothing to undo here beyond
  // surfacing the error).
  async function handleToggleFavorite(summary: TemplateSummary) {
    try {
      await onToggleFavorite(summary.id, !summary.isFavorite);
    } catch (error) {
      setListError(getFriendlyDataErrorMessage(error));
    }
  }

  if (view.mode === "create" || view.mode === "edit") {
    return (
      <div className="flex flex-col gap-6">
        <div>
          <h2 className="text-page-title text-text-primary">{view.mode === "edit" ? "Edit template" : "New template"}</h2>
          <p className="mt-1 text-supporting">
            {view.mode === "edit" ? "Update the name, days, and exercises." : "Build a reusable weekly workout blueprint."}
          </p>
        </div>
        <TemplateEditor
          initialTemplate={view.mode === "edit" ? view.template : null}
          history={history}
          weightUnit={weightUnit}
          favoriteExerciseIds={favoriteExerciseIds}
          onToggleExerciseFavorite={onToggleExerciseFavorite}
          onSubmit={handleSubmit}
          onCancel={handleEditorCancel}
          submitting={submitting}
          errorMessage={formError}
          onDirtyChange={onDirtyChange}
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-page-title text-text-primary">Templates</h2>
          <p className="mt-1 text-supporting">Reusable workout blueprints you can start from anytime.</p>
        </div>
        <Button type="button" variant="primary" onClick={() => setView({ mode: "create" })}>
          Create template
        </Button>
      </div>

      {templates.length > 0 && (
        <TemplateToolbar
          query={query}
          onQueryChange={setQuery}
          filter={filter}
          onFilterChange={setFilter}
          sort={sort}
          onSortChange={setSort}
        />
      )}

      {listError && <p className="rounded-[var(--control-radius)] bg-danger-soft px-3 py-2 text-sm text-danger">{listError}</p>}

      {templates.length === 0 ? (
        <EmptyState
          title="No templates yet"
          message="Create one from scratch, or generate a plan and save it as a template to reuse later."
        />
      ) : visibleTemplates.length === 0 ? (
        <EmptyState
          title="No templates match"
          message="Try a different search term, or switch back to All."
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {visibleTemplates.map((template) => (
            <TemplateCard
              key={template.id}
              template={template}
              busy={busyTemplateId === template.id || loadingTemplateId === template.id}
              onEdit={() => handleEditClick(template)}
              onDuplicate={() => handleDuplicate(template)}
              onDelete={() => setPendingDelete(template)}
              onUse={() => handleUseClick(template)}
              onToggleFavorite={() => handleToggleFavorite(template)}
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

      {pendingUse && (
        <UseTemplateDialog
          templateName={pendingUse.name}
          applying={applyingTemplate}
          errorMessage={useError}
          onConfirm={handleConfirmUse}
          onCancel={() => {
            setPendingUse(null);
            setUseError(null);
          }}
        />
      )}
    </div>
  );
}
