"use client";

import { useMemo, useState } from "react";
import type { ExerciseDefinition } from "@/types/exercises";
import { MOVEMENT_PATTERN_LABELS, MUSCLE_GROUP_LABELS } from "@/types/exercises";
import { listAllExercises } from "@/lib/exercises/library";
import { compareExercises } from "@/lib/exercises/comparison";
import Dialog from "@/components/ui/Dialog";

interface ExerciseComparisonModalProps {
  initialExercise: ExerciseDefinition;
  onClose: () => void;
}

const EMPHASIS_LABEL: Record<"higher" | "similar" | "lower", string> = {
  higher: "Higher",
  similar: "Similar",
  lower: "Lower",
};

export default function ExerciseComparisonModal({ initialExercise, onClose }: ExerciseComparisonModalProps) {
  const allExercises = useMemo(() => listAllExercises(), []);
  const [otherId, setOtherId] = useState<string>(allExercises.find((e) => e.id !== initialExercise.id)?.id ?? initialExercise.id);
  const other = allExercises.find((e) => e.id === otherId) ?? initialExercise;

  const comparison = useMemo(() => compareExercises(initialExercise, other), [initialExercise, other]);

  return (
    <Dialog onClose={onClose} titleId="comparison-title" className="max-h-[85vh] max-w-lg">
      <div className="flex items-start justify-between gap-3 border-b border-border p-5 sm:p-6">
        <h3 id="comparison-title" className="text-section-heading text-text-primary">
          Compare exercises
        </h3>
        <button type="button" onClick={onClose} aria-label="Close" className="rounded-[var(--control-radius)] p-1.5 text-text-muted transition hover:bg-surface-muted hover:text-text-secondary">
          ✕
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-5 sm:p-6">
        <div className="grid grid-cols-2 gap-3">
          <p className="truncate text-sm font-bold text-text-primary">{initialExercise.name}</p>
          <label className="flex flex-col gap-1 text-sm">
            <span className="sr-only">Compare against</span>
            <select
              value={otherId}
              onChange={(e) => setOtherId(e.target.value)}
              className="rounded-[var(--control-radius)] border border-border bg-surface px-2 py-1 text-sm text-text-primary focus:border-accent focus:outline-none focus:ring-2 focus:ring-focus-ring/30"
            >
              {allExercises
                .filter((e) => e.id !== initialExercise.id)
                .map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.name}
                  </option>
                ))}
            </select>
          </label>
        </div>

        <dl className="mt-4 flex flex-col divide-y divide-border">
          <Row label="Primary muscle" a={MUSCLE_GROUP_LABELS[initialExercise.primaryMuscle]} b={MUSCLE_GROUP_LABELS[other.primaryMuscle]} highlight={comparison.sameMuscle} />
          <Row label="Movement pattern" a={MOVEMENT_PATTERN_LABELS[initialExercise.movementPattern]} b={MOVEMENT_PATTERN_LABELS[other.movementPattern]} highlight={comparison.sameMovementPattern} />
          <Row label="Difficulty" a={initialExercise.difficulty} b={other.difficulty} />
          <Row label="Equipment" a={initialExercise.equipment.join(", ")} b={other.equipment.join(", ")} />
          <Row label="Strength emphasis" a={EMPHASIS_LABEL[comparison.strengthEmphasis.a]} b="—" />
          <Row label="Hypertrophy emphasis" a={EMPHASIS_LABEL[comparison.hypertrophyEmphasis.a]} b="—" />
          <Row label="Fatigue cost" a={EMPHASIS_LABEL[comparison.fatigueEstimate.a]} b="—" />
          <Row label="Recommended for" a={comparison.recommendedGoals.a.join(", ")} b={comparison.recommendedGoals.b.join(", ")} />
        </dl>
        <p className="mt-3 text-xs text-text-muted">
          &quot;Strength/hypertrophy emphasis&quot; and &quot;fatigue cost&quot; are relative estimates ({initialExercise.name} vs. {other.name}), not exact measurements.
        </p>
      </div>
    </Dialog>
  );
}

function Row({ label, a, b, highlight }: { label: string; a: string; b: string; highlight?: boolean }) {
  return (
    <div className={`grid grid-cols-3 gap-2 py-2 text-sm ${highlight ? "font-semibold text-accent" : "text-text-secondary"}`}>
      <dt className="col-span-1 text-xs font-medium uppercase tracking-wide text-text-muted">{label}</dt>
      <dd className="col-span-1 truncate capitalize">{a}</dd>
      <dd className="col-span-1 truncate capitalize">{b}</dd>
    </div>
  );
}
