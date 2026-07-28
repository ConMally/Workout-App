"use client";

import { useState } from "react";
import { GoalEnum } from "@/lib/schemas";
import { GOAL_LABELS } from "@/lib/workout-generator";
import { createEmptyTemplateDay } from "@/lib/templates";
import type { TemplateDay, WorkoutTemplate } from "@/types/templates";
import TemplateDayEditor from "./TemplateDayEditor";

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
}

export default function TemplateEditor({ initialTemplate, onSubmit, onCancel, submitting, errorMessage }: TemplateEditorProps) {
  const [name, setName] = useState(initialTemplate?.name ?? "");
  const [description, setDescription] = useState(initialTemplate?.description ?? "");
  const [goal, setGoal] = useState<WorkoutTemplate["goal"]>(initialTemplate?.goal ?? "general_fitness");
  const [days, setDays] = useState<TemplateDay[]>(initialTemplate?.days ?? [createEmptyTemplateDay(0)]);
  const [validationError, setValidationError] = useState<string | null>(null);

  function updateDay(index: number, day: TemplateDay) {
    setDays(days.map((d, i) => (i === index ? day : d)));
  }

  function addDay() {
    setDays([...days, createEmptyTemplateDay(days.length)]);
  }

  function removeDay(index: number) {
    setDays(days.filter((_, i) => i !== index).map((day, i) => ({ ...day, dayNumber: i })));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setValidationError(null);

    const trimmedName = name.trim();
    if (!trimmedName) {
      setValidationError("Give this template a name.");
      return;
    }
    if (days.some((day) => day.exercises.some((exercise) => !exercise.name.trim()))) {
      setValidationError("Every exercise needs a name — remove any empty rows.");
      return;
    }

    onSubmit({
      name: trimmedName,
      description: description.trim() || null,
      goal,
      days: days.map((day, i) => ({ ...day, dayNumber: i })),
    });
  }

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
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/30"
            />
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

      <div className="flex flex-col gap-3">
        {days.map((day, index) => (
          <TemplateDayEditor
            key={index}
            day={day}
            onChange={(next) => updateDay(index, next)}
            onRemove={() => removeDay(index)}
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

      {(validationError || errorMessage) && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{validationError ?? errorMessage}</p>
      )}

      <div className="flex flex-wrap justify-end gap-2">
        <button
          type="button"
          onClick={onCancel}
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
    </form>
  );
}
