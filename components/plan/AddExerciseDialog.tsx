"use client";

import { useMemo, useState } from "react";
import type { Equipment, ExerciseDefinition } from "@/types/exercises";
import { MUSCLE_GROUP_LABELS } from "@/types/exercises";
import { listAllExercises } from "@/lib/exercises/library";
import { searchExercises } from "@/lib/exercises/search";
import Dialog from "@/components/ui/Dialog";
import Button from "@/components/ui/Button";

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

  return (
    <Dialog onClose={onCancel} titleId="add-exercise-title" className="max-h-[85vh] max-w-md">
      <div className="border-b border-border p-5 sm:p-6">
        <h3 id="add-exercise-title" className="text-section-heading text-text-primary">
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
          className="mt-3 h-[var(--control-height)] w-full rounded-[var(--control-radius)] border border-border bg-surface px-3 text-sm text-text-primary focus:border-accent focus:outline-none focus:ring-2 focus:ring-focus-ring/30"
        />
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {results.length === 0 ? (
          <p className="p-2 text-sm text-text-muted">No exercises match.</p>
        ) : (
          <ul className="flex flex-col gap-1">
            {results.map((exercise) => (
              <li key={exercise.id}>
                <button
                  type="button"
                  onClick={() => onSelect(exercise)}
                  className="flex w-full items-center justify-between gap-3 rounded-[var(--control-radius)] p-2.5 text-left transition hover:bg-accent-soft"
                >
                  <span className="truncate text-sm font-medium text-text-primary">{exercise.name}</span>
                  <span className="flex-shrink-0 text-xs text-text-muted">{MUSCLE_GROUP_LABELS[exercise.primaryMuscle]}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="flex justify-end border-t border-border p-4">
        <Button type="button" variant="secondary" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </Dialog>
  );
}
