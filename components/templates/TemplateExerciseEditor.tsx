"use client";

import { useState } from "react";
import type { CompletedWorkout, WeightUnit } from "@/types/workout-log";
import type { TemplateExercise } from "@/types/templates";
import { MUSCLE_GROUP_LABELS } from "@/types/exercises";
import { resolveExerciseDefinition } from "@/lib/exercises/library";
import ExerciseDetailModal from "@/components/exercises/ExerciseDetailModal";

interface TemplateExerciseEditorProps {
  exercise: TemplateExercise;
  index: number;
  count: number;
  history: CompletedWorkout[];
  weightUnit: WeightUnit;
  favoriteIds: Set<string>;
  onToggleFavorite: (exerciseId: string) => void;
  errors?: Record<string, string | undefined>;
  onChange: (exercise: TemplateExercise) => void;
  onReplace: () => void;
  onRemove: () => void;
  onMove: (direction: "up" | "down") => void;
  removeDisabled: boolean;
}

const inputClass =
  "rounded-lg border border-slate-200 px-2.5 py-1.5 text-sm text-slate-800 focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/30";
const errorInputClass = "border-red-300 focus:border-red-400 focus:ring-red-500/30";

// PART 1: the exercise identity itself is no longer a free-text field —
// it's resolved (id first, name/alias fallback — see
// lib/exercises/library.ts#resolveExerciseDefinition) and displayed
// read-only, with a "Change" button that opens the same library-only
// picker used for "+ Add exercise" (owned by the parent TemplateDayEditor,
// which is what actually knows how to turn a picked ExerciseDefinition
// into a replacement here — see its handlePickerSelect). An exercise that
// doesn't resolve (exerciseId null and the name doesn't match any library
// entry/alias) renders as a clearly labeled "Legacy exercise" instead of
// silently dropping or rewriting it.
export default function TemplateExerciseEditor({
  exercise,
  index,
  count,
  history,
  weightUnit,
  favoriteIds,
  onToggleFavorite,
  errors,
  onChange,
  onReplace,
  onRemove,
  onMove,
  removeDisabled,
}: TemplateExerciseEditorProps) {
  const [showDetails, setShowDetails] = useState(false);
  const nameError = errors?.name;
  const setsError = errors?.sets;
  const repsError = errors?.reps;
  const restError = errors?.rest;

  const definition = resolveExerciseDefinition(exercise.exerciseId, exercise.name);

  return (
    <div className="grid grid-cols-2 gap-2 rounded-xl border border-slate-100 bg-slate-50/60 p-3 sm:grid-cols-6">
      <div className="col-span-2 flex flex-col gap-1 sm:col-span-2">
        <span id={`exercise-${index}-name-label`} className="text-xs font-medium text-slate-600">
          Exercise
        </span>
        <div
          className={`flex flex-col gap-1.5 rounded-lg border bg-white px-2.5 py-1.5 ${nameError ? errorInputClass : "border-slate-200"}`}
          aria-labelledby={`exercise-${index}-name-label`}
          aria-invalid={Boolean(nameError)}
          aria-describedby={nameError ? `exercise-${index}-name-error` : undefined}
        >
          <div className="flex items-center justify-between gap-2">
            <span className="truncate text-sm font-semibold text-slate-900">{exercise.name}</span>
            <button
              type="button"
              onClick={onReplace}
              className="flex-shrink-0 text-xs font-medium text-teal-700 hover:underline"
            >
              Change
            </button>
          </div>

          {definition ? (
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="rounded-full bg-teal-100 px-2 py-0.5 text-[10px] font-medium capitalize text-teal-800">
                {MUSCLE_GROUP_LABELS[definition.primaryMuscle]}
              </span>
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium capitalize text-slate-600">
                {definition.equipment[0]?.replace(/_/g, " ")}
              </span>
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium capitalize text-slate-600">
                {definition.difficulty}
              </span>
              <button type="button" onClick={() => setShowDetails(true)} className="text-[11px] font-medium text-teal-700 hover:underline">
                View exercise details
              </button>
            </div>
          ) : (
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-medium text-amber-800">Legacy exercise</span>
              <span className="text-[11px] text-slate-500">Not in the exercise library — replace it to see instructions.</span>
            </div>
          )}
        </div>
        {nameError && (
          <p id={`exercise-${index}-name-error`} className="text-xs text-red-600">
            {nameError}
          </p>
        )}
      </div>

      <label className="flex flex-col gap-1 text-xs font-medium text-slate-600">
        Sets
        <input
          type="number"
          min={1}
          max={10}
          value={exercise.sets}
          onChange={(e) => onChange({ ...exercise, sets: Number(e.target.value) })}
          aria-invalid={Boolean(setsError)}
          aria-describedby={setsError ? `exercise-${index}-sets-error` : undefined}
          className={`${inputClass} ${setsError ? errorInputClass : ""}`}
        />
        {setsError && (
          <p id={`exercise-${index}-sets-error`} className="text-xs text-red-600">
            {setsError}
          </p>
        )}
      </label>

      <label className="flex flex-col gap-1 text-xs font-medium text-slate-600">
        Reps
        <input
          type="text"
          value={exercise.reps}
          onChange={(e) => onChange({ ...exercise, reps: e.target.value })}
          placeholder="8-12"
          maxLength={20}
          aria-invalid={Boolean(repsError)}
          aria-describedby={repsError ? `exercise-${index}-reps-error` : undefined}
          className={`${inputClass} ${repsError ? errorInputClass : ""}`}
        />
        {repsError && (
          <p id={`exercise-${index}-reps-error`} className="text-xs text-red-600">
            {repsError}
          </p>
        )}
      </label>

      <label className="flex flex-col gap-1 text-xs font-medium text-slate-600">
        Rest (s)
        <input
          type="number"
          min={0}
          max={600}
          value={exercise.restSeconds}
          onChange={(e) => onChange({ ...exercise, restSeconds: Number(e.target.value) })}
          aria-invalid={Boolean(restError)}
          aria-describedby={restError ? `exercise-${index}-rest-error` : undefined}
          className={`${inputClass} ${restError ? errorInputClass : ""}`}
        />
        {restError && (
          <p id={`exercise-${index}-rest-error`} className="text-xs text-red-600">
            {restError}
          </p>
        )}
      </label>

      <div className="flex items-end justify-end gap-1">
        <div className="flex flex-col gap-0.5">
          <button
            type="button"
            onClick={() => onMove("up")}
            disabled={index === 0}
            aria-label={`Move ${exercise.name || "exercise"} up`}
            className="rounded-md border border-slate-300 px-1.5 py-0.5 text-xs text-slate-600 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-30"
          >
            ↑
          </button>
          <button
            type="button"
            onClick={() => onMove("down")}
            disabled={index === count - 1}
            aria-label={`Move ${exercise.name || "exercise"} down`}
            className="rounded-md border border-slate-300 px-1.5 py-0.5 text-xs text-slate-600 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-30"
          >
            ↓
          </button>
        </div>
        <button
          type="button"
          onClick={onRemove}
          disabled={removeDisabled}
          aria-label={`Remove ${exercise.name || "exercise"}`}
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

      {showDetails && definition && (
        <ExerciseDetailModal
          exercise={definition}
          history={history}
          weightUnit={weightUnit}
          isFavorite={favoriteIds.has(definition.id)}
          onToggleFavorite={() => onToggleFavorite(definition.id)}
          onClose={() => setShowDetails(false)}
        />
      )}
    </div>
  );
}
