import type { TodayWorkoutInfo } from "@/types/dashboard";
import type { ActiveWorkout } from "@/types/workout-log";
import { computeDurationSeconds, formatElapsedClock, getWorkoutCompletionProgress } from "@/lib/workout-log";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";

interface TodayWorkoutProps {
  info: TodayWorkoutInfo;
  // Only needed for the "resume" state's exercise-progress/elapsed-time
  // readout — both computed here from existing lib/workout-log.ts helpers,
  // never a new calculation. Not ticking live (unlike the active-workout
  // screen's own clock): this is an at-a-glance hero card, not the workout
  // itself, so an elapsed time accurate as of the last Dashboard render is
  // enough.
  activeWorkout: ActiveWorkout | null;
  onStart: (dayIndex: number) => void;
  onResume: () => void;
  onGoToPlan: () => void;
  onGoToTemplates: () => void;
}

// PART 2: the one visually dominant hero card, whose content depends
// entirely on user state (State A/B/C) — never more than one primary
// button above the fold in any state.
export default function TodayWorkout({ info, activeWorkout, onStart, onResume, onGoToPlan, onGoToTemplates }: TodayWorkoutProps) {
  if (info.status === "no_plan") {
    return (
      <Card elevated className="flex flex-col items-center gap-3 text-center sm:items-start sm:text-left">
        <span
          className="flex h-11 w-11 items-center justify-center rounded-full bg-accent-soft text-accent"
          aria-hidden="true"
        >
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round">
            <path d="M6 12h12M9 8v8M15 8v8" />
          </svg>
        </span>
        <div>
          <h2 className="text-page-title text-text-primary">Build your first training plan</h2>
          <p className="mt-1 max-w-md text-body text-text-secondary">
            Answer a few quick questions about your goals and equipment and we&apos;ll build a personalized weekly
            plan for you.
          </p>
        </div>
        <div className="flex flex-wrap justify-center gap-2 sm:justify-start">
          <Button onClick={onGoToPlan}>Generate Plan</Button>
          <Button variant="secondary" onClick={onGoToTemplates}>
            Browse Templates
          </Button>
        </div>
      </Card>
    );
  }

  if (info.status === "resume") {
    const progress = activeWorkout ? getWorkoutCompletionProgress(activeWorkout.exercises) : null;
    const elapsedSeconds = activeWorkout ? computeDurationSeconds(activeWorkout.startedAt) : null;
    const progressPercent = progress && progress.totalExercises > 0 ? Math.round((progress.completedExercises / progress.totalExercises) * 100) : 0;

    return (
      <Card elevated className="border-accent/30 bg-accent-soft">
        <Badge tone="accent">In progress</Badge>
        <h2 className="mt-2 text-page-title text-text-primary">Resume your workout</h2>
        <p className="mt-1 text-body text-text-secondary">
          {info.dayTitle} · {info.dayFocus}
        </p>

        <div className="mt-3 flex flex-wrap items-center gap-3 text-xs font-medium text-text-secondary">
          {elapsedSeconds !== null && <span>Started {formatElapsedClock(elapsedSeconds)} ago</span>}
          {progress && (
            <span>
              {progress.completedExercises}/{progress.totalExercises} exercises done
            </span>
          )}
        </div>

        {progress && progress.totalExercises > 0 && (
          <div className="mt-2 h-2 w-full max-w-sm overflow-hidden rounded-full bg-surface">
            <div
              className="h-full rounded-full bg-accent motion-safe:transition-all motion-safe:duration-500"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        )}

        <Button onClick={onResume} className="mt-4 w-full sm:w-auto sm:px-8">
          Resume Workout
        </Button>
      </Card>
    );
  }

  return (
    <Card elevated>
      <p className="text-eyebrow">Today&apos;s workout</p>
      <h2 className="mt-1 text-page-title text-text-primary">{info.dayTitle}</h2>
      <p className="mt-1 text-body text-text-secondary">{info.dayFocus}</p>
      <div className="mt-3 flex flex-wrap gap-1.5">
        <Badge>~{info.estimatedDurationMinutes} min</Badge>
        <Badge>{info.exerciseCount} exercises</Badge>
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        <Button onClick={() => onStart(info.dayIndex)} className="w-full sm:w-auto sm:px-8">
          Start Workout
        </Button>
        <Button variant="secondary" onClick={onGoToPlan}>
          View Plan
        </Button>
      </div>
    </Card>
  );
}
