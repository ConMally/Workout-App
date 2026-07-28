"use client";

import type { TemplateDay } from "@/types/templates";
import { createEmptyTemplateExercise } from "@/lib/templates";
import TemplateExerciseEditor from "./TemplateExerciseEditor";

interface TemplateDayEditorProps {
  day: TemplateDay;
  onChange: (day: TemplateDay) => void;
  onRemove: () => void;
  removeDisabled: boolean;
}

export default function TemplateDayEditor({ day, onChange, onRemove, removeDisabled }: TemplateDayEditorProps) {
  function updateExercise(index: number, exercise: TemplateDay["exercises"][number]) {
    const exercises = day.exercises.map((e, i) => (i === index ? exercise : e));
    onChange({ ...day, exercises });
  }

  function addExercise() {
    onChange({ ...day, exercises: [...day.exercises, createEmptyTemplateExercise()] });
  }

  function removeExercise(index: number) {
    onChange({ ...day, exercises: day.exercises.filter((_, i) => i !== index) });
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="grid flex-1 grid-cols-1 gap-2 sm:grid-cols-2">
          <label className="flex flex-col gap-1 text-xs font-medium text-slate-600">
            Day name
            <input
              type="text"
              value={day.dayName}
              onChange={(e) => onChange({ ...day, dayName: e.target.value })}
              maxLength={120}
              className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-sm text-slate-800 focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/30"
            />
          </label>
          <label className="flex flex-col gap-1 text-xs font-medium text-slate-600">
            Focus
            <input
              type="text"
              value={day.focus}
              onChange={(e) => onChange({ ...day, focus: e.target.value })}
              placeholder="e.g. Chest, shoulders & triceps"
              maxLength={120}
              className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-sm text-slate-800 focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/30"
            />
          </label>
        </div>
        <button
          type="button"
          onClick={onRemove}
          disabled={removeDisabled}
          className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-600 transition hover:border-red-300 hover:bg-red-50 hover:text-red-700 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-slate-300 disabled:hover:bg-transparent disabled:hover:text-slate-600"
        >
          Remove day
        </button>
      </div>

      <div className="mt-3 flex flex-col gap-2">
        {day.exercises.map((exercise, index) => (
          <TemplateExerciseEditor
            key={index}
            exercise={exercise}
            onChange={(next) => updateExercise(index, next)}
            onRemove={() => removeExercise(index)}
            removeDisabled={day.exercises.length <= 1}
          />
        ))}
      </div>

      <button
        type="button"
        onClick={addExercise}
        className="mt-3 rounded-lg border border-dashed border-slate-300 px-3 py-1.5 text-xs font-medium text-teal-700 transition hover:bg-teal-50"
      >
        + Add exercise
      </button>
    </div>
  );
}
