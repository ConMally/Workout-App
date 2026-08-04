"use client";

import { useEffect, useMemo, useState } from "react";
import { GoalEnum } from "@/lib/schemas";
import { GOAL_LABELS } from "@/lib/workout-generator";
import { createEmptyTemplateDay, moveItem, validateTemplateInput } from "@/lib/templates";
import type { TemplateDay, WorkoutTemplate } from "@/types/templates";
import type { CompletedWorkout, WeightUnit } from "@/types/workout-log";
import TemplateDayEditor from "./TemplateDayEditor";
import UnsavedChangesDialog from "./UnsavedChangesDialog";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";

export interface TemplateEditorSubmitInput {
  name: string;
  description: string | null;
  goal: WorkoutTemplate["goal"];
  days: TemplateDay[];
}

interface TemplateEditorProps {
  initialTemplate?: WorkoutTemplate | null;
  history: CompletedWorkout[];
  weightUnit: WeightUnit;
  favoriteExerciseIds: Set<string>;
  onToggleExerciseFavorite: (exerciseId: string) => void;
  onSubmit: (input: TemplateEditorSubmitInput) => void;
  onCancel: () => void;
  submitting: boolean;
  errorMessage: string | null;
  onDirtyChange?: (dirty: boolean) => void;
}

function initialDaysFor(template: WorkoutTemplate | null | undefined): TemplateDay[] {
  return template?.days ?? [createEmptyTemplateDay(0)];
}

export default function TemplateEditor({
  initialTemplate,
  history,
  weightUnit,
  favoriteExerciseIds,
  onToggleExerciseFavorite,
  onSubmit,
  onCancel,
  submitting,
  errorMessage,
  onDirtyChange,
}: TemplateEditorProps) {
  const [name, setName] = useState(initialTemplate?.name ?? "");
  const [description, setDescription] = useState(initialTemplate?.description ?? "");
  const [goal, setGoal] = useState<WorkoutTemplate["goal"]>(initialTemplate?.goal ?? "general_fitness");
  const [days, setDays] = useState<TemplateDay[]>(initialDaysFor(initialTemplate));
  const [issues, setIssues] = useState<Record<string, string>>({});
  const [showUnsavedDialog, setShowUnsavedDialog] = useState(false);

  const isDirty = useMemo(() => {
    const initialName = initialTemplate?.name ?? "";
    const initialDescription = initialTemplate?.description ?? "";
    const initialGoal = initialTemplate?.goal ?? "general_fitness";
    return (
      name !== initialName ||
      description !== initialDescription ||
      goal !== initialGoal ||
      JSON.stringify(days) !== JSON.stringify(initialDaysFor(initialTemplate))
    );
  }, [name, description, goal, days, initialTemplate]);

  useEffect(() => {
    onDirtyChange?.(isDirty);
  }, [isDirty, onDirtyChange]);

  // Fallback for browser refresh/tab close only — every in-app navigation
  // (Cancel, switching templates, leaving the tab) goes through
  // handleCancelClick's own confirmation dialog instead, since a native
  // `confirm()`-style prompt can't be styled or tested the same way and
  // beforeunload can't intercept an in-app route change at all.
  useEffect(() => {
    if (!isDirty) return;
    function handleBeforeUnload(e: BeforeUnloadEvent) {
      e.preventDefault();
    }
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [isDirty]);

  function updateDay(index: number, day: TemplateDay) {
    setDays(days.map((d, i) => (i === index ? day : d)));
  }

  function addDay() {
    setDays([...days, createEmptyTemplateDay(days.length)]);
  }

  function removeDay(index: number) {
    setDays(days.filter((_, i) => i !== index).map((day, i) => ({ ...day, dayNumber: i })));
  }

  function moveDay(index: number, direction: "up" | "down") {
    setDays(moveItem(days, index, direction).map((day, i) => ({ ...day, dayNumber: i })));
  }

  function handleCancelClick() {
    if (isDirty) {
      setShowUnsavedDialog(true);
      return;
    }
    onCancel();
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const trimmedName = name.trim();
    const foundIssues = validateTemplateInput({ name: trimmedName, days });
    if (foundIssues.length > 0) {
      setIssues(Object.fromEntries(foundIssues.map((issue) => [issue.path, issue.message])));
      return;
    }
    setIssues({});

    onSubmit({
      name: trimmedName,
      description: description.trim() || null,
      goal,
      days: days.map((day, i) => ({ ...day, dayNumber: i })),
    });
  }

  const nameIssue = issues.name;
  const daysIssue = issues.days;
  const topLevelIssueCount = Object.keys(issues).length;

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <Card>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <label className="flex flex-col gap-1 text-sm font-medium text-text-secondary">
            Template name
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={120}
              placeholder="e.g. Upper/Lower Split"
              aria-invalid={Boolean(nameIssue)}
              aria-describedby={nameIssue ? "template-name-error" : undefined}
              className={`h-[var(--control-height)] rounded-[var(--control-radius)] border bg-surface px-3 text-sm text-text-primary focus:outline-none focus:ring-2 ${
                nameIssue
                  ? "border-danger focus:border-danger focus:ring-danger/30"
                  : "border-border focus:border-accent focus:ring-focus-ring/30"
              }`}
            />
            {nameIssue && (
              <p id="template-name-error" className="text-xs text-danger">
                {nameIssue}
              </p>
            )}
          </label>

          <label className="flex flex-col gap-1 text-sm font-medium text-text-secondary">
            Goal
            <select
              value={goal}
              onChange={(e) => setGoal(e.target.value as WorkoutTemplate["goal"])}
              className="h-[var(--control-height)] rounded-[var(--control-radius)] border border-border bg-surface px-3 text-sm text-text-primary focus:border-accent focus:outline-none focus:ring-2 focus:ring-focus-ring/30"
            >
              {GoalEnum.options.map((option) => (
                <option key={option} value={option}>
                  {GOAL_LABELS[option]}
                </option>
              ))}
            </select>
          </label>
        </div>

        <label className="mt-4 flex flex-col gap-1 text-sm font-medium text-text-secondary">
          Description (optional)
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            maxLength={1000}
            rows={2}
            className="rounded-[var(--control-radius)] border border-border bg-surface px-3 py-2 text-sm text-text-primary focus:border-accent focus:outline-none focus:ring-2 focus:ring-focus-ring/30"
          />
        </label>
      </Card>

      {daysIssue && <p className="rounded-[var(--control-radius)] bg-danger-soft px-3 py-2 text-sm text-danger">{daysIssue}</p>}

      <div className="flex flex-col gap-3">
        {days.map((day, index) => (
          <TemplateDayEditor
            key={day.id ?? index}
            day={day}
            index={index}
            count={days.length}
            history={history}
            weightUnit={weightUnit}
            favoriteIds={favoriteExerciseIds}
            onToggleFavorite={onToggleExerciseFavorite}
            errors={issues}
            onChange={(next) => updateDay(index, next)}
            onRemove={() => removeDay(index)}
            onMove={(direction) => moveDay(index, direction)}
            removeDisabled={days.length <= 1}
          />
        ))}
      </div>

      <button
        type="button"
        onClick={addDay}
        disabled={days.length >= 7}
        className="w-fit rounded-[var(--control-radius)] border border-dashed border-border px-4 py-2 text-sm font-medium text-accent transition hover:bg-accent-soft disabled:cursor-not-allowed disabled:opacity-40"
      >
        + Add day
      </button>

      {topLevelIssueCount > 0 && (
        <p className="rounded-[var(--control-radius)] bg-danger-soft px-3 py-2 text-sm text-danger">
          Fix the {topLevelIssueCount === 1 ? "issue" : `${topLevelIssueCount} issues`} highlighted above before saving.
        </p>
      )}
      {errorMessage && <p className="rounded-[var(--control-radius)] bg-danger-soft px-3 py-2 text-sm text-danger">{errorMessage}</p>}

      <div className="flex flex-wrap justify-end gap-2">
        <Button type="button" variant="secondary" onClick={handleCancelClick} disabled={submitting}>
          Cancel
        </Button>
        <Button type="submit" variant="primary" loading={submitting}>
          {submitting ? "Saving…" : initialTemplate ? "Save changes" : "Create template"}
        </Button>
      </div>

      {showUnsavedDialog && (
        <UnsavedChangesDialog
          onDiscard={() => {
            setShowUnsavedDialog(false);
            onCancel();
          }}
          onKeepEditing={() => setShowUnsavedDialog(false)}
        />
      )}
    </form>
  );
}
