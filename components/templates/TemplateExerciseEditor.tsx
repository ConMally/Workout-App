"use client";

import type { TemplateExercise } from "@/types/templates";

interface TemplateExerciseEditorProps {
  exercise: TemplateExercise;
  onChange: (exercise: TemplateExercise) => void;
  onRemove: () => void;
  removeDisabled: boolean;
}

const inputClass =
  "rounded-lg border border-slate-200 px-2.5 py-1.5 text-sm text-slate-800 focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/30";

export default function TemplateExerciseEditor({ exercise, onChange, onRemove, removeDisabled }: TemplateExerciseEditorProps) {
  return (
    <div className="grid grid-cols-2 gap-2 rounded-xl border border-slate-100 bg-slate-50/60 p-3 sm:grid-cols-6">
      <label className="col-span-2 flex flex-col gap-1 text-xs font-medium text-slate-600 sm:col-span-2">
        Exercise
        <input
          type="text"
          value={exercise.name}
          onChange={(e) => onChange({ ...exercise, name: e.target.value })}
          placeholder="e.g. Barbell Bench Press"
          maxLength={120}
          className={inputClass}
        />
      </label>

      <label className="flex flex-col gap-1 text-xs font-medium text-slate-600">
        Sets
        <input
          type="number"
          min={1}
          max={10}
          value={exercise.sets}
          onChange={(e) => onChange({ ...exercise, sets: Number(e.target.value) })}
          className={inputClass}
        />
      </label>

      <label className="flex flex-col gap-1 text-xs font-medium text-slate-600">
        Reps
        <input
          type="text"
          value={exercise.reps}
          onChange={(e) => onChange({ ...exercise, reps: e.target.value })}
          placeholder="8-12"
          maxLength={20}
          className={inputClass}
        />
      </label>

      <label className="flex flex-col gap-1 text-xs font-medium text-slate-600">
        Rest (s)
        <input
          type="number"
          min={0}
          max={600}
          value={exercise.restSeconds}
          onChange={(e) => onChange({ ...exercise, restSeconds: Number(e.target.value) })}
          className={inputClass}
        />
      </label>

      <div className="flex items-end justify-end">
        <button
          type="button"
          onClick={onRemove}
          disabled={removeDisabled}
          className="rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs font-medium text-slate-600 transition hover:border-red-300 hover:bg-red-50 hover:text-red-700 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-slate-300 disabled:hover:bg-transparent disabled:hover:text-slate-600"
        >
          Remove
        </button>
      </div>

      <label className="col-span-2 flex flex-col gap-1 text-xs font-medium text-slate-600 sm:col-span-6">
        Notes (optional)
        <input
          type="text"
          value={exercise.notes}
          onChange={(e) => onChange({ ...exercise, notes: e.target.value })}
          maxLength={2000}
          className={inputClass}
        />
      </label>
    </div>
  );
}
