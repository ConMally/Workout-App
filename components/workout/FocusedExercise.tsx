"use client";

import { useEffect, useState, type RefObject } from "react";
import type { CompletedWorkout, LoggedExercise, WeightUnit } from "@/types/workout-log";
import { DIFFICULTY_LABELS, MOVEMENT_PATTERN_LABELS, MUSCLE_GROUP_LABELS } from "@/types/exercises";
import { getExerciseByName } from "@/lib/exercises/library";
import { findLastPerformance } from "@/lib/workout-log";
import { getExerciseStats } from "@/lib/insights";
import { getProgressionSuggestion } from "@/lib/progression";
import ExerciseLogger from "./ExerciseLogger";

interface FocusedExerciseProps {
  exercise: LoggedExercise;
  exerciseIndex: number;
  totalExercises: number;
  history: CompletedWorkout[];
  weightUnit: WeightUnit;
  alreadyViewed: boolean;
  onViewed: () => void;
  onChange: (updated: LoggedExercise) => void;
  onSetCompleted: (restSeconds: number) => void;
  onSelectExercise: (name: string) => void;
  hasNext: boolean;
  onContinue: () => void;
  headingRef: RefObject<HTMLHeadingElement | null>;
  vibrationEnabled: boolean;
  showGuideByDefault: boolean;
}

// The "one exercise at a time" focused view (Phase 6.1, PART 1/4): exercise
// identity + library metadata (when available) + an optional Exercise Guide
// accordion (PART 4) + previous-performance stats, wrapped around the
// existing ExerciseLogger for the actual set-logging mechanics. Renders
// normally with the metadata sections simply omitted when the exercise
// isn't in the centralized library (PART 4: "without crashing or inventing
// metadata") — every field below comes straight from lib/exercises data or
// lib/insights/lib/progression, nothing here is a new calculation.
export default function FocusedExercise({
  exercise,
  exerciseIndex,
  totalExercises,
  history,
  weightUnit,
  alreadyViewed,
  onViewed,
  onChange,
  onSetCompleted,
  onSelectExercise,
  hasNext,
  onContinue,
  headingRef,
  vibrationEnabled,
  showGuideByDefault,
}: FocusedExerciseProps) {
  const definition = getExerciseByName(exercise.name);
  const lastPerformance = findLastPerformance(history, exercise.name);
  const stats = getExerciseStats(history, exercise.name);
  const suggestion = lastPerformance ? getProgressionSuggestion(lastPerformance) : null;
  const hasHistory = stats.workoutCount > 0;

  // Expanded by default the first time this exercise is viewed this
  // session, and again every time for an exercise with no logged history to
  // lean on — collapsed on repeat visits once the user has both seen the
  // guide and has their own data to go by (PART 4). The "Show exercise
  // guide automatically" setting is a hard override: when off, the guide
  // always starts collapsed (still expandable by hand).
  const [guideExpanded, setGuideExpanded] = useState(showGuideByDefault && (!alreadyViewed || !hasHistory));

  useEffect(() => {
    onViewed();
    // Runs once per mount — this component is remounted by its parent
    // (key={activeIndex}) each time the focused exercise changes, so this
    // fires exactly once per visit to a given exercise.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="motion-safe:animate-step-in flex flex-col gap-4">
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6 dark:border-slate-800 dark:bg-slate-900">
        <p className="text-xs font-semibold uppercase tracking-wide text-teal-600 dark:text-teal-400">
          Exercise {exerciseIndex + 1} of {totalExercises}
        </p>
        <h2 ref={headingRef} tabIndex={-1} className="mt-0.5 text-2xl font-bold text-slate-900 focus:outline-none dark:text-slate-100">
          {exercise.name}
        </h2>

        {definition && (
          <div className="mt-2 flex flex-wrap gap-1.5 text-xs">
            <span className="rounded-full bg-teal-100 px-2.5 py-1 font-medium text-teal-800 dark:bg-teal-950/50 dark:text-teal-300">
              {MUSCLE_GROUP_LABELS[definition.primaryMuscle]}
            </span>
            {definition.secondaryMuscles.map((m) => (
              <span key={m} className="rounded-full bg-slate-100 px-2.5 py-1 font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                + {MUSCLE_GROUP_LABELS[m]}
              </span>
            ))}
            <span className="rounded-full bg-slate-100 px-2.5 py-1 font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300">
              {MOVEMENT_PATTERN_LABELS[definition.movementPattern]}
            </span>
            <span className="rounded-full bg-slate-100 px-2.5 py-1 font-medium capitalize text-slate-600 dark:bg-slate-800 dark:text-slate-300">
              {definition.equipment.join(", ").replace(/_/g, " ")}
            </span>
          </div>
        )}

        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Stat label="Target" value={`${exercise.targetSets} × ${exercise.targetReps}`} />
          <Stat label="Rest" value={`${exercise.targetRestSeconds}s`} />
          <Stat label="Best weight" value={stats.heaviestWeight > 0 ? `${stats.heaviestWeight} ${weightUnit}` : "—"} />
          <Stat label="Best est. 1RM" value={stats.bestEstimatedOneRepMax > 0 ? `~${stats.bestEstimatedOneRepMax} ${weightUnit}` : "—"} />
        </div>

        <button
          type="button"
          onClick={() => onSelectExercise(exercise.name)}
          className="mt-3 text-xs font-medium text-teal-700 hover:underline dark:text-teal-400"
        >
          View full progress →
        </button>

        {suggestion && (
          <p className="mt-2 rounded-lg bg-teal-50 px-3 py-2 text-xs font-medium text-teal-800 dark:bg-teal-950/40 dark:text-teal-300">
            {suggestion.message}
          </p>
        )}

        {definition && (
          <div className="mt-4 border-t border-slate-100 pt-4 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setGuideExpanded((v) => !v)}
              aria-expanded={guideExpanded}
              aria-controls={`exercise-guide-${exerciseIndex}`}
              className="flex w-full items-center justify-between gap-2 text-left text-sm font-semibold text-slate-800 dark:text-slate-200"
            >
              <span>Exercise guide</span>
              <span aria-hidden="true" className={`transition-transform ${guideExpanded ? "rotate-180" : ""}`}>
                ▾
              </span>
            </button>

            {guideExpanded && (
              <div id={`exercise-guide-${exerciseIndex}`} className="motion-safe:animate-step-in mt-3 flex flex-col gap-4">
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  <Stat label="Difficulty" value={DIFFICULTY_LABELS[definition.difficulty] ?? definition.difficulty} />
                  <Stat label="Movement" value={MOVEMENT_PATTERN_LABELS[definition.movementPattern]} />
                  <Stat label="Equipment" value={definition.equipment.join(", ").replace(/_/g, " ")} />
                </div>

                <GuideSection title="Instructions">
                  <ol className="list-decimal space-y-1 pl-5 text-sm text-slate-700 dark:text-slate-300">
                    {definition.instructions.map((step, i) => (
                      <li key={i}>{step}</li>
                    ))}
                  </ol>
                </GuideSection>

                <GuideSection title="Coaching cues">
                  <ul className="list-disc space-y-1 pl-5 text-sm text-slate-700 dark:text-slate-300">
                    {definition.coachingCues.map((cue, i) => (
                      <li key={i}>{cue}</li>
                    ))}
                  </ul>
                </GuideSection>

                <GuideSection title="Common mistakes">
                  <ul className="list-disc space-y-1 pl-5 text-sm text-slate-700 dark:text-slate-300">
                    {definition.commonMistakes.map((mistake, i) => (
                      <li key={i}>{mistake}</li>
                    ))}
                  </ul>
                </GuideSection>
              </div>
            )}
          </div>
        )}
      </div>

      <ExerciseLogger
        exercise={exercise}
        lastPerformance={lastPerformance}
        weightUnit={weightUnit}
        onChange={onChange}
        onSetCompleted={onSetCompleted}
        hasNext={hasNext}
        onContinue={onContinue}
        vibrationEnabled={vibrationEnabled}
      />
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-slate-50 px-3 py-2 dark:bg-slate-800">
      <p className="text-xs font-medium text-slate-400 dark:text-slate-500">{label}</p>
      <p className="mt-0.5 text-sm font-bold capitalize text-slate-900 dark:text-slate-100">{value}</p>
    </div>
  );
}

function GuideSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">{title}</h3>
      <div className="mt-1.5">{children}</div>
    </div>
  );
}
