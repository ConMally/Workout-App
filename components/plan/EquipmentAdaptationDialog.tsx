"use client";

import { useMemo, useState } from "react";
import type { WorkoutPlan } from "@/types/workout";
import type { EquipmentGap, EquipmentProfileId } from "@/types/exercises";
import { EQUIPMENT_PROFILES, findEquipmentGaps, getEquipmentProfile } from "@/lib/exercises/equipment";
import Dialog from "@/components/ui/Dialog";
import Button from "@/components/ui/Button";

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

  return (
    <Dialog onClose={onCancel} titleId="equipment-dialog-title" className="max-h-[85vh] max-w-md">
      <div className="border-b border-border p-5 sm:p-6">
        <h3 id="equipment-dialog-title" className="text-section-heading text-text-primary">
          Change equipment
        </h3>
        <label className="mt-3 flex flex-col gap-1 text-sm font-medium text-text-secondary">
          Available equipment
          <select
            value={profileId}
            onChange={(e) => {
              setProfileId(e.target.value as EquipmentProfileId);
              setAccepted(new Set());
            }}
            className="h-[var(--control-height)] rounded-[var(--control-radius)] border border-border bg-surface px-3 text-sm text-text-primary focus:border-accent focus:outline-none focus:ring-2 focus:ring-focus-ring/30"
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
          <p className="p-2 text-sm text-text-secondary">Every exercise in this plan works with {profile.label.toLowerCase()}.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {gaps.map((gap) => (
              <li key={gap.exerciseName} className="rounded-[var(--card-radius)] border border-border p-3">
                <p className="text-sm font-semibold text-text-primary">{gap.exerciseName}</p>
                <p className="mt-0.5 text-xs text-text-muted">{gap.reason}</p>
                {gap.replacement ? (
                  <label className="mt-2 flex items-center gap-2 text-sm text-text-secondary">
                    <input
                      type="checkbox"
                      checked={accepted.has(gap.exerciseName)}
                      onChange={() => toggleAccepted(gap.exerciseName)}
                      className="h-4 w-4 rounded border-border text-accent focus:ring-focus-ring"
                    />
                    Replace with <span className="font-semibold">{gap.replacement.exercise.name}</span>
                  </label>
                ) : (
                  <p className="mt-2 text-xs text-text-muted">No compatible replacement found.</p>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="flex flex-wrap justify-end gap-2 border-t border-border p-4">
        <Button type="button" variant="secondary" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="button" variant="primary" onClick={handleApply} disabled={accepted.size === 0}>
          Apply {accepted.size > 0 ? `(${accepted.size})` : ""}
        </Button>
      </div>
    </Dialog>
  );
}
