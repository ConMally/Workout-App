"use client";

import { useMemo, useRef, useState } from "react";
import type { WorkoutPlan } from "@/types/workout";
import type { EquipmentGap, EquipmentProfileId } from "@/types/exercises";
import { EQUIPMENT_PROFILES, findEquipmentGaps, getEquipmentProfile } from "@/lib/exercises/equipment";
import { useFocusTrap } from "@/lib/useFocusTrap";

interface EquipmentAdaptationDialogProps {
  plan: WorkoutPlan;
  onApply: (replacements: { exerciseName: string; newName: string }[]) => void;
  onCancel: () => void;
}

// PART 6: pick a named equipment profile, immediately see which current
// exercises it can't support, and accept the suggested replacement for
// each (or leave it — this never force-replaces anything the user didn't
// approve).
export default function EquipmentAdaptationDialog({ plan, onApply, onCancel }: EquipmentAdaptationDialogProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  useFocusTrap(dialogRef, true);

  const [profileId, setProfileId] = useState<EquipmentProfileId>("commercial_gym");
  const [accepted, setAccepted] = useState<Set<string>>(new Set());

  const profile = getEquipmentProfile(profileId);
  const gaps: EquipmentGap[] = useMemo(() => findEquipmentGaps(plan, profile.equipment), [plan, profile]);

  function toggleAccepted(exerciseName: string) {
    setAccepted((prev) => {
      const next = new Set(prev);
      if (next.has(exerciseName)) next.delete(exerciseName);
      else next.add(exerciseName);
      return next;
    });
  }

  function handleApply() {
    const replacements = gaps
      .filter((gap) => accepted.has(gap.exerciseName) && gap.replacement)
      .map((gap) => ({ exerciseName: gap.exerciseName, newName: gap.replacement!.exercise.name }));
    onApply(replacements);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Escape") onCancel();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 px-4" role="presentation" onClick={onCancel} onKeyDown={handleKeyDown}>
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="equipment-dialog-title"
        onClick={(e) => e.stopPropagation()}
        className="flex max-h-[85vh] w-full max-w-md flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-lg"
      >
        <div className="border-b border-slate-100 p-5 sm:p-6">
          <h3 id="equipment-dialog-title" className="text-lg font-semibold text-slate-900">
            Change equipment
          </h3>
          <label className="mt-3 flex flex-col gap-1 text-sm font-medium text-slate-700">
            Available equipment
            <select
              value={profileId}
              onChange={(e) => {
                setProfileId(e.target.value as EquipmentProfileId);
                setAccepted(new Set());
              }}
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/30"
            >
              {EQUIPMENT_PROFILES.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.label}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {gaps.length === 0 ? (
            <p className="p-2 text-sm text-slate-500">Every exercise in this plan works with {profile.label.toLowerCase()}.</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {gaps.map((gap) => (
                <li key={gap.exerciseName} className="rounded-xl border border-slate-200 p-3">
                  <p className="text-sm font-semibold text-slate-800">{gap.exerciseName}</p>
                  <p className="mt-0.5 text-xs text-slate-500">{gap.reason}</p>
                  {gap.replacement ? (
                    <label className="mt-2 flex items-center gap-2 text-sm text-slate-700">
                      <input
                        type="checkbox"
                        checked={accepted.has(gap.exerciseName)}
                        onChange={() => toggleAccepted(gap.exerciseName)}
                        className="h-4 w-4 rounded border-slate-300 text-teal-600 focus:ring-teal-500"
                      />
                      Replace with <span className="font-semibold">{gap.replacement.exercise.name}</span>
                    </label>
                  ) : (
                    <p className="mt-2 text-xs text-slate-400">No compatible replacement found.</p>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="flex flex-wrap justify-end gap-2 border-t border-slate-100 p-4">
          <button type="button" onClick={onCancel} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50">
            Cancel
          </button>
          <button
            type="button"
            onClick={handleApply}
            disabled={accepted.size === 0}
            className="rounded-lg bg-teal-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Apply {accepted.size > 0 ? `(${accepted.size})` : ""}
          </button>
        </div>
      </div>
    </div>
  );
}
