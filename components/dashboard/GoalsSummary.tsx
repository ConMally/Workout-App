import { useMemo } from "react";
import type { Goal } from "@/types/goals";
import type { CompletedWorkout } from "@/types/workout-log";
import { GOAL_TYPE_LABELS, getGoalProgress } from "@/lib/goals";
import Card from "@/components/ui/Card";

interface GoalsSummaryProps {
  goals: Goal[];
  history: CompletedWorkout[];
  onGoToInsights: () => void;
}

const MAX_GOALS_SHOWN = 3;

// PART 6: up to three active goals, concise, with a direct link to manage
// the rest — never the Dashboard's most dominant section.
export default function GoalsSummary({ goals, history, onGoToInsights }: GoalsSummaryProps) {
  // Same walk-once-per-change pattern as GoalsPanel — a full history walk
  // per goal, memoized so it doesn't repeat on unrelated Dashboard re-renders.
  const topGoals = useMemo(() => {
    return goals
      .map((goal) => ({ goal, progress: getGoalProgress(goal, history) }))
      .sort((a, b) => Number(a.progress.isComplete) - Number(b.progress.isComplete))
      .slice(0, MAX_GOALS_SHOWN);
  }, [goals, history]);

  return (
    <Card>
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-label">Goals</h3>
        <button type="button" onClick={onGoToInsights} className="text-xs font-semibold text-accent hover:underline">
          Manage goals →
        </button>
      </div>

      {goals.length === 0 ? (
        <p className="mt-3 text-sm text-text-muted">No goals yet — set a strength or consistency target from Insights.</p>
      ) : (
        <ul className="mt-3 flex flex-col gap-3">
          {topGoals.map(({ goal, progress }) => (
            <li key={goal.id}>
              <div className="flex items-center justify-between gap-2 text-xs text-text-secondary">
                <span className="truncate font-medium text-text-primary">{goal.title}</span>
                <span className="flex-shrink-0 font-semibold">
                  {progress.isComplete ? "Complete" : `${progress.currentValue} / ${goal.targetValue}`}
                </span>
              </div>
              <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-surface-muted">
                <div
                  className="h-full rounded-full bg-accent motion-safe:transition-all motion-safe:duration-500"
                  style={{ width: `${progress.progressPercent}%` }}
                />
              </div>
              <p className="mt-0.5 text-xs text-text-muted">{GOAL_TYPE_LABELS[goal.type]}</p>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
