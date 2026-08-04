"use client";

import { useMemo, useState } from "react";
import type { WorkoutPlan } from "@/types/workout";
import type { Equipment, ExerciseDefinition, ReplacementCandidate } from "@/types/exercises";
import { moveItem } from "@/lib/templates";
import { getDayEditingSuggestions } from "@/lib/exercises/suggestions";
import AddExerciseDialog from "./AddExerciseDialog";
import ReplacementPicker from "@/components/exercises/ReplacementPicker";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";

const FIELD_CLASS =
  "rounded-[var(--control-radius)] border border-border bg-surface px-2.5 py-1.5 text-sm text-text-primary focus:border-accent focus:outline-none focus:ring-2 focus:ring-focus-ring/30";
const ICON_BUTTON_CLASS =
  "rounded-md border border-border px-1.5 py-0.5 text-xs text-text-secondary transition hover:bg-surface-muted disabled:cursor-not-allowed disabled:opacity-30";

type TrainingDay = WorkoutPlan["weeklySchedule"][number];
type PlanExercise = TrainingDay["exercises"][number];

interface PlanEditorProps {
  plan: WorkoutPlan;
  availableEquipment?: Equipment[];
  onSave: (weeklySchedule: TrainingDay[]) => void;
  onCancel: () => void;
  submitting: boolean;
}

function exerciseFromDefinition(definition: ExerciseDefinition): PlanExercise {
  return {
    name: definition.name,
    sets: 3,
    reps: `${definition.recommendedRepRange.min}-${definition.recommendedRepRange.max}`,
    restSeconds: Math.round((definition.recommendedRestSeconds.min + definition.recommendedRestSeconds.max) / 2),
    notes: "",
  };
}

// Full plan editing (PART 4): add/remove/duplicate/move exercises, move
// entire days, rename days, change sets/reps/rest/notes, and replace an
// exercise via the ranked picker (PART 3) instead of the old one-click
// random swap. Saving hands the edited weeklySchedule back to the caller
// (app/page.tsx), which persists it through the existing
// PlanRepository#updateActivePlan — no new repository method, no new
// storage shape (PART 4: "preserve exercise ordering", "preserve
// templates" — this never touches template data at all).
export default function PlanEditor({ plan, availableEquipment, onSave, onCancel, submitting }: PlanEditorProps) {
  const [days, setDays] = useState<TrainingDay[]>(plan.weeklySchedule);
  const [addingToDay, setAddingToDay] = useState<number | null>(null);
  const [replacingIn, setReplacingIn] = useState<{ dayIndex: number; exerciseIndex: number } | null>(null);

  function updateDay(index: number, patch: Partial<TrainingDay>) {
    setDays((prev) => prev.map((d, i) => (i === index ? { ...d, ...patch } : d)));
  }

  function moveDay(index: number, direction: "up" | "down") {
    setDays((prev) => moveItem(prev, index, direction));
  }

  function updateExercise(dayIndex: number, exerciseIndex: number, patch: Partial<PlanExercise>) {
    setDays((prev) =>
      prev.map((day, i) =>
        i !== dayIndex ? day : { ...day, exercises: day.exercises.map((ex, j) => (j === exerciseIndex ? { ...ex, ...patch } : ex)) }
      )
    );
  }

  function moveExercise(dayIndex: number, exerciseIndex: number, direction: "up" | "down") {
    setDays((prev) => prev.map((day, i) => (i !== dayIndex ? day : { ...day, exercises: moveItem(day.exercises, exerciseIndex, direction) })));
  }

  function removeExercise(dayIndex: number, exerciseIndex: number) {
    setDays((prev) => prev.map((day, i) => (i !== dayIndex ? day : { ...day, exercises: day.exercises.filter((_, j) => j !== exerciseIndex) })));
  }

  function duplicateExercise(dayIndex: number, exerciseIndex: number) {
    setDays((prev) =>
      prev.map((day, i) => {
        if (i !== dayIndex) return day;
        const copy = { ...day.exercises[exerciseIndex] };
        const exercises = [...day.exercises];
        exercises.splice(exerciseIndex + 1, 0, copy);
        return { ...day, exercises };
      })
    );
  }

  function addExercise(dayIndex: number, definition: ExerciseDefinition) {
    setDays((prev) => prev.map((day, i) => (i !== dayIndex ? day : { ...day, exercises: [...day.exercises, exerciseFromDefinition(definition)] })));
    setAddingToDay(null);
  }

  function applyReplacement(candidate: ReplacementCandidate) {
    if (!replacingIn) return;
    updateExercise(replacingIn.dayIndex, replacingIn.exerciseIndex, { name: candidate.exercise.name });
    setReplacingIn(null);
  }

  function handleSave() {
    onSave(days.map((day, i) => ({ ...day, day: day.day || `Day ${i + 1}` })));
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-page-title text-text-primary">Edit plan</h2>
          <p className="mt-0.5 text-supporting">Add, remove, reorder, or replace exercises and days.</p>
        </div>
      </div>

      <div className="flex flex-col gap-4">
        {days.map((day, dayIndex) => (
          <PlanDayEditorCard
            key={dayIndex}
            day={day}
            index={dayIndex}
            count={days.length}
            onRename={(title) => updateDay(dayIndex, { title })}
            onMove={(direction) => moveDay(dayIndex, direction)}
            onAddExercise={() => setAddingToDay(dayIndex)}
            onRemoveExercise={(exerciseIndex) => removeExercise(dayIndex, exerciseIndex)}
            onDuplicateExercise={(exerciseIndex) => duplicateExercise(dayIndex, exerciseIndex)}
            onMoveExercise={(exerciseIndex, direction) => moveExercise(dayIndex, exerciseIndex, direction)}
            onReplaceExercise={(exerciseIndex) => setReplacingIn({ dayIndex, exerciseIndex })}
            onUpdateExercise={(exerciseIndex, patch) => updateExercise(dayIndex, exerciseIndex, patch)}
          />
        ))}
      </div>

      <div className="flex flex-wrap justify-end gap-2">
        <Button type="button" variant="secondary" onClick={onCancel} disabled={submitting}>
          Cancel
        </Button>
        <Button type="button" variant="primary" onClick={handleSave} loading={submitting}>
          {submitting ? "Saving…" : "Save changes"}
        </Button>
      </div>

      {addingToDay !== null && (
        <AddExerciseDialog availableEquipment={availableEquipment} onSelect={(def) => addExercise(addingToDay, def)} onCancel={() => setAddingToDay(null)} />
      )}

      {replacingIn && (
        <ReplacementPicker
          exerciseName={days[replacingIn.dayIndex].exercises[replacingIn.exerciseIndex].name}
          availableEquipment={availableEquipment}
          excludeNames={days[replacingIn.dayIndex].exercises.map((e) => e.name)}
          onSelect={applyReplacement}
          onCancel={() => setReplacingIn(null)}
        />
      )}
    </div>
  );
}

interface PlanDayEditorCardProps {
  day: TrainingDay;
  index: number;
  count: number;
  onRename: (title: string) => void;
  onMove: (direction: "up" | "down") => void;
  onAddExercise: () => void;
  onRemoveExercise: (exerciseIndex: number) => void;
  onDuplicateExercise: (exerciseIndex: number) => void;
  onMoveExercise: (exerciseIndex: number, direction: "up" | "down") => void;
  onReplaceExercise: (exerciseIndex: number) => void;
  onUpdateExercise: (exerciseIndex: number, patch: Partial<PlanExercise>) => void;
}

function PlanDayEditorCard({
  day,
  index,
  count,
  onRename,
  onMove,
  onAddExercise,
  onRemoveExercise,
  onDuplicateExercise,
  onMoveExercise,
  onReplaceExercise,
  onUpdateExercise,
}: PlanDayEditorCardProps) {
  // Live smart suggestions (PART 5) — recomputed from this day's current
  // exercise list on every edit, not just at save time.
  const suggestions = useMemo(() => getDayEditingSuggestions(day), [day]);

  return (
    <Card padded className="sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <label className="flex flex-1 flex-col gap-1 text-xs font-medium text-text-secondary">
          Day name
          <input
            type="text"
            value={day.title}
            onChange={(e) => onRename(e.target.value)}
            maxLength={120}
            className={`${FIELD_CLASS} font-semibold`}
          />
        </label>
        <div className="flex flex-col gap-0.5">
          <button type="button" onClick={() => onMove("up")} disabled={index === 0} aria-label={`Move ${day.title} up`} className={ICON_BUTTON_CLASS}>
            ↑
          </button>
          <button type="button" onClick={() => onMove("down")} disabled={index === count - 1} aria-label={`Move ${day.title} down`} className={ICON_BUTTON_CLASS}>
            ↓
          </button>
        </div>
      </div>

      {suggestions.length > 0 && (
        <ul className="mt-3 flex flex-col gap-1.5">
          {suggestions.map((s) => (
            <li key={s.id} className="rounded-[var(--control-radius)] bg-warning-soft px-3 py-1.5 text-xs text-warning">
              <span className="font-semibold">{s.message}</span> {s.explanation}
            </li>
          ))}
        </ul>
      )}

      <div className="mt-3 flex flex-col gap-2">
        {day.exercises.map((exercise, exerciseIndex) => (
          <div key={exerciseIndex} className="grid grid-cols-2 gap-2 rounded-[var(--control-radius)] border border-border bg-surface-muted/60 p-3 sm:grid-cols-6">
            <div className="col-span-2 flex flex-col gap-1 text-xs font-medium text-text-secondary sm:col-span-2">
              Exercise
              <p className="truncate rounded-[var(--control-radius)] border border-transparent px-2.5 py-1.5 text-sm font-semibold text-text-primary">{exercise.name}</p>
            </div>
            <label className="flex flex-col gap-1 text-xs font-medium text-text-secondary">
              Sets
              <input type="number" min={1} max={10} value={exercise.sets} onChange={(e) => onUpdateExercise(exerciseIndex, { sets: Number(e.target.value) })} className={FIELD_CLASS} />
            </label>
            <label className="flex flex-col gap-1 text-xs font-medium text-text-secondary">
              Reps
              <input type="text" value={exercise.reps} onChange={(e) => onUpdateExercise(exerciseIndex, { reps: e.target.value })} maxLength={20} className={FIELD_CLASS} />
            </label>
            <label className="flex flex-col gap-1 text-xs font-medium text-text-secondary">
              Rest (s)
              <input type="number" min={0} max={600} value={exercise.restSeconds} onChange={(e) => onUpdateExercise(exerciseIndex, { restSeconds: Number(e.target.value) })} className={FIELD_CLASS} />
            </label>

            <div className="col-span-2 flex flex-wrap items-end gap-1 sm:col-span-6">
              <div className="flex flex-col gap-0.5">
                <button type="button" onClick={() => onMoveExercise(exerciseIndex, "up")} disabled={exerciseIndex === 0} aria-label={`Move ${exercise.name} up`} className={ICON_BUTTON_CLASS}>
                  ↑
                </button>
                <button type="button" onClick={() => onMoveExercise(exerciseIndex, "down")} disabled={exerciseIndex === day.exercises.length - 1} aria-label={`Move ${exercise.name} down`} className={ICON_BUTTON_CLASS}>
                  ↓
                </button>
              </div>
              <Button type="button" variant="ghost" size="sm" onClick={() => onReplaceExercise(exerciseIndex)} className="h-auto px-2.5 py-1.5 text-xs">
                Replace
              </Button>
              <Button type="button" variant="ghost" size="sm" onClick={() => onDuplicateExercise(exerciseIndex)} className="h-auto px-2.5 py-1.5 text-xs">
                Duplicate
              </Button>
              <button
                type="button"
                onClick={() => onRemoveExercise(exerciseIndex)}
                disabled={day.exercises.length <= 1}
                aria-label={`Remove ${exercise.name}`}
                className="rounded-[var(--control-radius)] border border-border px-2.5 py-1.5 text-xs font-medium text-text-secondary transition hover:border-danger/40 hover:bg-danger-soft hover:text-danger disabled:cursor-not-allowed disabled:opacity-40"
              >
                Remove
              </button>
            </div>

            <label className="col-span-2 flex flex-col gap-1 text-xs font-medium text-text-secondary sm:col-span-6">
              Notes (optional)
              <input type="text" value={exercise.notes} onChange={(e) => onUpdateExercise(exerciseIndex, { notes: e.target.value })} maxLength={2000} className={FIELD_CLASS} />
            </label>
          </div>
        ))}
      </div>

      <button type="button" onClick={onAddExercise} className="mt-3 rounded-[var(--control-radius)] border border-dashed border-border px-3 py-1.5 text-xs font-medium text-accent transition hover:bg-accent-soft">
        + Add exercise
      </button>
    </Card>
  );
}
