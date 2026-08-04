"use client";

import { useState, type RefObject } from "react";
import type { CompletedWorkout, LoggedExercise, WeightUnit } from "@/types/workout-log";
import { DIFFICULTY_LABELS, MOVEMENT_PATTERN_LABELS, MUSCLE_GROUP_LABELS } from "@/types/exercises";
import { resolveExerciseDefinition } from "@/lib/exercises/library";
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
  onChange: (updated: LoggedExercise) => void;
  onSetCompleted: (restSeconds: number) => void;
  onSelectExercise: (name: string) => void;
  hasNext: boolean;
  onContinue: () => void;
  headingRef: RefObject<HTMLHeadingElement | null>;
  vibrationEnabled: boolean;
}

// The "one exercise at a time" focused view (Phase 6.1, PART 1/4): exercise
// identity + previous-performance stats, wrapped around the existing
// ExerciseLogger for the actual set-logging mechanics, plus a collapsed-by-
// default "Exercise instructions" accordion holding every bit of library
// metadata (setup, execution steps, breathing, cues, mistakes, safety
// notes, muscles worked, equipment, difficulty). None of that guide content
// renders anywhere outside the accordion — the header above only ever shows
// workout data (targets, best weight/1RM), never instructions, so nothing
// exercise-guide-related is visible until the user opens it by hand.
export default function FocusedExercise({
  exercise,
  exerciseIndex,
  totalExercises,
  history,
  weightUnit,
  onChange,
  onSetCompleted,
  onSelectExercise,
  hasNext,
  onContinue,
  headingRef,
  vibrationEnabled,
}: FocusedExerciseProps) {
  const definition = resolveExerciseDefinition(exercise.exerciseId, exercise.name);
  const lastPerformance = findLastPerformance(history, exercise.name);
  const stats = getExerciseStats(history, exercise.name);
  const suggestion = lastPerformance ? getProgressionSuggestion(lastPerformance) : null;

  // Always collapsed on arrival — this component is remounted by its parent
  // (key={activeIndex}) on every exercise change, so a fresh `false` here
  // is exactly "keep it collapsed whenever the user navigates to a new
  // exercise." There's no longer a setting or heuristic that auto-expands
  // it; opening the guide is always a deliberate click.
  const [guideExpanded, setGuideExpanded] = useState(false);

  const guideId = `exercise-guide-${exerciseIndex}`;

  return (
    <div className="motion-safe:animate-step-in flex flex-col gap-4">
      <div className="rounded-[var(--card-radius)] border border-border bg-surface p-5 shadow-sm sm:p-6">
        <p className="text-eyebrow">
          Exercise {exerciseIndex + 1} of {totalExercises}
        </p>
        <h2 ref={headingRef} tabIndex={-1} className="mt-0.5 text-page-title text-text-primary focus:outline-none">
          {exercise.name}
        </h2>

        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Stat label="Target" value={`${exercise.targetSets} × ${exercise.targetReps}`} />
          <Stat label="Rest" value={`${exercise.targetRestSeconds}s`} />
          <Stat label="Best weight" value={stats.heaviestWeight > 0 ? `${stats.heaviestWeight} ${weightUnit}` : "—"} />
          <Stat label="Best est. 1RM" value={stats.bestEstimatedOneRepMax > 0 ? `~${stats.bestEstimatedOneRepMax} ${weightUnit}` : "—"} />
        </div>

        <button
          type="button"
          onClick={() => onSelectExercise(exercise.name)}
          className="mt-3 text-xs font-medium text-accent hover:underline"
        >
          View full progress →
        </button>

        {suggestion && (
          <p className="mt-2 rounded-[var(--control-radius)] bg-accent-soft px-3 py-2 text-xs font-medium text-accent">
            {suggestion.message}
          </p>
        )}

        <div className="mt-4 border-t border-border pt-4">
          {definition ? (
            <>
              <button
                type="button"
                onClick={() => setGuideExpanded((v) => !v)}
                aria-expanded={guideExpanded}
                aria-controls={guideId}
                className="flex w-full items-center justify-between gap-2 rounded-[var(--control-radius)] text-left text-sm font-semibold text-text-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring"
              >
                <span>View exercise guide</span>
                <span aria-hidden="true" className={`motion-safe:transition-transform ${guideExpanded ? "rotate-180" : ""}`}>
                  ▾
                </span>
              </button>

              {guideExpanded && (
                <div id={guideId} className="motion-safe:animate-step-in mt-3 flex flex-col gap-4">
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                    <Stat label="Difficulty" value={DIFFICULTY_LABELS[definition.difficulty] ?? definition.difficulty} />
                    <Stat label="Movement" value={MOVEMENT_PATTERN_LABELS[definition.movementPattern]} />
                    <Stat label="Equipment" value={definition.equipment.join(", ").replace(/_/g, " ")} />
                  </div>

                  <GuideSection title="Muscles worked">
                    <p className="text-sm text-text-secondary">
                      {MUSCLE_GROUP_LABELS[definition.primaryMuscle]}
                      {definition.secondaryMuscles.length > 0 &&
                        ` — also ${definition.secondaryMuscles.map((m) => MUSCLE_GROUP_LABELS[m]).join(", ")}`}
                    </p>
                  </GuideSection>

                  {definition.setupInstructions && definition.setupInstructions.length > 0 && (
                    <GuideSection title="Setup">
                      <ol className="list-decimal space-y-1 pl-5 text-sm text-text-secondary">
                        {definition.setupInstructions.map((step, i) => (
                          <li key={i}>{step}</li>
                        ))}
                      </ol>
                    </GuideSection>
                  )}

                  <GuideSection title="Execution">
                    <ol className="list-decimal space-y-1 pl-5 text-sm text-text-secondary">
                      {definition.instructions.map((step, i) => (
                        <li key={i}>{step}</li>
                      ))}
                    </ol>
                  </GuideSection>

                  {definition.breathingGuidance && (
                    <GuideSection title="Breathing">
                      <p className="text-sm text-text-secondary">{definition.breathingGuidance}</p>
                    </GuideSection>
                  )}

                  <GuideSection title="Coaching cues">
                    <ul className="list-disc space-y-1 pl-5 text-sm text-text-secondary">
                      {definition.coachingCues.map((cue, i) => (
                        <li key={i}>{cue}</li>
                      ))}
                    </ul>
                  </GuideSection>

                  <GuideSection title="Common mistakes">
                    <ul className="list-disc space-y-1 pl-5 text-sm text-text-secondary">
                      {definition.commonMistakes.map((mistake, i) => (
                        <li key={i}>{mistake}</li>
                      ))}
                    </ul>
                  </GuideSection>

                  {definition.safetyNotes && definition.safetyNotes.length > 0 && (
                    <GuideSection title="Safety notes">
                      <ul className="list-disc space-y-1 pl-5 text-sm text-warning">
                        {definition.safetyNotes.map((note, i) => (
                          <li key={i}>{note}</li>
                        ))}
                      </ul>
                    </GuideSection>
                  )}
                </div>
              )}
            </>
          ) : (
            <p className="text-sm text-text-muted">Exercise instructions are not available for this exercise.</p>
          )}
        </div>
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
    <div className="rounded-[var(--control-radius)] bg-surface-muted px-3 py-2">
      <p className="text-xs font-medium text-text-muted">{label}</p>
      <p className="mt-0.5 text-sm font-bold capitalize text-text-primary">{value}</p>
    </div>
  );
}

function GuideSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="text-label">{title}</h3>
      <div className="mt-1.5">{children}</div>
    </div>
  );
}
