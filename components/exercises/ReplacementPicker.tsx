"use client";

import { useMemo, useRef, useState } from "react";
import type { Equipment, ReplacementCandidate } from "@/types/exercises";
import { MUSCLE_GROUP_LABELS } from "@/types/exercises";
import { rankReplacements } from "@/lib/exercises/replacement";
import { useFocusTrap } from "@/lib/useFocusTrap";

interface ReplacementPickerProps {
  exerciseName: string;
  availableEquipment?: Equipment[];
  excludeNames?: string[];
  onSelect: (candidate: ReplacementCandidate) => void;
  onCancel: () => void;
}

// Replaces the old single-click random swap (lib/exercise-substitutions.ts
// #getSubstitute, still used by lib/templates.ts unrelated to this flow)
// with a ranked list from lib/exercises/replacement.ts — PART 3's "rank
// replacements by quality" and "regenerate replacements" (the Regenerate
// button just re-runs the same deterministic ranking with the current
// exclude list, which is what makes repeated clicks show *different*
// options without ever picking something unrelated).
export default function ReplacementPicker({ exerciseName, availableEquipment, excludeNames, onSelect, onCancel }: ReplacementPickerProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  useFocusTrap(dialogRef, true);
  const [excluded, setExcluded] = useState<string[]>(excludeNames ?? []);

  const candidates = useMemo(
    () => rankReplacements(exerciseName, { availableEquipment, excludeNames: excluded, limit: 6 }),
    [exerciseName, availableEquipment, excluded]
  );

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Escape") onCancel();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 px-4" role="presentation" onClick={onCancel} onKeyDown={handleKeyDown}>
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="replacement-picker-title"
        onClick={(e) => e.stopPropagation()}
        className="flex max-h-[85vh] w-full max-w-md flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-lg"
      >
        <div className="border-b border-slate-100 p-5 sm:p-6">
          <h3 id="replacement-picker-title" className="text-lg font-semibold text-slate-900">
            Replace {exerciseName}
          </h3>
          <p className="mt-1 text-sm text-slate-500">Ranked by how closely each keeps the same muscle, movement, and difficulty.</p>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {candidates.length === 0 ? (
            <p className="p-2 text-sm text-slate-400">No close alternatives found for this exercise.</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {candidates.map((candidate) => (
                <li key={candidate.exercise.id}>
                  <button
                    type="button"
                    onClick={() => onSelect(candidate)}
                    className="flex w-full items-center justify-between gap-3 rounded-xl border border-slate-200 p-3 text-left transition hover:border-teal-300 hover:bg-teal-50/50"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-slate-900">{candidate.exercise.name}</p>
                      <p className="mt-0.5 text-xs text-slate-500">
                        {MUSCLE_GROUP_LABELS[candidate.exercise.primaryMuscle]} · {candidate.matchedOn.join(", ")}
                      </p>
                    </div>
                    <span className="flex-shrink-0 rounded-full bg-teal-100 px-2 py-1 text-xs font-semibold text-teal-800">
                      {candidate.score}% match
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="flex flex-wrap justify-between gap-2 border-t border-slate-100 p-4">
          <button
            type="button"
            onClick={() => setExcluded((prev) => [...prev, ...candidates.map((c) => c.exercise.name)])}
            disabled={candidates.length === 0}
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Regenerate
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
