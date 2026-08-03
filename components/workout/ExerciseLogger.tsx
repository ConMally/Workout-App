"use client";

import { useMemo } from "react";
import type { LoggedExercise, LoggedSet, WeightUnit } from "@/types/workout-log";
import { getCurrentSetIndex } from "@/lib/workout-log";

const MAX_WEIGHT = 2000;
const MAX_REPS = 200;
const VIBRATION_MS = 45;

function parseNullableWeight(raw: string, fallback: number | null): number | null {
  if (raw === "") return null;
  const parsed = Number(raw);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(MAX_WEIGHT, Math.max(0, parsed));
}

function parseNullableReps(raw: string, fallback: number | null): number | null {
  if (raw === "") return null;
  const parsed = Number(raw);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(MAX_REPS, Math.max(0, Math.round(parsed)));
}

interface ExerciseLoggerProps {
  exercise: LoggedExercise;
  lastPerformance: LoggedExercise | null;
  weightUnit: WeightUnit;
  onChange: (updated: LoggedExercise) => void;
  onSetCompleted: (restSeconds: number) => void;
  hasNext: boolean;
  onContinue: () => void;
  vibrationEnabled: boolean;
}

// Pure set-logging mechanics for the single exercise the focused active
// workout is currently showing (see FocusedExercise, which supplies the
// surrounding exercise identity/guide/previous-performance chrome). The
// "current" set — the first not-yet-completed one — gets a border and an
// explicit text badge rather than relying on color alone (PART 10:
// "must not rely only on color").
export default function ExerciseLogger({
  exercise,
  lastPerformance,
  weightUnit,
  onChange,
  onSetCompleted,
  hasNext,
  onContinue,
  vibrationEnabled,
}: ExerciseLoggerProps) {
  const currentSetIndex = useMemo(() => getCurrentSetIndex(exercise), [exercise]);

  function updateSet(index: number, updates: Partial<LoggedSet>) {
    const nextSets = exercise.sets.map((set, i) => (i === index ? { ...set, ...updates } : set));
    let nextExercise = { ...exercise, sets: nextSets };

    // Convenience default: once every set is complete, mark the exercise
    // complete too. Still independently overridable by the user below.
    if (updates.completed === true && nextSets.every((set) => set.completed)) {
      nextExercise = { ...nextExercise, completed: true };
    }

    onChange(nextExercise);

    if (updates.completed === true) {
      onSetCompleted(exercise.targetRestSeconds);
      if (vibrationEnabled) navigator.vibrate?.(VIBRATION_MS);
    }
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6 dark:border-slate-800 dark:bg-slate-900">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">Log your sets</p>
        <label className="flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-300">
          <input
            type="checkbox"
            checked={exercise.completed}
            onChange={(e) => onChange({ ...exercise, completed: e.target.checked })}
            className="h-5 w-5 rounded border-slate-300 accent-teal-600"
          />
          {exercise.completed ? "Exercise complete" : "Mark exercise complete"}
        </label>
      </div>

      <div className="mt-3 divide-y divide-slate-100 dark:divide-slate-800">
        {exercise.sets.map((set, index) => {
          const isCurrent = index === currentSetIndex;
          const lastSet = lastPerformance?.sets[index];
          const hasLastData = Boolean(lastSet?.completed && lastSet.weight !== null && lastSet.reps !== null);

          return (
            <div
              key={set.setNumber}
              className={`flex flex-col gap-2 py-3 first:pt-0 motion-safe:transition-colors motion-safe:duration-300 sm:flex-row sm:flex-wrap sm:items-center sm:gap-3 ${
                isCurrent
                  ? "-mx-2 rounded-xl border-l-4 border-teal-500 bg-teal-50/60 px-2 py-3 dark:bg-teal-950/20"
                  : ""
              }`}
            >
              <div className="flex items-center gap-2">
                <span className="w-14 flex-shrink-0 text-sm font-semibold text-slate-500 dark:text-slate-400">Set {set.setNumber}</span>
                {isCurrent && (
                  <span className="rounded-full bg-teal-600 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
                    Current
                  </span>
                )}
                {set.completed && (
                  <span
                    aria-hidden="true"
                    className="motion-safe:animate-scale-in flex h-4 w-4 items-center justify-center rounded-full bg-teal-600 text-[10px] font-bold text-white"
                  >
                    ✓
                  </span>
                )}
              </div>

              {hasLastData && (
                <span className="text-xs text-slate-400 dark:text-slate-500">
                  Last time: {lastSet!.weight} {weightUnit} × {lastSet!.reps}
                </span>
              )}

              <label className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                Weight ({weightUnit})
                <input
                  type="number"
                  inputMode="decimal"
                  min={0}
                  value={set.weight ?? ""}
                  onChange={(e) => updateSet(index, { weight: parseNullableWeight(e.target.value, set.weight) })}
                  className="w-20 rounded-lg border border-slate-200 px-2 py-2 text-sm text-slate-800 focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/30 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                />
              </label>
              <label className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                Reps
                <input
                  type="number"
                  inputMode="numeric"
                  min={0}
                  value={set.reps ?? ""}
                  onChange={(e) => updateSet(index, { reps: parseNullableReps(e.target.value, set.reps) })}
                  className="w-16 rounded-lg border border-slate-200 px-2 py-2 text-sm text-slate-800 focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/30 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                />
              </label>
              <label className="ml-auto flex items-center gap-1.5 text-xs font-medium text-slate-600 dark:text-slate-300">
                <input
                  type="checkbox"
                  checked={set.completed}
                  onChange={(e) => updateSet(index, { completed: e.target.checked })}
                  className="h-5 w-5 rounded border-slate-300 accent-teal-600"
                />
                {set.completed ? "Completed" : "Mark complete"}
              </label>
            </div>
          );
        })}
      </div>

      <label className="mt-4 block text-xs font-medium text-slate-500 dark:text-slate-400">
        Note (optional)
        <textarea
          value={exercise.note}
          onChange={(e) => onChange({ ...exercise, note: e.target.value })}
          rows={2}
          maxLength={500}
          placeholder="e.g. felt strong, form broke down on the last rep..."
          className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/30 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
        />
      </label>

      {exercise.completed && hasNext && (
        <button
          type="button"
          onClick={onContinue}
          className="motion-safe:animate-step-in mt-4 w-full rounded-lg bg-teal-600 px-4 py-3 text-sm font-semibold text-white shadow-sm transition active:scale-95 hover:bg-teal-700"
        >
          Continue to next exercise →
        </button>
      )}
    </div>
  );
}
