"use client";

import { useMemo, useRef, useState } from "react";
import type { CompletedWorkout, LoggedExercise } from "@/types/workout-log";
import type { ExerciseDefinition, ReplacementCandidate } from "@/types/exercises";
import type { NewActiveWorkoutExerciseInput, ReplaceActiveWorkoutExerciseInput } from "@/lib/repositories/active-workout-repository";
import { activeWorkoutExerciseFromDefinition } from "@/lib/workout-log";
import { getFriendlyDataErrorMessage } from "@/lib/supabase/data-errors";
import { useFocusTrap } from "@/lib/useFocusTrap";
import { useSwipeGesture } from "@/lib/useSwipeGesture";
import ExercisePickerDialog from "@/components/exercises/ExercisePickerDialog";
import ReplacementPicker from "@/components/exercises/ReplacementPicker";
import Dialog from "@/components/ui/Dialog";
import Button from "@/components/ui/Button";

interface ActiveWorkoutEditorProps {
  exercises: LoggedExercise[];
  history: CompletedWorkout[];
  favoriteIds: Set<string>;
  onToggleFavorite: (exerciseId: string) => void;
  onAddExercise: (input: NewActiveWorkoutExerciseInput) => Promise<void>;
  onReplaceExercise: (exerciseId: string, input: ReplaceActiveWorkoutExerciseInput) => Promise<void>;
  onDeleteExercise: (exerciseId: string) => Promise<void>;
  onMoveExercise: (exerciseId: string, direction: "up" | "down") => Promise<void>;
  onClose: () => void;
}

type Step =
  | { mode: "list" }
  | { mode: "add-pick" }
  | { mode: "add-configure"; definition: ExerciseDefinition }
  | { mode: "replace-pick"; exercise: LoggedExercise }
  | { mode: "replace-confirm"; exercise: LoggedExercise; candidate: ReplacementCandidate }
  | { mode: "delete-confirm"; exercise: LoggedExercise };

function completedSetsOf(exercise: LoggedExercise): number {
  return exercise.sets.filter((set) => set.completed).length;
}

// PART 2/13 of Phase 11B: a focused, mobile-optimized editor for TODAY's
// active workout only — never the original plan, a saved template, or
// future workouts (those are edited elsewhere, via WorkoutPlanView/
// PlanEditor/TemplateEditor, none of which this component touches). Every
// mutation here goes through the parent's onAddExercise/onReplaceExercise/
// onDeleteExercise/onMoveExercise props, which are expected to await the
// real repository call (RPC-backed on Supabase — see
// supabase/migrations/0015_active_workout_editing.sql) and only then update
// local state — this component never optimistically mutates its own copy
// of `exercises`, so a failed write never leaves the on-screen list out of
// sync with what's actually saved (PART 8: "avoid partial states").
//
// Reuses the same centralized-library pickers Templates/Plan Editor already
// use (ExercisePickerDialog, ReplacementPicker) rather than any free-text
// entry — PART 3/4's "no free-text exercise names."
export default function ActiveWorkoutEditor({
  exercises,
  history,
  favoriteIds,
  onToggleFavorite,
  onAddExercise,
  onReplaceExercise,
  onDeleteExercise,
  onMoveExercise,
  onClose,
}: ActiveWorkoutEditorProps) {
  const [step, setStep] = useState<Step>({ mode: "list" });
  // Which action is currently in flight — "move-<id>" | "add" | "replace" |
  // "delete" | null. A single field (not a boolean) so the exact button
  // that triggered a write can show its own loading state instead of every
  // button in the list dimming at once.
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  useFocusTrap(panelRef, true);
  const swipeDownToClose = useSwipeGesture({ onSwipeDown: () => step.mode === "list" && onClose() });

  async function runAction(key: string, action: () => Promise<void>) {
    setError(null);
    setBusyKey(key);
    try {
      await action();
    } catch (err) {
      setError(getFriendlyDataErrorMessage(err));
    } finally {
      setBusyKey(null);
    }
  }

  async function handleMove(exercise: LoggedExercise, direction: "up" | "down") {
    await runAction(`move-${exercise.id}`, () => onMoveExercise(exercise.id, direction));
  }

  async function handleDeleteConfirmed(exercise: LoggedExercise) {
    await runAction("delete", () => onDeleteExercise(exercise.id));
    setStep({ mode: "list" });
  }

  async function handleAddConfirmed(
    definition: ExerciseDefinition,
    values: { targetSets: number; targetReps: string; targetRestSeconds: number; note: string }
  ) {
    await runAction("add", () =>
      onAddExercise({
        name: definition.name,
        exerciseId: definition.id,
        targetSets: values.targetSets,
        targetReps: values.targetReps,
        targetRestSeconds: values.targetRestSeconds,
        note: values.note,
      })
    );
    setStep({ mode: "list" });
  }

  async function handleReplaceConfirmed(exercise: LoggedExercise, candidate: ReplacementCandidate, keepCompleted: boolean) {
    await runAction("replace", () =>
      onReplaceExercise(exercise.id, {
        name: candidate.exercise.name,
        exerciseId: candidate.exercise.id,
        // Preserves the slot's original sets/reps/rest targets — same
        // convention the existing Plan-level replace flow already uses
        // (app/page.tsx#handleReplaceExercise only ever swaps the name),
        // satisfying PART 4's "preserve intended sets/reps/rest where
        // appropriate" without an extra values-editing step.
        targetSets: exercise.targetSets,
        targetReps: exercise.targetReps,
        targetRestSeconds: exercise.targetRestSeconds,
        keepCompleted,
      })
    );
    setStep({ mode: "list" });
  }

  // Zero completed sets: replace immediately, no extra confirmation beyond
  // having already picked a candidate (matches the existing Plan-level
  // replace flow's one-click feel). One or more completed sets: never
  // silently discard them — always confirm first (PART 4/15).
  function handleReplaceSelected(exercise: LoggedExercise, candidate: ReplacementCandidate) {
    if (completedSetsOf(exercise) === 0) {
      void handleReplaceConfirmed(exercise, candidate, false);
    } else {
      setStep({ mode: "replace-confirm", exercise, candidate });
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center sm:justify-end sm:p-4"
      role="presentation"
      onClick={() => step.mode === "list" && onClose()}
      onKeyDown={(e) => {
        if (e.key === "Escape" && step.mode === "list") onClose();
      }}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="active-workout-editor-title"
        onClick={(e) => e.stopPropagation()}
        className="motion-safe:animate-sheet-up flex max-h-[85vh] w-full flex-col overflow-hidden rounded-t-[var(--card-radius)] border border-border bg-surface-elevated shadow-lg sm:h-full sm:max-h-full sm:w-[26rem] sm:rounded-[var(--card-radius)] sm:motion-safe:animate-scale-in"
      >
        <div
          onTouchStart={swipeDownToClose.onTouchStart}
          onTouchEnd={swipeDownToClose.onTouchEnd}
          className="flex flex-col items-center gap-2 border-b border-border pt-2"
        >
          <span aria-hidden="true" className="h-1 w-10 rounded-full bg-surface-muted sm:hidden" />
          <div className="flex w-full items-start justify-between gap-3 p-4 pt-1">
            <div>
              <h2 id="active-workout-editor-title" className="text-card-title text-text-primary">
                Edit workout
              </h2>
              <p className="mt-0.5 text-xs text-text-muted">Changes apply to today&rsquo;s workout only.</p>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close editor"
              className="flex-shrink-0 rounded-[var(--control-radius)] p-1.5 text-text-muted transition hover:bg-surface-muted hover:text-text-secondary"
            >
              ✕
            </button>
          </div>
        </div>

        {error && (
          <div className="mx-4 mt-3 rounded-[var(--control-radius)] border border-danger/30 bg-danger-soft px-3 py-2 text-xs font-medium text-danger">
            {error}
          </div>
        )}

        <ul className="flex-1 divide-y divide-border overflow-y-auto p-2">
          {exercises.map((exercise, index) => {
            const completed = completedSetsOf(exercise);
            const isMoving = busyKey === `move-${exercise.id}`;
            const actionsDisabled = busyKey !== null;

            return (
              <li key={exercise.id} className="flex flex-col gap-2.5 px-3 py-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-text-primary">{exercise.name}</p>
                  <p className="mt-0.5 text-xs text-text-muted">
                    {completed}/{exercise.sets.length} sets
                    {exercise.completed ? " · Complete" : ""}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    disabled={actionsDisabled}
                    onClick={() => setStep({ mode: "replace-pick", exercise })}
                  >
                    Replace
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    disabled={actionsDisabled || exercises.length <= 1}
                    title={exercises.length <= 1 ? "A workout needs at least one exercise" : undefined}
                    onClick={() => setStep({ mode: "delete-confirm", exercise })}
                  >
                    Delete
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    size="icon"
                    disabled={actionsDisabled || index === 0}
                    loading={isMoving}
                    aria-label={`Move ${exercise.name} up`}
                    onClick={() => handleMove(exercise, "up")}
                  >
                    ↑
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    size="icon"
                    disabled={actionsDisabled || index === exercises.length - 1}
                    loading={isMoving}
                    aria-label={`Move ${exercise.name} down`}
                    onClick={() => handleMove(exercise, "down")}
                  >
                    ↓
                  </Button>
                </div>
              </li>
            );
          })}
        </ul>

        <div className="border-t border-border p-4">
          <Button type="button" variant="secondary" onClick={() => setStep({ mode: "add-pick" })} className="w-full" disabled={busyKey !== null}>
            + Add Exercise
          </Button>
        </div>
      </div>

      {step.mode === "add-pick" && (
        <ExercisePickerDialog
          title="Add exercise"
          description="Adds to today's workout only."
          history={history}
          favoriteIds={favoriteIds}
          onToggleFavorite={onToggleFavorite}
          onSelect={(definition) => setStep({ mode: "add-configure", definition })}
          onCancel={() => setStep({ mode: "list" })}
        />
      )}

      {step.mode === "add-configure" && (
        <AddExerciseConfigureDialog
          definition={step.definition}
          busy={busyKey === "add"}
          onConfirm={(values) => handleAddConfirmed(step.definition, values)}
          onCancel={() => setStep({ mode: "list" })}
        />
      )}

      {step.mode === "replace-pick" && (
        <ReplacementPicker
          exerciseName={step.exercise.name}
          excludeNames={exercises.map((e) => e.name)}
          onSelect={(candidate) => handleReplaceSelected(step.exercise, candidate)}
          onCancel={() => setStep({ mode: "list" })}
        />
      )}

      {step.mode === "replace-confirm" && (
        <ReplaceConfirmDialog
          exercise={step.exercise}
          candidate={step.candidate}
          busy={busyKey === "replace"}
          onKeepAndAdd={() => handleReplaceConfirmed(step.exercise, step.candidate, true)}
          onCancel={() => setStep({ mode: "list" })}
        />
      )}

      {step.mode === "delete-confirm" && (
        <DeleteConfirmDialog
          exercise={step.exercise}
          busy={busyKey === "delete"}
          onConfirm={() => handleDeleteConfirmed(step.exercise)}
          onCancel={() => setStep({ mode: "list" })}
        />
      )}
    </div>
  );
}

function AddExerciseConfigureDialog({
  definition,
  busy,
  onConfirm,
  onCancel,
}: {
  definition: ExerciseDefinition;
  busy: boolean;
  onConfirm: (values: { targetSets: number; targetReps: string; targetRestSeconds: number; note: string }) => void;
  onCancel: () => void;
}) {
  // Sensible defaults from the library definition's own recommendations
  // (PART 3: "use sensible defaults based on existing app utilities/library
  // metadata"), fully editable below before confirming.
  const defaults = useMemo(() => activeWorkoutExerciseFromDefinition(definition), [definition]);
  const [targetSets, setTargetSets] = useState(defaults.targetSets);
  const [targetReps, setTargetReps] = useState(defaults.targetReps);
  const [targetRestSeconds, setTargetRestSeconds] = useState(defaults.targetRestSeconds);
  const [note, setNote] = useState("");

  return (
    <Dialog onClose={onCancel} titleId="add-exercise-configure-title" className="max-w-sm">
      <div className="border-b border-border p-5">
        <h3 id="add-exercise-configure-title" className="text-section-heading text-text-primary">
          {definition.name}
        </h3>
        <p className="mt-1 text-supporting">Set your targets, then add it to today&rsquo;s workout.</p>
      </div>

      <div className="flex flex-col gap-3 p-5">
        <label className="flex flex-col gap-1 text-xs font-medium text-text-muted">
          Sets
          <input
            type="number"
            min={1}
            max={10}
            inputMode="numeric"
            value={targetSets}
            onChange={(e) => setTargetSets(Math.max(1, Math.min(10, Math.round(Number(e.target.value)) || 1)))}
            className="h-[var(--control-height)] rounded-[var(--control-radius)] border border-border bg-surface px-3 text-sm text-text-primary focus:border-accent focus:outline-none focus:ring-2 focus:ring-focus-ring/30"
          />
        </label>
        <label className="flex flex-col gap-1 text-xs font-medium text-text-muted">
          Reps
          <input
            type="text"
            value={targetReps}
            onChange={(e) => setTargetReps(e.target.value)}
            placeholder="e.g. 8-12"
            className="h-[var(--control-height)] rounded-[var(--control-radius)] border border-border bg-surface px-3 text-sm text-text-primary focus:border-accent focus:outline-none focus:ring-2 focus:ring-focus-ring/30"
          />
        </label>
        <label className="flex flex-col gap-1 text-xs font-medium text-text-muted">
          Rest (seconds)
          <input
            type="number"
            min={0}
            max={600}
            inputMode="numeric"
            value={targetRestSeconds}
            onChange={(e) => setTargetRestSeconds(Math.max(0, Math.min(600, Math.round(Number(e.target.value)) || 0)))}
            className="h-[var(--control-height)] rounded-[var(--control-radius)] border border-border bg-surface px-3 text-sm text-text-primary focus:border-accent focus:outline-none focus:ring-2 focus:ring-focus-ring/30"
          />
        </label>
        <label className="flex flex-col gap-1 text-xs font-medium text-text-muted">
          Note (optional)
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={2}
            maxLength={500}
            className="rounded-[var(--control-radius)] border border-border bg-surface px-3 py-2 text-sm text-text-primary focus:border-accent focus:outline-none focus:ring-2 focus:ring-focus-ring/30"
          />
        </label>
      </div>

      <div className="flex flex-col gap-2 border-t border-border p-4 sm:flex-row sm:justify-end">
        <Button type="button" variant="secondary" onClick={onCancel} disabled={busy}>
          Cancel
        </Button>
        <Button
          type="button"
          variant="primary"
          loading={busy}
          onClick={() =>
            onConfirm({
              targetSets,
              targetReps: targetReps.trim() || defaults.targetReps,
              targetRestSeconds,
              note,
            })
          }
        >
          Add to workout
        </Button>
      </div>
    </Dialog>
  );
}

function ReplaceConfirmDialog({
  exercise,
  candidate,
  busy,
  onKeepAndAdd,
  onCancel,
}: {
  exercise: LoggedExercise;
  candidate: ReplacementCandidate;
  busy: boolean;
  onKeepAndAdd: () => void;
  onCancel: () => void;
}) {
  const completed = completedSetsOf(exercise);
  const setWord = completed === 1 ? "set" : "sets";

  return (
    <Dialog onClose={onCancel} titleId="replace-confirm-title" className="max-w-sm">
      <div className="p-5">
        <h3 id="replace-confirm-title" className="text-section-heading text-text-primary">
          Keep your logged sets?
        </h3>
        <p className="mt-2 text-sm text-text-secondary">
          You&rsquo;ve already logged {completed} {setWord} for <strong className="text-text-primary">{exercise.name}</strong>. It
          isn&rsquo;t going anywhere — those {setWord} stay exactly as logged, and{" "}
          <strong className="text-text-primary">{candidate.exercise.name}</strong> gets added as the next exercise.
        </p>
      </div>
      <div className="flex flex-col gap-2 border-t border-border p-4 sm:flex-row sm:justify-end">
        <Button type="button" variant="secondary" onClick={onCancel} disabled={busy}>
          Cancel
        </Button>
        <Button type="button" variant="primary" loading={busy} onClick={onKeepAndAdd}>
          Keep sets &amp; add {candidate.exercise.name}
        </Button>
      </div>
    </Dialog>
  );
}

function DeleteConfirmDialog({
  exercise,
  busy,
  onConfirm,
  onCancel,
}: {
  exercise: LoggedExercise;
  busy: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const completed = completedSetsOf(exercise);
  const hasCompleted = completed > 0;
  const setWord = completed === 1 ? "set" : "sets";

  return (
    <Dialog onClose={onCancel} titleId="delete-confirm-title" className="max-w-sm">
      <div className="p-5">
        <h3 id="delete-confirm-title" className="text-section-heading text-text-primary">
          {hasCompleted ? "Discard logged sets?" : `Remove ${exercise.name}?`}
        </h3>
        <p className="mt-2 text-sm text-text-secondary">
          {hasCompleted
            ? `${completed} completed ${setWord} ${completed === 1 ? "has" : "have"} already been logged for ${exercise.name}. Removing it will permanently discard ${completed === 1 ? "that set" : "those sets"} — this can't be undone.`
            : `${exercise.name} hasn't been logged yet, so it's safe to remove from today's workout.`}
        </p>
      </div>
      <div className="flex flex-col gap-2 border-t border-border p-4 sm:flex-row sm:justify-end">
        <Button type="button" variant="secondary" onClick={onCancel} disabled={busy}>
          Keep exercise
        </Button>
        <Button type="button" variant="destructive" loading={busy} onClick={onConfirm}>
          {hasCompleted ? `Discard ${completed} ${setWord} & remove` : "Remove exercise"}
        </Button>
      </div>
    </Dialog>
  );
}
