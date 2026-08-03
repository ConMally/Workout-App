"use client";

import { useMemo, useRef } from "react";
import type { CompletedWorkout, WeightUnit } from "@/types/workout-log";
import type { ExerciseDefinition } from "@/types/exercises";
import { DIFFICULTY_LABELS, EXERCISE_CATEGORY_LABELS, MOVEMENT_PATTERN_LABELS, MUSCLE_GROUP_LABELS } from "@/types/exercises";
import { getExerciseStats } from "@/lib/insights";
import { formatDate } from "@/lib/workout-log";
import { useFocusTrap } from "@/lib/useFocusTrap";
import MiniLineChart from "@/components/insights/MiniLineChart";

interface ExerciseDetailModalProps {
  exercise: ExerciseDefinition;
  history: CompletedWorkout[];
  weightUnit: WeightUnit;
  isFavorite: boolean;
  onToggleFavorite: () => void;
  onClose: () => void;
  onReplace?: () => void;
  onCompare?: () => void;
}

// Every field this renders (muscles, instructions, cues, mistakes,
// equipment, difficulty, recommended reps/rest) comes straight off the
// static ExerciseDefinition (lib/exercises/data.ts) — no computation here.
// The history/best/1RM/trend section reuses lib/insights.ts#getExerciseStats
// and MiniLineChart exactly as components/exercises/ExerciseProgressDetail.tsx
// already does, rather than recomputing exercise stats a second way.
// `media` is read but only rendered when present — see
// types/exercises.ts#ExerciseMedia's header comment for why the shape
// already supports images/video/animation even though no seed data
// populates them yet (PART 2: "structure code so media can easily be added
// later").
export default function ExerciseDetailModal({
  exercise,
  history,
  weightUnit,
  isFavorite,
  onToggleFavorite,
  onClose,
  onReplace,
  onCompare,
}: ExerciseDetailModalProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  useFocusTrap(dialogRef, true);

  const stats = useMemo(() => getExerciseStats(history, exercise.name), [history, exercise.name]);
  const chartPoints = stats.history
    .filter((p) => p.estimatedOneRepMax !== null)
    .map((p) => ({ label: formatDate(p.completedAt), value: p.estimatedOneRepMax as number }));

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Escape") onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 px-4 py-8" role="presentation" onClick={onClose} onKeyDown={handleKeyDown}>
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="exercise-detail-title"
        onClick={(e) => e.stopPropagation()}
        className="flex max-h-full w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-lg"
      >
        <div className="flex items-start justify-between gap-3 border-b border-slate-100 p-5 sm:p-6">
          <div className="min-w-0">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
              {MUSCLE_GROUP_LABELS[exercise.primaryMuscle]} · {EXERCISE_CATEGORY_LABELS[exercise.category]}
            </p>
            <h2 id="exercise-detail-title" className="mt-0.5 truncate text-lg font-bold text-slate-900">
              {exercise.name}
            </h2>
          </div>
          <div className="flex flex-shrink-0 items-center gap-1">
            <button
              type="button"
              onClick={onToggleFavorite}
              title={isFavorite ? `Unfavorite ${exercise.name}` : `Favorite ${exercise.name}`}
              aria-label={isFavorite ? `Unfavorite ${exercise.name}` : `Favorite ${exercise.name}`}
              aria-pressed={isFavorite}
              className={`rounded-lg p-1.5 text-lg leading-none transition hover:bg-amber-50 hover:text-amber-500 ${isFavorite ? "text-amber-500" : "text-slate-300"}`}
            >
              {isFavorite ? "★" : "☆"}
            </button>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
            >
              ✕
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-5 sm:p-6">
          {exercise.media?.imageUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={exercise.media.imageUrl} alt={exercise.name} className="mb-4 w-full rounded-xl object-cover" />
          )}
          {exercise.media?.videoUrl && (
            <video src={exercise.media.videoUrl} controls className="mb-4 w-full rounded-xl" aria-label={`${exercise.name} demonstration video`} />
          )}

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <Stat label="Difficulty" value={DIFFICULTY_LABELS[exercise.difficulty]} />
            <Stat label="Movement" value={MOVEMENT_PATTERN_LABELS[exercise.movementPattern]} />
            <Stat label="Type" value={exercise.kind === "compound" ? "Compound" : "Isolation"} />
            <Stat label="Rep range" value={`${exercise.recommendedRepRange.min}-${exercise.recommendedRepRange.max}`} />
            <Stat label="Rest" value={`${exercise.recommendedRestSeconds.min}-${exercise.recommendedRestSeconds.max}s`} />
            <Stat label="Equipment" value={exercise.equipment.join(", ")} />
          </div>

          {exercise.secondaryMuscles.length > 0 && (
            <p className="mt-3 text-sm text-slate-500">
              Also works: {exercise.secondaryMuscles.map((m) => MUSCLE_GROUP_LABELS[m]).join(", ")}
            </p>
          )}

          <Section title="Instructions">
            <ol className="list-decimal space-y-1 pl-5 text-sm text-slate-700">
              {exercise.instructions.map((step, i) => (
                <li key={i}>{step}</li>
              ))}
            </ol>
          </Section>

          <Section title="Coaching cues">
            <ul className="list-disc space-y-1 pl-5 text-sm text-slate-700">
              {exercise.coachingCues.map((cue, i) => (
                <li key={i}>{cue}</li>
              ))}
            </ul>
          </Section>

          <Section title="Common mistakes">
            <ul className="list-disc space-y-1 pl-5 text-sm text-slate-700">
              {exercise.commonMistakes.map((mistake, i) => (
                <li key={i}>{mistake}</li>
              ))}
            </ul>
          </Section>

          <Section title="Your history">
            {stats.workoutCount === 0 ? (
              <p className="text-sm text-slate-400">You haven&apos;t logged this exercise yet.</p>
            ) : (
              <>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  <Stat label="Previous best" value={stats.heaviestWeight > 0 ? `${stats.heaviestWeight} ${weightUnit}` : "—"} />
                  <Stat label="Best reps" value={stats.bestReps ? `${stats.bestReps.reps} @ ${stats.bestReps.weight}` : "—"} />
                  <Stat label="Est. 1RM" value={stats.bestEstimatedOneRepMax > 0 ? `~${stats.bestEstimatedOneRepMax} ${weightUnit}` : "—"} />
                </div>
                <div className="mt-3">
                  <MiniLineChart points={chartPoints} ariaLabel={`Estimated one-rep max for ${exercise.name} over time`} />
                </div>
              </>
            )}
          </Section>
        </div>

        {(onReplace || onCompare) && (
          <div className="flex flex-wrap justify-end gap-2 border-t border-slate-100 p-4">
            {onCompare && (
              <button type="button" onClick={onCompare} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50">
                Compare
              </button>
            )}
            {onReplace && (
              <button type="button" onClick={onReplace} className="rounded-lg bg-teal-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-teal-700">
                Find a replacement
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-slate-50 px-3 py-2">
      <p className="text-xs font-medium text-slate-400">{label}</p>
      <p className="mt-0.5 text-sm font-bold capitalize text-slate-900">{value}</p>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mt-5">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{title}</p>
      <div className="mt-2">{children}</div>
    </div>
  );
}
