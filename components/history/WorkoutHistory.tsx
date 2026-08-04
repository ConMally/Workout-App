import { useMemo } from "react";
import type { CompletedWorkout, PersonalRecordEvent, WeightUnit } from "@/types/workout-log";
import { countCompletedExercises, countCompletedSets, formatDate, formatDuration, getWorkoutVolume } from "@/lib/workout-log";
import { getAllPersonalRecords } from "@/lib/dashboard";
import WorkoutHistoryDetail from "./WorkoutHistoryDetail";
import PRCelebration from "../PRCelebration";
import EmptyState from "@/components/EmptyState";

interface WorkoutHistoryProps {
  history: CompletedWorkout[];
  recentPRs: PersonalRecordEvent[];
  weightUnit: WeightUnit;
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  onDismissPRs: () => void;
  onSelectExercise: (name: string) => void;
}

export default function WorkoutHistory({
  history,
  recentPRs,
  weightUnit,
  selectedId,
  onSelect,
  onDismissPRs,
  onSelectExercise,
}: WorkoutHistoryProps) {
  const selected = history.find((workout) => workout.id === selectedId) ?? null;

  // PART 6: PR count per workout, cross-referenced by exact completedAt
  // match — getAllPersonalRecords already reconstructs every PR event from
  // this same `history` prop, so this is a pure derivation, not a new
  // analytics computation.
  const prCountByWorkoutId = useMemo(() => {
    const counts = new Map<string, number>();
    for (const event of getAllPersonalRecords(history)) {
      const workout = history.find((w) => w.completedAt === event.completedAt);
      if (workout) counts.set(workout.id, (counts.get(workout.id) ?? 0) + 1);
    }
    return counts;
  }, [history]);

  if (selected) {
    return (
      <WorkoutHistoryDetail
        workout={selected}
        weightUnit={weightUnit}
        onBack={() => onSelect(null)}
        onSelectExercise={onSelectExercise}
      />
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <PRCelebration events={recentPRs} onDismiss={onDismissPRs} />

      <div>
        <h2 className="text-page-title text-text-primary">Workout history</h2>
        <p className="mt-1 text-supporting">Review what you&apos;ve completed.</p>
      </div>

      {history.length === 0 ? (
        <EmptyState
          title="No workouts completed yet"
          message="Start a workout from your plan and finish it to see it here."
        />
      ) : (
        <ul className="flex flex-col gap-2">
          {history.map((workout) => {
            const volume = getWorkoutVolume(workout.exercises);
            const prCount = prCountByWorkoutId.get(workout.id) ?? 0;
            const exercisesDone = countCompletedExercises(workout.exercises);
            const setsDone = countCompletedSets(workout.exercises);
            const isComplete = exercisesDone === workout.exercises.length;

            return (
              <li key={workout.id}>
                <button
                  type="button"
                  onClick={() => onSelect(workout.id)}
                  className="flex w-full items-center gap-3 rounded-[var(--card-radius)] border border-border bg-surface p-4 text-left shadow-sm transition hover:border-accent/40 hover:shadow-md"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                      <p className="text-card-title text-text-primary">{workout.dayTitle}</p>
                      <p className="text-xs text-text-muted">{formatDate(workout.completedAt)}</p>
                    </div>
                    <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-text-muted">
                      <span>{formatDuration(workout.durationSeconds)}</span>
                      {volume > 0 && <span>{volume.toLocaleString()} vol</span>}
                      <span>
                        {setsDone} set{setsDone === 1 ? "" : "s"}
                      </span>
                      {prCount > 0 && <span className="font-semibold text-accent">🏆 {prCount} PR{prCount === 1 ? "" : "s"}</span>}
                    </div>
                  </div>
                  <span
                    className={`flex-shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${
                      isComplete ? "bg-success-soft text-success" : "bg-surface-muted text-text-secondary"
                    }`}
                  >
                    {isComplete ? "Complete" : `${exercisesDone}/${workout.exercises.length}`}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
