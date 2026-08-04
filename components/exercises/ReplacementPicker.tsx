"use client";

import { useMemo, useState } from "react";
import type { Equipment, ReplacementCandidate } from "@/types/exercises";
import { MUSCLE_GROUP_LABELS } from "@/types/exercises";
import { rankReplacements } from "@/lib/exercises/replacement";
import Dialog from "@/components/ui/Dialog";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";

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
  const [excluded, setExcluded] = useState<string[]>(excludeNames ?? []);

  const candidates = useMemo(
    () => rankReplacements(exerciseName, { availableEquipment, excludeNames: excluded, limit: 6 }),
    [exerciseName, availableEquipment, excluded]
  );

  return (
    <Dialog onClose={onCancel} titleId="replacement-picker-title" className="max-h-[85vh] max-w-md">
      <div className="border-b border-border p-5 sm:p-6">
        <h3 id="replacement-picker-title" className="text-section-heading text-text-primary">
          Replace {exerciseName}
        </h3>
        <p className="mt-1 text-supporting">Ranked by how closely each keeps the same muscle, movement, and difficulty.</p>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {candidates.length === 0 ? (
          <p className="p-2 text-sm text-text-muted">No close alternatives found for this exercise.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {candidates.map((candidate) => (
              <li key={candidate.exercise.id}>
                <button
                  type="button"
                  onClick={() => onSelect(candidate)}
                  className="flex w-full items-center justify-between gap-3 rounded-[var(--card-radius)] border border-border p-3 text-left transition hover:border-accent/40 hover:bg-accent-soft/50"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-text-primary">{candidate.exercise.name}</p>
                    <p className="mt-0.5 text-xs text-text-muted">
                      {MUSCLE_GROUP_LABELS[candidate.exercise.primaryMuscle]} · {candidate.matchedOn.join(", ")}
                    </p>
                  </div>
                  <Badge tone="accent" className="flex-shrink-0">
                    {candidate.score}% match
                  </Badge>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="flex flex-wrap justify-between gap-2 border-t border-border p-4">
        <Button
          type="button"
          variant="secondary"
          onClick={() => setExcluded((prev) => [...prev, ...candidates.map((c) => c.exercise.name)])}
          disabled={candidates.length === 0}
        >
          Regenerate
        </Button>
        <Button type="button" variant="secondary" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </Dialog>
  );
}
