"use client";

import { useEffect, useRef, useState } from "react";
import type { LoggedExercise } from "@/types/workout-log";
import { resolveActiveExerciseId } from "./workout-log";

interface UseActiveExerciseNavigationArgs {
  workoutId: string;
  exercises: LoggedExercise[];
  savedId: string | null;
  savedIndex: number | null;
  onIdChange: (id: string) => void;
}

interface UseActiveExerciseNavigationResult {
  activeId: string;
  activeIndex: number;
  goTo: (id: string) => void;
  goNext: () => void;
  goPrevious: () => void;
  canGoPrevious: boolean;
  canGoNext: boolean;
}

// Owns "which exercise is currently focused" during an active workout.
// Phase 11B: tracks a stable exercise row id rather than an array index —
// array position is no longer a safe identity now that the exercise list
// can be reordered/added to/deleted from mid-workout (see
// components/workout/ActiveWorkoutEditor.tsx). `activeIndex` is still
// exposed (derived from activeId every render) purely for display ("Exercise
// X of Y") and progress-dot rendering — it is never itself persisted or used
// to identify an exercise.
//
// Navigation only ever happens on an explicit user action (Previous/Next/
// jump/Continue), or reactively when the currently-focused exercise is
// removed out from under it (see the second effect below) — this hook never
// moves focus on its own for any other reason, per Phase 6.1's "do not
// unexpectedly navigate while the user is still editing a set." Every
// change is persisted back onto the ActiveWorkout object through the same
// onUpdateWorkout path every other in-workout edit already uses (see
// components/workout/ActiveWorkout.tsx), so it survives a refresh, a tab
// switch, or leaving and returning to the workout.
export function useActiveExerciseNavigation({
  workoutId,
  exercises,
  savedId,
  savedIndex,
  onIdChange,
}: UseActiveExerciseNavigationArgs): UseActiveExerciseNavigationResult {
  const [activeId, setActiveId] = useState(() => resolveActiveExerciseId(exercises, savedId, savedIndex));

  // Only re-resolve from saved state when switching to a genuinely different
  // active workout (a new id) — not on every exercises/saved* change, which
  // would otherwise fight the user's own in-progress navigation, since every
  // set edit re-saves the whole workout object including the saved focus.
  const lastWorkoutId = useRef(workoutId);
  useEffect(() => {
    if (lastWorkoutId.current === workoutId) return;
    lastWorkoutId.current = workoutId;
    setActiveId(resolveActiveExerciseId(exercises, savedId, savedIndex));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workoutId]);

  // Phase 11B safety net: reacts only when the exercise list changes in a
  // way that removes the currently-focused row (a delete of the current
  // exercise, or an in-place replace whose caller explicitly moves focus
  // elsewhere first — see ActiveWorkoutEditor). Adding an exercise or
  // reordering never trips this (the focused row's own id is untouched by
  // either), so "remain on current exercise" / "remain on the same exercise
  // row id" for those cases falls out of this effect simply never firing —
  // no special-case code needed for them.
  //
  // Prefers the next incomplete exercise at or after where the removed one
  // used to sit, falling back to whatever is now immediately before it, and
  // finally the first exercise — exactly PART 10's "go to the next
  // incomplete exercise; if none, the previous available exercise; never
  // render a blank workout," rather than a coarser "just jump to the first
  // incomplete exercise anywhere in the list."
  const previousExercisesRef = useRef(exercises);
  useEffect(() => {
    const previous = previousExercisesRef.current;
    previousExercisesRef.current = exercises;

    if (exercises.length === 0) return; // defensive only — schema requires min(1)
    if (exercises.some((exercise) => exercise.id === activeId)) return;

    const removedAt = previous.findIndex((exercise) => exercise.id === activeId);
    let nextId: string | undefined;

    if (removedAt !== -1) {
      nextId = exercises.slice(removedAt).find((exercise) => !exercise.completed)?.id;
      if (!nextId) {
        const previousIndex = Math.max(0, removedAt - 1);
        nextId = exercises[previousIndex]?.id ?? exercises[0]?.id;
      }
    } else {
      nextId = resolveActiveExerciseId(exercises, null, null);
    }

    if (nextId) {
      setActiveId(nextId);
      onIdChange(nextId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [exercises]);

  function goToId(id: string) {
    if (!exercises.some((exercise) => exercise.id === id)) return;
    setActiveId(id);
    onIdChange(id);
  }

  const activeIndex = Math.max(
    0,
    exercises.findIndex((exercise) => exercise.id === activeId)
  );

  function goToOffset(offset: number) {
    const target = exercises[activeIndex + offset];
    if (target) goToId(target.id);
  }

  return {
    activeId,
    activeIndex,
    goTo: goToId,
    goNext: () => goToOffset(1),
    goPrevious: () => goToOffset(-1),
    canGoPrevious: activeIndex > 0,
    canGoNext: activeIndex < exercises.length - 1,
  };
}
