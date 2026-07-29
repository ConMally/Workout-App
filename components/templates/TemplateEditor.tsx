"use client";

import { useEffect, useMemo, useState } from "react";
import { GoalEnum } from "@/lib/schemas";
import { GOAL_LABELS } from "@/lib/workout-generator";
import { createEmptyTemplateDay, moveItem, validateTemplateInput } from "@/lib/templates";
import type { TemplateDay, WorkoutTemplate } from "@/types/templates";
import TemplateDayEditor from "./TemplateDayEditor";
import UnsavedChangesDialog from "./UnsavedChangesDialog";

export interface TemplateEditorSubmitInput {
  name: string;
  description: string | null;
  goal: WorkoutTemplate["goal"];
  days: TemplateDay[];
}

interface TemplateEditorProps {
  initialTemplate?: WorkoutTemplate | null;
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
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
            Template name
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={120}
              placeholder="e.g. Upper/Lower Split"
              aria-invalid={Boolean(nameIssue)}
              aria-describedby={nameIssue ? "template-name-error" : undefined}
              className={`rounded-lg border px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 ${
                nameIssue
                  ? "border-red-300 focus:border-red-400 focus:ring-red-500/30"
                  : "border-slate-200 focus:border-teal-500 focus:ring-teal-500/30"
              }`}
            />
            {nameIssue && (
              <p id="template-name-error" className="text-xs text-red-600">
                {nameIssue}
              </p>
            )}
          </label>

          <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
            Goal
            <select
              value={goal}
              onChange={(e) => setGoal(e.target.value as WorkoutTemplate["goal"])}
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/30"
            >
              {GoalEnum.options.map((option) => (
                <option key={option} value={option}>
                  {GOAL_LABELS[option]}
                </option>
              ))}
            </select>
          </label>
        </div>

        <label className="mt-4 flex flex-col gap-1 text-sm font-medium text-slate-700">
          Description (optional)
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            maxLength={1000}
            rows={2}
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/30"
          />
        </label>
      </div>

      {daysIssue && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{daysIssue}</p>}

      <div className="flex flex-col gap-3">
        {days.map((day, index) => (
          <TemplateDayEditor
            key={day.id ?? index}
            day={day}
            index={index}
            count={days.length}
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
        className="w-fit rounded-lg border border-dashed border-slate-300 px-4 py-2 text-sm font-medium text-teal-700 transition hover:bg-teal-50 disabled:cursor-not-allowed disabled:opacity-40"
      >
        + Add day
      </button>

      {topLevelIssueCount > 0 && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          Fix the {topLevelIssueCount === 1 ? "issue" : `${topLevelIssueCount} issues`} highlighted above before saving.
        </p>
      )}
      {errorMessage && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{errorMessage}</p>}

      <div className="flex flex-wrap justify-end gap-2">
        <button
          type="button"
          onClick={handleCancelClick}
          disabled={submitting}
          className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={submitting}
          className="rounded-lg bg-teal-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {submitting ? "Saving…" : initialTemplate ? "Save changes" : "Create template"}
        </button>
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
