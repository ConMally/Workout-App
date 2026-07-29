"use client";

import type { TemplateDay } from "@/types/templates";
import { createEmptyTemplateExercise, moveItem } from "@/lib/templates";
import TemplateExerciseEditor from "./TemplateExerciseEditor";

interface TemplateDayEditorProps {
  day: TemplateDay;
  index: number;
  count: number;
  errors?: Record<string, string>;
  onChange: (day: TemplateDay) => void;
  onRemove: () => void;
  onMove: (direction: "up" | "down") => void;
  removeDisabled: boolean;
}

export default function TemplateDayEditor({
  day,
  index,
  count,
  errors,
  onChange,
  onRemove,
  onMove,
  removeDisabled,
}: TemplateDayEditorProps) {
  const dayNameError = errors?.[`day-${index}-name`];
  const exercisesError = errors?.[`day-${index}-exercises`];

  function updateExercise(exerciseIndex: number, exercise: TemplateDay["exercises"][number]) {
    const exercises = day.exercises.map((e, i) => (i === exerciseIndex ? exercise : e));
    onChange({ ...day, exercises });
  }

  function addExercise() {
    onChange({ ...day, exercises: [...day.exercises, createEmptyTemplateExercise()] });
  }

  function removeExercise(exerciseIndex: number) {
    onChange({ ...day, exercises: day.exercises.filter((_, i) => i !== exerciseIndex) });
  }

  function moveExercise(exerciseIndex: number, direction: "up" | "down") {
    onChange({ ...day, exercises: moveItem(day.exercises, exerciseIndex, direction) });
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
              aria-invalid={Boolean(dayNameError)}
              aria-describedby={dayNameError ? `day-${index}-name-error` : undefined}
              className={`rounded-lg border px-2.5 py-1.5 text-sm text-slate-800 focus:outline-none focus:ring-2 ${
                dayNameError
                  ? "border-red-300 focus:border-red-400 focus:ring-red-500/30"
                  : "border-slate-200 focus:border-teal-500 focus:ring-teal-500/30"
              }`}
            />
            {dayNameError && (
              <p id={`day-${index}-name-error`} className="text-xs text-red-600">
                {dayNameError}
              </p>
            )}
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

        <div className="flex items-center gap-1">
          <div className="flex flex-col gap-0.5">
            <button
              type="button"
              onClick={() => onMove("up")}
              disabled={index === 0}
              aria-label={`Move ${day.dayName || "day"} up`}
              className="rounded-md border border-slate-300 px-1.5 py-0.5 text-xs text-slate-600 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-30"
            >
              ↑
            </button>
            <button
              type="button"
              onClick={() => onMove("down")}
              disabled={index === count - 1}
              aria-label={`Move ${day.dayName || "day"} down`}
              className="rounded-md border border-slate-300 px-1.5 py-0.5 text-xs text-slate-600 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-30"
            >
              ↓
            </button>
          </div>
          <button
            type="button"
            onClick={onRemove}
            disabled={removeDisabled}
            aria-label={`Remove ${day.dayName || "day"}`}
            className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-600 transition hover:border-red-300 hover:bg-red-50 hover:text-red-700 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-slate-300 disabled:hover:bg-transparent disabled:hover:text-slate-600"
          >
            Remove day
          </button>
        </div>
      </div>

      {exercisesError && <p className="mt-2 text-xs text-red-600">{exercisesError}</p>}

      <div className="mt-3 flex flex-col gap-2">
        {day.exercises.map((exercise, exerciseIndex) => (
          <TemplateExerciseEditor
            key={exercise.id ?? exerciseIndex}
            exercise={exercise}
            index={exerciseIndex}
            count={day.exercises.length}
            errors={{
              name: errors?.[`exercise-${index}-${exerciseIndex}-name`],
              sets: errors?.[`exercise-${index}-${exerciseIndex}-sets`],
              reps: errors?.[`exercise-${index}-${exerciseIndex}-reps`],
              rest: errors?.[`exercise-${index}-${exerciseIndex}-rest`],
            }}
            onChange={(next) => updateExercise(exerciseIndex, next)}
            onRemove={() => removeExercise(exerciseIndex)}
            onMove={(direction) => moveExercise(exerciseIndex, direction)}
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
