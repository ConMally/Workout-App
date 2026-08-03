"use client";

import { useMemo, useRef, useState } from "react";
import type { Equipment, ExerciseDefinition } from "@/types/exercises";
import { MUSCLE_GROUP_LABELS } from "@/types/exercises";
import { listAllExercises } from "@/lib/exercises/library";
import { searchExercises } from "@/lib/exercises/search";
import { useFocusTrap } from "@/lib/useFocusTrap";

interface AddExerciseDialogProps {
  availableEquipment?: Equipment[];
  onSelect: (exercise: ExerciseDefinition) => void;
  onCancel: () => void;
}

// Minimal library search scoped to "pick one exercise to add to this day"
// — reuses lib/exercises/search.ts's same searchExercises used by the full
// ExerciseLibraryBrowser, just with a simpler single-query UI since a full
// filter panel would be overkill inside an already-open plan editor.
export default function AddExerciseDialog({ availableEquipment, onSelect, onCancel }: AddExerciseDialogProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  useFocusTrap(dialogRef, true);
  const [query, setQuery] = useState("");

  const allExercises = useMemo(() => listAllExercises(), []);
  const results = useMemo(() => {
    const matches = searchExercises({ query, muscle: "all", equipment: "all", difficulty: "all", movementPattern: "all" }, allExercises);
    if (!availableEquipment) return matches.slice(0, 20);
    // Equipment-compatible results first, but never hidden entirely.
    return [...matches]
      .sort((a, b) => Number(b.equipment.some((e) => availableEquipment.includes(e))) - Number(a.equipment.some((e) => availableEquipment.includes(e))))
      .slice(0, 20);
  }, [query, allExercises, availableEquipment]);

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Escape") onCancel();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 px-4" role="presentation" onClick={onCancel} onKeyDown={handleKeyDown}>
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="add-exercise-title"
        onClick={(e) => e.stopPropagation()}
        className="flex max-h-[85vh] w-full max-w-md flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-lg"
      >
        <div className="border-b border-slate-100 p-5 sm:p-6">
          <h3 id="add-exercise-title" className="text-lg font-semibold text-slate-900">
            Add exercise
          </h3>
          <label htmlFor="add-exercise-search" className="sr-only">
            Search exercises
          </label>
          <input
            id="add-exercise-search"
            type="search"
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by name or muscle…"
            className="mt-3 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/30"
          />
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {results.length === 0 ? (
            <p className="p-2 text-sm text-slate-400">No exercises match.</p>
          ) : (
            <ul className="flex flex-col gap-1">
              {results.map((exercise) => (
                <li key={exercise.id}>
                  <button
                    type="button"
                    onClick={() => onSelect(exercise)}
                    className="flex w-full items-center justify-between gap-3 rounded-lg p-2.5 text-left transition hover:bg-teal-50"
                  >
                    <span className="truncate text-sm font-medium text-slate-800">{exercise.name}</span>
                    <span className="flex-shrink-0 text-xs text-slate-400">{MUSCLE_GROUP_LABELS[exercise.primaryMuscle]}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="flex justify-end border-t border-slate-100 p-4">
          <button type="button" onClick={onCancel} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50">
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
