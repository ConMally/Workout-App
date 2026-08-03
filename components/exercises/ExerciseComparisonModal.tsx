"use client";

import { useMemo, useRef, useState } from "react";
import type { ExerciseDefinition } from "@/types/exercises";
import { MUSCLE_GROUP_LABELS } from "@/types/exercises";
import { listAllExercises } from "@/lib/exercises/library";
import { compareExercises } from "@/lib/exercises/comparison";
import { useFocusTrap } from "@/lib/useFocusTrap";

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
  const dialogRef = useRef<HTMLDivElement>(null);
  useFocusTrap(dialogRef, true);

  const allExercises = useMemo(() => listAllExercises(), []);
  const [otherId, setOtherId] = useState<string>(allExercises.find((e) => e.id !== initialExercise.id)?.id ?? initialExercise.id);
  const other = allExercises.find((e) => e.id === otherId) ?? initialExercise;

  const comparison = useMemo(() => compareExercises(initialExercise, other), [initialExercise, other]);

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Escape") onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 px-4" role="presentation" onClick={onClose} onKeyDown={handleKeyDown}>
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="comparison-title"
        onClick={(e) => e.stopPropagation()}
        className="flex max-h-[85vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-lg"
      >
        <div className="flex items-start justify-between gap-3 border-b border-slate-100 p-5 sm:p-6">
          <h3 id="comparison-title" className="text-lg font-semibold text-slate-900">
            Compare exercises
          </h3>
          <button type="button" onClick={onClose} aria-label="Close" className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600">
            ✕
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 sm:p-6">
          <div className="grid grid-cols-2 gap-3">
            <p className="truncate text-sm font-bold text-slate-900">{initialExercise.name}</p>
            <label className="flex flex-col gap-1 text-sm">
              <span className="sr-only">Compare against</span>
              <select
                value={otherId}
                onChange={(e) => setOtherId(e.target.value)}
                className="rounded-lg border border-slate-200 px-2 py-1 text-sm text-slate-800 focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/30"
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

          <dl className="mt-4 flex flex-col divide-y divide-slate-100">
            <Row label="Primary muscle" a={MUSCLE_GROUP_LABELS[initialExercise.primaryMuscle]} b={MUSCLE_GROUP_LABELS[other.primaryMuscle]} highlight={comparison.sameMuscle} />
            <Row label="Movement pattern" a={initialExercise.movementPattern.replace(/_/g, " ")} b={other.movementPattern.replace(/_/g, " ")} highlight={comparison.sameMovementPattern} />
            <Row label="Difficulty" a={initialExercise.difficulty} b={other.difficulty} />
            <Row label="Equipment" a={initialExercise.equipment.join(", ")} b={other.equipment.join(", ")} />
            <Row label="Strength emphasis" a={EMPHASIS_LABEL[comparison.strengthEmphasis.a]} b="—" />
            <Row label="Hypertrophy emphasis" a={EMPHASIS_LABEL[comparison.hypertrophyEmphasis.a]} b="—" />
            <Row label="Fatigue cost" a={EMPHASIS_LABEL[comparison.fatigueEstimate.a]} b="—" />
            <Row label="Recommended for" a={comparison.recommendedGoals.a.join(", ")} b={comparison.recommendedGoals.b.join(", ")} />
          </dl>
          <p className="mt-3 text-xs text-slate-400">
            &quot;Strength/hypertrophy emphasis&quot; and &quot;fatigue cost&quot; are relative estimates ({initialExercise.name} vs. {other.name}), not exact measurements.
          </p>
        </div>
      </div>
    </div>
  );
}

function Row({ label, a, b, highlight }: { label: string; a: string; b: string; highlight?: boolean }) {
  return (
    <div className={`grid grid-cols-3 gap-2 py-2 text-sm ${highlight ? "font-semibold text-teal-700" : "text-slate-700"}`}>
      <dt className="col-span-1 text-xs font-medium uppercase tracking-wide text-slate-400">{label}</dt>
      <dd className="col-span-1 truncate capitalize">{a}</dd>
      <dd className="col-span-1 truncate capitalize">{b}</dd>
    </div>
  );
}
