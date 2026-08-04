import type { Goal } from "@/types/goals";
import type { CompletedWorkout } from "@/types/workout-log";
import { getGoalProgress } from "@/lib/goals";

interface GoalProgressChartProps {
  goals: Goal[];
  history: CompletedWorkout[];
}

// Same horizontal-bar language as components/goals/GoalsPanel.tsx, kept as
// its own small component here rather than extracted/shared — this is a
// compact summary view for the Coach section (goal + percent only), not a
// replacement for GoalsPanel's full per-goal management UI.
export default function GoalProgressChart({ goals, history }: GoalProgressChartProps) {
  if (goals.length === 0) {
    return <p className="text-sm text-text-muted">No goals set yet.</p>;
  }

  return (
    <ul className="flex flex-col gap-3">
      {goals.map((goal) => {
        const progress = getGoalProgress(goal, history);
        return (
          <li key={goal.id}>
            <div className="flex items-center justify-between text-xs">
              <span className="font-medium text-text-secondary">{goal.title}</span>
              <span className={progress.isComplete ? "font-semibold text-accent" : "text-text-muted"}>
                {progress.isComplete ? "Complete" : `${progress.progressPercent}%`}
              </span>
            </div>
            <div
              role="progressbar"
              aria-label={goal.title}
              aria-valuenow={progress.progressPercent}
              aria-valuemin={0}
              aria-valuemax={100}
              className="mt-1 h-2 w-full overflow-hidden rounded-full bg-surface-muted"
            >
              <div
                className={`h-full rounded-full transition-all ${progress.isComplete ? "bg-accent" : "bg-accent/60"}`}
                style={{ width: `${progress.progressPercent}%` }}
              />
            </div>
          </li>
        );
      })}
    </ul>
  );
}
