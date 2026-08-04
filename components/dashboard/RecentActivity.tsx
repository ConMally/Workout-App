import type { CompletedWorkout } from "@/types/workout-log";
import type { DatedPersonalRecord } from "@/types/dashboard";
import { countCompletedExercises, formatDate, formatDuration } from "@/lib/workout-log";
import Card from "@/components/ui/Card";
import EmptyState from "@/components/EmptyState";

interface RecentActivityProps {
  workouts: CompletedWorkout[];
  // PART 7: PRs are shown as a badge on the workout that earned them
  // instead of a separate "Recent personal records" card — matched by
  // `completedAt`, which lib/dashboard.ts#getAllPersonalRecords always sets
  // to the exact value of `workout.completedAt` it was detected on, so this
  // is an exact match, never a guess.
  recentPRs: DatedPersonalRecord[];
  onView: (id: string) => void;
  onSelectExercise: (name: string) => void;
}

export default function RecentActivity({ workouts, recentPRs, onView, onSelectExercise }: RecentActivityProps) {
  return (
    <Card>
      <h3 className="text-label">Recent activity</h3>

      {workouts.length === 0 ? (
        <div className="mt-3">
          <EmptyState title="No workouts yet" message="Finish a workout to see it show up here." />
        </div>
      ) : (
        <ul className="mt-3 divide-y divide-border">
          {workouts.map((workout) => {
            const workoutPRs = recentPRs.filter((pr) => pr.completedAt === workout.completedAt);
            return (
              <li key={workout.id} className="flex items-center justify-between gap-3 py-3 first:pt-0">
                <div className="min-w-0">
                  <p className="text-xs font-medium text-text-muted">{formatDate(workout.completedAt)}</p>
                  <p className="truncate text-sm font-semibold text-text-primary">{workout.dayTitle}</p>
                  <p className="text-xs text-text-secondary">
                    {formatDuration(workout.durationSeconds)} · {countCompletedExercises(workout.exercises)} exercises
                  </p>
                  {workoutPRs.length > 0 && (
                    <p className="mt-1 truncate text-xs font-medium text-accent">
                      🏆 New PR —{" "}
                      {workoutPRs.map((pr, i) => (
                        <span key={pr.exerciseName}>
                          {i > 0 && ", "}
                          <button type="button" onClick={() => onSelectExercise(pr.exerciseName)} className="hover:underline">
                            {pr.exerciseName} ({pr.detail})
                          </button>
                        </span>
                      ))}
                    </p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => onView(workout.id)}
                  className="flex-shrink-0 rounded-[var(--control-radius)] border border-border px-3 py-1.5 text-xs font-medium text-text-secondary transition hover:border-accent/40 hover:bg-accent-soft hover:text-accent focus:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring"
                >
                  View
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}
