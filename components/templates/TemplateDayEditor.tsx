"use client";

import { useState } from "react";
import type { CompletedWorkout, WeightUnit } from "@/types/workout-log";
import type { TemplateDay } from "@/types/templates";
import type { ExerciseDefinition } from "@/types/exercises";
import { moveItem, templateExerciseFromDefinition } from "@/lib/templates";
import TemplateExerciseEditor from "./TemplateExerciseEditor";
import ExercisePickerDialog from "@/components/exercises/ExercisePickerDialog";

interface TemplateDayEditorProps {
  day: TemplateDay;
  index: number;
  count: number;
  history: CompletedWorkout[];
  weightUnit: WeightUnit;
  favoriteIds: Set<string>;
  onToggleFavorite: (exerciseId: string) => void;
  errors?: Record<string, string>;
  onChange: (day: TemplateDay) => void;
  onRemove: () => void;
  onMove: (direction: "up" | "down") => void;
  removeDisabled: boolean;
}

// Add mode appends a new exercise built from the picked library entry;
// replace mode swaps the exercise at `exerciseIndex` in place, keeping its
// existing id/sets/reps/restSeconds/notes (only what it *refers to*
// changes) — PART 1's "keep sets, reps, rest, notes... unchanged" and
// "clicking an existing exercise name should allow replacing it through
// the same selector."
type PickerMode = { kind: "add" } | { kind: "replace"; exerciseIndex: number };

export default function TemplateDayEditor({
  day,
  index,
  count,
  history,
  weightUnit,
  favoriteIds,
  onToggleFavorite,
  errors,
  onChange,
  onRemove,
  onMove,
  removeDisabled,
}: TemplateDayEditorProps) {
  const [pickerMode, setPickerMode] = useState<PickerMode | null>(null);
  const dayNameError = errors?.[`day-${index}-name`];
  const exercisesError = errors?.[`day-${index}-exercises`];

  function updateExercise(exerciseIndex: number, exercise: TemplateDay["exercises"][number]) {
    const exercises = day.exercises.map((e, i) => (i === exerciseIndex ? exercise : e));
    onChange({ ...day, exercises });
  }

  function removeExercise(exerciseIndex: number) {
    onChange({ ...day, exercises: day.exercises.filter((_, i) => i !== exerciseIndex) });
  }

  function moveExercise(exerciseIndex: number, direction: "up" | "down") {
    onChange({ ...day, exercises: moveItem(day.exercises, exerciseIndex, direction) });
  }

  function handlePickerSelect(definition: ExerciseDefinition) {
    if (!pickerMode) return;
    if (pickerMode.kind === "add") {
      onChange({ ...day, exercises: [...day.exercises, templateExerciseFromDefinition(definition)] });
    } else {
      const current = day.exercises[pickerMode.exerciseIndex];
      updateExercise(pickerMode.exerciseIndex, { ...current, exerciseId: definition.id, name: definition.name });
    }
    setPickerMode(null);
  }

  return (
    <div className="rounded-[var(--card-radius)] border border-border bg-surface p-4 shadow-sm sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="grid flex-1 grid-cols-1 gap-2 sm:grid-cols-2">
          <label className="flex flex-col gap-1 text-xs font-medium text-text-secondary">
            Day name
            <input
              type="text"
              value={day.dayName}
              onChange={(e) => onChange({ ...day, dayName: e.target.value })}
              maxLength={120}
              aria-invalid={Boolean(dayNameError)}
              aria-describedby={dayNameError ? `day-${index}-name-error` : undefined}
              className={`rounded-[var(--control-radius)] border bg-surface px-2.5 py-1.5 text-sm text-text-primary focus:outline-none focus:ring-2 ${
                dayNameError
                  ? "border-danger focus:border-danger focus:ring-danger/30"
                  : "border-border focus:border-accent focus:ring-focus-ring/30"
              }`}
            />
            {dayNameError && (
              <p id={`day-${index}-name-error`} className="text-xs text-danger">
                {dayNameError}
              </p>
            )}
          </label>
          <label className="flex flex-col gap-1 text-xs font-medium text-text-secondary">
            Focus
            <input
              type="text"
              value={day.focus}
              onChange={(e) => onChange({ ...day, focus: e.target.value })}
              placeholder="e.g. Chest, shoulders & triceps"
              maxLength={120}
              className="rounded-[var(--control-radius)] border border-border bg-surface px-2.5 py-1.5 text-sm text-text-primary focus:border-accent focus:outline-none focus:ring-2 focus:ring-focus-ring/30"
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
              className="rounded-md border border-border px-1.5 py-0.5 text-xs text-text-secondary transition hover:bg-surface-muted disabled:cursor-not-allowed disabled:opacity-30"
            >
              ↑
            </button>
            <button
              type="button"
              onClick={() => onMove("down")}
              disabled={index === count - 1}
              aria-label={`Move ${day.dayName || "day"} down`}
              className="rounded-md border border-border px-1.5 py-0.5 text-xs text-text-secondary transition hover:bg-surface-muted disabled:cursor-not-allowed disabled:opacity-30"
            >
              ↓
            </button>
          </div>
          <button
            type="button"
            onClick={onRemove}
            disabled={removeDisabled}
            aria-label={`Remove ${day.dayName || "day"}`}
            className="rounded-[var(--control-radius)] border border-border px-3 py-1.5 text-xs font-medium text-text-secondary transition hover:border-danger/40 hover:bg-danger-soft hover:text-danger disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-border disabled:hover:bg-transparent disabled:hover:text-text-secondary"
          >
            Remove day
          </button>
        </div>
      </div>

      {exercisesError && <p className="mt-2 text-xs text-danger">{exercisesError}</p>}

      <div className="mt-3 flex flex-col gap-2">
        {day.exercises.map((exercise, exerciseIndex) => (
          <TemplateExerciseEditor
            key={exercise.id ?? exerciseIndex}
            exercise={exercise}
            index={exerciseIndex}
            count={day.exercises.length}
            history={history}
            weightUnit={weightUnit}
            favoriteIds={favoriteIds}
            onToggleFavorite={onToggleFavorite}
            errors={{
              name: errors?.[`exercise-${index}-${exerciseIndex}-name`],
              sets: errors?.[`exercise-${index}-${exerciseIndex}-sets`],
              reps: errors?.[`exercise-${index}-${exerciseIndex}-reps`],
              rest: errors?.[`exercise-${index}-${exerciseIndex}-rest`],
            }}
            onChange={(next) => updateExercise(exerciseIndex, next)}
            onReplace={() => setPickerMode({ kind: "replace", exerciseIndex })}
            onRemove={() => removeExercise(exerciseIndex)}
            onMove={(direction) => moveExercise(exerciseIndex, direction)}
            removeDisabled={false}
          />
        ))}
      </div>

      <button
        type="button"
        onClick={() => setPickerMode({ kind: "add" })}
        className="mt-3 rounded-[var(--control-radius)] border border-dashed border-border px-3 py-1.5 text-xs font-medium text-accent transition hover:bg-accent-soft"
      >
        + Add exercise
      </button>

      {pickerMode && (
        <ExercisePickerDialog
          title={pickerMode.kind === "add" ? "Add exercise" : "Replace exercise"}
          description="Search the centralized exercise library — every template exercise references a real library entry."
          history={history}
          favoriteIds={favoriteIds}
          onToggleFavorite={onToggleFavorite}
          onSelect={handlePickerSelect}
          onCancel={() => setPickerMode(null)}
        />
      )}
    </div>
  );
}
