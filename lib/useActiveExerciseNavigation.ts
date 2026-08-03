"use client";

import { useEffect, useRef, useState } from "react";
import type { LoggedExercise } from "@/types/workout-log";
import { resolveActiveExerciseIndex } from "./workout-log";

interface UseActiveExerciseNavigationArgs {
  workoutId: string;
  exercises: LoggedExercise[];
  savedIndex: number | null;
  onIndexChange: (index: number) => void;
}

interface UseActiveExerciseNavigationResult {
  activeIndex: number;
  goTo: (index: number) => void;
  goNext: () => void;
  goPrevious: () => void;
  canGoPrevious: boolean;
  canGoNext: boolean;
}

// Owns "which exercise is currently focused" during an active workout.
// Navigation only ever happens on an explicit user action (Previous/Next/
// jump/Continue) — this hook never moves the index on its own, per Phase
// 6.1's "do not unexpectedly navigate while the user is still editing a
// set." Every change is persisted back onto the ActiveWorkout object
// through the same onUpdateWorkout path every other in-workout edit already
// uses (see components/workout/ActiveWorkout.tsx), so it survives a
// refresh, a tab switch, or leaving and returning to the workout.
export function useActiveExerciseNavigation({
  workoutId,
  exercises,
  savedIndex,
  onIndexChange,
}: UseActiveExerciseNavigationArgs): UseActiveExerciseNavigationResult {
  const [activeIndex, setActiveIndex] = useState(() => resolveActiveExerciseIndex(exercises, savedIndex));

  // Only re-resolve when switching to a genuinely different active workout
  // (a new id) — not on every exercises/savedIndex change, which would
  // otherwise fight the user's own in-progress navigation, since every set
  // edit re-saves the whole workout object including savedIndex.
  const lastWorkoutId = useRef(workoutId);
  useEffect(() => {
    if (lastWorkoutId.current === workoutId) return;
    lastWorkoutId.current = workoutId;
    setActiveIndex(resolveActiveExerciseIndex(exercises, savedIndex));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workoutId]);

  function goToIndex(index: number) {
    const clamped = Math.min(Math.max(index, 0), Math.max(exercises.length - 1, 0));
    setActiveIndex(clamped);
    onIndexChange(clamped);
  }

  return {
    activeIndex,
    goTo: goToIndex,
    goNext: () => goToIndex(activeIndex + 1),
    goPrevious: () => goToIndex(activeIndex - 1),
    canGoPrevious: activeIndex > 0,
    canGoNext: activeIndex < exercises.length - 1,
  };
}
