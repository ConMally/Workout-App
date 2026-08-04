"use client";

import { useEffect, useRef, useState } from "react";
import type {
  ActiveWorkout as ActiveWorkoutData,
  AppSettings,
  CompletedWorkout,
} from "@/types/workout-log";
import {
  computeDurationSeconds,
  formatElapsedClock,
  getExerciseCompletion,
  getWorkoutCompletionProgress,
} from "@/lib/workout-log";
import { useActiveExerciseNavigation } from "@/lib/useActiveExerciseNavigation";
import { useSwipeGesture } from "@/lib/useSwipeGesture";
import FocusedExercise from "./FocusedExercise";
import WorkoutOverviewDrawer from "./WorkoutOverviewDrawer";
import RestTimer, { type RestTimerTrigger } from "./RestTimer";
import Button from "@/components/ui/Button";

// Small circular sets-completed ring for the current exercise, next to the
// "Exercise X of Y" label — PART 6's "exercise progress ring."
function ExerciseProgressRing({ completed, total }: { completed: number; total: number }) {
  const size = 28;
  const strokeWidth = 3;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const fraction = total > 0 ? completed / total : 0;

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="flex-shrink-0" aria-hidden="true">
      <circle cx={size / 2} cy={size / 2} r={radius} fill="none" strokeWidth={strokeWidth} className="stroke-[var(--border)]" />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={circumference * (1 - fraction)}
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
        className="stroke-[var(--accent)] motion-safe:transition-all motion-safe:duration-500"
      />
    </svg>
  );
}

function getMotivationalMessage(completedExercises: number, totalExercises: number, isLastExercise: boolean): string | null {
  if (totalExercises < 2) return null;
  const fraction = completedExercises / totalExercises;
  if (completedExercises === totalExercises) return "Workout complete — nice work! 🎉";
  if (isLastExercise) return "Last exercise — finish strong!";
  if (fraction >= 0.5) return "Halfway there — keep it up!";
  return null;
}

interface ActiveWorkoutProps {
  workout: ActiveWorkoutData;
  history: CompletedWorkout[];
  settings: AppSettings;
  onUpdateWorkout: (workout: ActiveWorkoutData) => void;
  onToggleAutoStart: (enabled: boolean) => void;
  onFinish: () => void;
  onDiscard: () => void;
  onSelectExercise: (name: string) => void;
}

// Phase 6.1: focused one-exercise-at-a-time active workout, built around
// the same ActiveWorkout state/repository this app already had — no second
// workout system. This component is now an orchestrator: it owns
// navigation (useActiveExerciseNavigation), the sticky header/rest timer,
// and the overview drawer, and hands the actual exercise UI to
// FocusedExercise/ExerciseLogger.
export default function ActiveWorkout({
  workout,
  history,
  settings,
  onUpdateWorkout,
  onToggleAutoStart,
  onFinish,
  onDiscard,
  onSelectExercise,
}: ActiveWorkoutProps) {
  const [restTrigger, setRestTrigger] = useState<RestTimerTrigger | null>(null);
  const [overviewOpen, setOverviewOpen] = useState(false);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const isFirstNavRef = useRef(true);

  const nav = useActiveExerciseNavigation({
    workoutId: workout.id,
    exercises: workout.exercises,
    savedIndex: workout.activeExerciseIndex,
    onIndexChange: (index) => onUpdateWorkout({ ...workout, activeExerciseIndex: index }),
  });

  const [elapsedSeconds, setElapsedSeconds] = useState(() => computeDurationSeconds(workout.startedAt) ?? 0);
  useEffect(() => {
    const interval = setInterval(() => {
      setElapsedSeconds(computeDurationSeconds(workout.startedAt) ?? 0);
    }, 1000);
    return () => clearInterval(interval);
  }, [workout.startedAt]);

  // Move focus to the newly-focused exercise's heading after an explicit
  // navigation action — never on first mount, which would steal focus from
  // wherever it already was when this tab opened (PART 10: "preserve
  // logical focus after changing exercises").
  useEffect(() => {
    if (isFirstNavRef.current) {
      isFirstNavRef.current = false;
      return;
    }
    headingRef.current?.focus();
  }, [nav.activeIndex]);

  const activeExercise = workout.exercises[nav.activeIndex];
  const progress = getWorkoutCompletionProgress(workout.exercises);
  const activeExerciseCompletion = getExerciseCompletion(activeExercise);
  const motivationalMessage = getMotivationalMessage(progress.completedExercises, progress.totalExercises, !nav.canGoNext);

  // PART 3: swipe left/right to move between exercises, swipe up to open
  // the full workout overview — attached to the focused-exercise area only
  // (not the sticky header/rest timer), and never calls preventDefault, so
  // scrolling the page or a textarea never gets hijacked.
  const swipeHandlers = useSwipeGesture({
    onSwipeLeft: nav.canGoNext ? nav.goNext : undefined,
    onSwipeRight: nav.canGoPrevious ? nav.goPrevious : undefined,
    onSwipeUp: () => setOverviewOpen(true),
  });

  function updateExercise(updated: ActiveWorkoutData["exercises"][number]) {
    const nextExercises = workout.exercises.map((exercise, i) => (i === nav.activeIndex ? updated : exercise));
    onUpdateWorkout({ ...workout, exercises: nextExercises });
  }

  function handleSetCompleted(restSeconds: number) {
    if (!settings.autoStartRestTimer) return;
    setRestTrigger((prev) => ({ seconds: restSeconds, nonce: (prev?.nonce ?? 0) + 1 }));
  }

  function handleDiscard() {
    if (window.confirm("Discard this workout? Anything you've logged so far will be lost.")) {
      onDiscard();
    }
  }

  // PART 8: easy to finish, hard to finish by accident — a confirm only
  // appears when something is still incomplete, and declining it leaves the
  // user exactly where they were so they can go finish it.
  function handleFinish() {
    const isComplete = progress.completedExercises === progress.totalExercises;
    if (!isComplete) {
      const remaining = progress.totalExercises - progress.completedExercises;
      const proceed = window.confirm(
        `${remaining} of ${progress.totalExercises} exercises aren't marked complete yet (${progress.completedSets}/${progress.totalSets} sets logged). Finish the workout anyway?`
      );
      if (!proceed) return;
    }
    onFinish();
  }

  // Defensive only — ActiveWorkoutSchema requires at least one exercise, so
  // this shouldn't be reachable through normal app flows. Still, rendering
  // nothing here would look like the app crashed and trap the user on a
  // blank tab with no way out (PART 3/7: never trap the user), so this
  // gives them a way back instead of a dead screen.
  if (!activeExercise) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-[var(--card-radius)] border border-dashed border-border bg-surface-muted/60 px-6 py-10 text-center">
        <p className="text-sm font-medium text-text-secondary">This workout has no exercises to show.</p>
        <Button type="button" variant="secondary" onClick={handleDiscard}>
          Discard workout
        </Button>
      </div>
    );
  }

  return (
    <div className="motion-safe:animate-step-in flex flex-col gap-4">
      <div className="sticky top-0 z-20 flex flex-col gap-3 bg-background pb-3 pt-1">
        <div className="rounded-[var(--card-radius)] border border-border bg-surface p-4 shadow-sm sm:p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <span className="text-eyebrow">{workout.dayLabel}</span>
              <h1 className="mt-0.5 truncate text-section-heading text-text-primary">{workout.dayTitle}</h1>
            </div>
            <div className="flex flex-shrink-0 items-center gap-3">
              <span
                className="font-mono text-sm font-semibold tabular-nums text-text-secondary"
                aria-label={`Elapsed time ${formatElapsedClock(elapsedSeconds)}`}
              >
                {formatElapsedClock(elapsedSeconds)}
              </span>
              <Button type="button" variant="primary" size="sm" onClick={handleFinish}>
                Finish Workout
              </Button>
            </div>
          </div>

          <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-text-muted">
            <span>
              {progress.completedExercises}/{progress.totalExercises} exercises · {progress.completedSets}/
              {progress.totalSets} sets
            </span>
            <button type="button" onClick={() => setOverviewOpen(true)} className="font-medium text-accent hover:underline">
              View full workout
            </button>
          </div>

          <div
            className="mt-2 flex gap-1"
            role="img"
            aria-label={`Exercise progress: ${progress.completedExercises} of ${progress.totalExercises} exercises complete`}
          >
            {workout.exercises.map((exercise, i) => (
              <span
                key={i}
                aria-hidden="true"
                className={`h-1.5 flex-1 rounded-full motion-safe:transition-colors motion-safe:duration-300 ${
                  exercise.completed ? "bg-accent" : i === nav.activeIndex ? "bg-accent/40" : "bg-surface-muted"
                }`}
              />
            ))}
          </div>
        </div>

        <div className="flex items-center justify-between gap-2 rounded-[var(--card-radius)] border border-border bg-surface p-2 shadow-sm">
          <button
            type="button"
            onClick={nav.goPrevious}
            disabled={!nav.canGoPrevious}
            aria-label="Previous exercise"
            className="flex items-center gap-1 rounded-[var(--control-radius)] px-3 py-2 text-sm font-medium text-text-secondary transition active:scale-95 hover:bg-surface-muted disabled:cursor-not-allowed disabled:opacity-30"
          >
            ← Previous
          </button>
          <span className="flex items-center gap-2 text-sm font-semibold text-text-secondary">
            <ExerciseProgressRing completed={activeExerciseCompletion.completedSets} total={activeExerciseCompletion.totalSets} />
            Exercise {nav.activeIndex + 1} of {workout.exercises.length}
          </span>
          <button
            type="button"
            onClick={nav.goNext}
            disabled={!nav.canGoNext}
            aria-label="Next exercise"
            className="flex items-center gap-1 rounded-[var(--control-radius)] px-3 py-2 text-sm font-medium text-text-secondary transition active:scale-95 hover:bg-surface-muted disabled:cursor-not-allowed disabled:opacity-30"
          >
            Next →
          </button>
        </div>

        <RestTimer
          autoStartTrigger={restTrigger}
          autoStartEnabled={settings.autoStartRestTimer}
          onToggleAutoStart={onToggleAutoStart}
          defaultSeconds={settings.defaultRestSeconds}
          soundEnabled={settings.timerSound}
        />
      </div>

      <div aria-live="polite" className="sr-only">
        Now viewing exercise {nav.activeIndex + 1} of {workout.exercises.length}: {activeExercise.name}
      </div>

      {motivationalMessage && (
        <p className="motion-safe:animate-step-in text-center text-sm font-medium text-accent">
          {motivationalMessage}
        </p>
      )}

      <div onTouchStart={swipeHandlers.onTouchStart} onTouchEnd={swipeHandlers.onTouchEnd}>
        <FocusedExercise
          key={nav.activeIndex}
          headingRef={headingRef}
          exercise={activeExercise}
          exerciseIndex={nav.activeIndex}
          totalExercises={workout.exercises.length}
          history={history}
          weightUnit={settings.weightUnit}
          onChange={updateExercise}
          onSetCompleted={handleSetCompleted}
          onSelectExercise={onSelectExercise}
          hasNext={nav.canGoNext}
          onContinue={nav.goNext}
          vibrationEnabled={settings.vibration}
        />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-5">
        <button
          type="button"
          onClick={handleDiscard}
          className="text-sm font-medium text-text-muted underline-offset-2 transition hover:text-danger hover:underline"
        >
          Discard workout
        </button>
        <Button type="button" variant="primary" onClick={handleFinish}>
          Finish Workout
        </Button>
      </div>

      {overviewOpen && (
        <WorkoutOverviewDrawer
          exercises={workout.exercises}
          activeIndex={nav.activeIndex}
          onSelect={(index) => {
            nav.goTo(index);
            setOverviewOpen(false);
          }}
          onClose={() => setOverviewOpen(false)}
        />
      )}
    </div>
  );
}
