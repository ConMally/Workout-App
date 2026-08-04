import type { CompletedWorkout, WeightUnit } from "@/types/workout-log";
import { formatDate, formatDuration } from "@/lib/workout-log";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";

const READINESS_LABELS: { key: keyof NonNullable<CompletedWorkout["readiness"]>; label: string }[] = [
  { key: "difficulty", label: "Difficulty" },
  { key: "energy", label: "Energy" },
  { key: "soreness", label: "Soreness" },
  { key: "sleepQuality", label: "Sleep quality" },
  { key: "satisfaction", label: "Satisfaction" },
];

interface WorkoutHistoryDetailProps {
  workout: CompletedWorkout;
  weightUnit: WeightUnit;
  onBack: () => void;
  onSelectExercise: (name: string) => void;
}

export default function WorkoutHistoryDetail({ workout, weightUnit, onBack, onSelectExercise }: WorkoutHistoryDetailProps) {
  return (
    <div className="motion-safe:animate-step-in flex flex-col gap-6">
      <button
        type="button"
        onClick={onBack}
        className="flex w-fit items-center gap-1.5 text-sm font-medium text-text-secondary hover:text-accent"
      >
        <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M12 15l-5-5 5-5" />
        </svg>
        Back to history
      </button>

      <div>
        <p className="text-xs font-medium text-text-muted">{formatDate(workout.completedAt)}</p>
        <h2 className="mt-0.5 text-page-title text-text-primary">{workout.dayTitle}</h2>
        <p className="text-supporting">{workout.dayFocus}</p>
        <p className="mt-1 text-xs text-text-muted">Duration: {formatDuration(workout.durationSeconds)}</p>
      </div>

      {workout.readiness && (
        <Card>
          <h3 className="text-label">Check-in</h3>
          <div className="mt-2 grid grid-cols-2 gap-3 sm:grid-cols-5">
            {READINESS_LABELS.map(({ key, label }) => (
              <div key={key}>
                <p className="text-xs text-text-muted">{label}</p>
                <p className="text-sm font-semibold text-text-primary">
                  {workout.readiness![key] === null ? "—" : `${workout.readiness![key]}/10`}
                </p>
              </div>
            ))}
          </div>
        </Card>
      )}

      <div className="flex flex-col gap-4">
        {workout.exercises.map((exercise, i) => (
          <Card key={i}>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <button
                type="button"
                onClick={() => onSelectExercise(exercise.name)}
                className="text-card-title text-text-primary hover:text-accent hover:underline"
              >
                {exercise.name}
              </button>
              {exercise.completed && <Badge tone="success">Completed</Badge>}
            </div>
            <p className="mt-0.5 text-xs text-text-muted">
              Target: {exercise.targetSets} sets x {exercise.targetReps} reps
            </p>

            <ul className="mt-3 divide-y divide-border">
              {exercise.sets.map((set) => (
                <li key={set.setNumber} className="flex items-center justify-between gap-3 py-2 text-sm">
                  <span className="text-text-muted">Set {set.setNumber}</span>
                  <span className={set.completed ? "font-semibold text-text-primary" : "text-text-muted"}>
                    {set.weight !== null && set.reps !== null
                      ? `${set.weight} ${weightUnit} x ${set.reps}`
                      : "Not logged"}
                  </span>
                </li>
              ))}
            </ul>

            {exercise.note && (
              <p className="mt-3 rounded-[var(--control-radius)] bg-surface-muted px-3 py-2 text-xs text-text-secondary">{exercise.note}</p>
            )}
          </Card>
        ))}
      </div>
    </div>
  );
}
