"use client";

import { useState } from "react";
import type {
  ActiveWorkout as ActiveWorkoutData,
  AppSettings,
  CompletedWorkout,
} from "@/types/workout-log";
import { findLastPerformance } from "@/lib/workout-log";
import { getProgressionSuggestion } from "@/lib/progression";
import ExerciseLogger from "./ExerciseLogger";
import RestTimer, { type RestTimerTrigger } from "./RestTimer";

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

  function updateExercise(index: number, updated: (typeof workout.exercises)[number]) {
    const nextExercises = workout.exercises.map((exercise, i) => (i === index ? updated : exercise));
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

  return (
    <div className="motion-safe:animate-step-in flex flex-col gap-6">
      <div>
        <span className="text-xs font-semibold uppercase tracking-wide text-teal-600">
          {workout.dayLabel}
        </span>
        <h2 className="mt-0.5 text-2xl font-bold text-slate-900">{workout.dayTitle}</h2>
        <p className="mt-1 text-sm text-slate-500">{workout.dayFocus}</p>
      </div>

      <RestTimer
        autoStartTrigger={restTrigger}
        autoStartEnabled={settings.autoStartRestTimer}
        onToggleAutoStart={onToggleAutoStart}
      />

      <div className="flex flex-col gap-4">
        {workout.exercises.map((exercise, index) => {
          const lastPerformance = findLastPerformance(history, exercise.name);
          const suggestion = lastPerformance ? getProgressionSuggestion(lastPerformance) : null;
          return (
            <ExerciseLogger
              key={index}
              exercise={exercise}
              lastPerformance={lastPerformance}
              suggestion={suggestion}
              weightUnit={settings.weightUnit}
              onChange={(updated) => updateExercise(index, updated)}
              onSetCompleted={handleSetCompleted}
              onSelectExercise={onSelectExercise}
            />
          );
        })}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 pt-5">
        <button
          type="button"
          onClick={handleDiscard}
          className="text-sm font-medium text-slate-500 underline-offset-2 hover:text-red-600 hover:underline"
        >
          Discard workout
        </button>
        <button
          type="button"
          onClick={onFinish}
          className="rounded-lg bg-teal-600 px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-teal-700"
        >
          Finish Workout
        </button>
      </div>
    </div>
  );
}
