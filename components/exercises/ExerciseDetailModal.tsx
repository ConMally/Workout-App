"use client";

import { useMemo } from "react";
import type { CompletedWorkout, WeightUnit } from "@/types/workout-log";
import type { ExerciseDefinition } from "@/types/exercises";
import { EXERCISE_CATEGORY_LABELS, MOVEMENT_PATTERN_LABELS, MUSCLE_GROUP_LABELS } from "@/types/exercises";
import { getExerciseStats } from "@/lib/insights";
import { formatDate } from "@/lib/workout-log";
import Dialog from "@/components/ui/Dialog";
import Button from "@/components/ui/Button";
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
  const stats = useMemo(() => getExerciseStats(history, exercise.name), [history, exercise.name]);
  const chartPoints = stats.history
    .filter((p) => p.estimatedOneRepMax !== null)
    .map((p) => ({ label: formatDate(p.completedAt), value: p.estimatedOneRepMax as number }));

  return (
    <Dialog onClose={onClose} titleId="exercise-detail-title" className="max-w-lg">
      <div className="flex items-start justify-between gap-3 border-b border-border p-5 sm:p-6">
        <div className="min-w-0">
          <p className="text-label">
            {MUSCLE_GROUP_LABELS[exercise.primaryMuscle]} · {EXERCISE_CATEGORY_LABELS[exercise.category]}
          </p>
          <h2 id="exercise-detail-title" className="mt-0.5 truncate text-section-heading text-text-primary">
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
            className={`rounded-[var(--control-radius)] p-1.5 text-lg leading-none transition hover:bg-warning-soft hover:text-warning ${isFavorite ? "text-warning" : "text-text-muted"}`}
          >
            {isFavorite ? "★" : "☆"}
          </button>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="rounded-[var(--control-radius)] p-1.5 text-text-muted transition hover:bg-surface-muted hover:text-text-secondary"
          >
            ✕
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-5 sm:p-6">
        {exercise.media?.imageUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={exercise.media.imageUrl} alt={exercise.name} className="mb-4 w-full rounded-[var(--card-radius)] object-cover" />
        )}
        {exercise.media?.videoUrl && (
          <video src={exercise.media.videoUrl} controls className="mb-4 w-full rounded-[var(--card-radius)]" aria-label={`${exercise.name} demonstration video`} />
        )}

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <Stat label="Movement" value={MOVEMENT_PATTERN_LABELS[exercise.movementPattern]} />
          <Stat label="Type" value={exercise.kind === "compound" ? "Compound" : "Isolation"} />
          <Stat label="Equipment" value={exercise.equipment.join(", ")} />
        </div>

        {exercise.secondaryMuscles.length > 0 && (
          <p className="mt-3 text-sm text-text-muted">
            Also works: {exercise.secondaryMuscles.map((m) => MUSCLE_GROUP_LABELS[m]).join(", ")}
          </p>
        )}

        <Section title="Instructions">
          <ol className="list-decimal space-y-1 pl-5 text-sm text-text-secondary">
            {exercise.instructions.map((step, i) => (
              <li key={i}>{step}</li>
            ))}
          </ol>
        </Section>

        <Section title="Coaching cues">
          <ul className="list-disc space-y-1 pl-5 text-sm text-text-secondary">
            {exercise.coachingCues.map((cue, i) => (
              <li key={i}>{cue}</li>
            ))}
          </ul>
        </Section>

        <Section title="Common mistakes">
          <ul className="list-disc space-y-1 pl-5 text-sm text-text-secondary">
            {exercise.commonMistakes.map((mistake, i) => (
              <li key={i}>{mistake}</li>
            ))}
          </ul>
        </Section>

        <Section title="Your history">
          {stats.workoutCount === 0 ? (
            <p className="text-sm text-text-muted">You haven&apos;t logged this exercise yet.</p>
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
        <div className="flex flex-wrap justify-end gap-2 border-t border-border p-4">
          {onCompare && (
            <Button type="button" variant="secondary" onClick={onCompare}>
              Compare
            </Button>
          )}
          {onReplace && (
            <Button type="button" variant="primary" onClick={onReplace}>
              Find a replacement
            </Button>
          )}
        </div>
      )}
    </Dialog>
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

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mt-5">
      <p className="text-label">{title}</p>
      <div className="mt-2">{children}</div>
    </div>
  );
}
