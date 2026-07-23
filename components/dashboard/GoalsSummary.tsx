import { useMemo } from "react";
import type { Goal } from "@/types/goals";
import type { CompletedWorkout } from "@/types/workout-log";
import { GOAL_TYPE_LABELS, getGoalProgress } from "@/lib/goals";

interface GoalsSummaryProps {
  goals: Goal[];
  history: CompletedWorkout[];
  onGoToInsights: () => void;
}

const MAX_GOALS_SHOWN = 3;

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
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Goals</h3>
        <button type="button" onClick={onGoToInsights} className="text-xs font-semibold text-teal-700 hover:underline">
          View all
        </button>
      </div>

      {goals.length === 0 ? (
        <p className="mt-3 text-sm text-slate-400">
          No goals yet — set a strength or consistency target from Insights.
        </p>
      ) : (
        <ul className="mt-3 flex flex-col gap-3">
          {topGoals.map(({ goal, progress }) => (
            <li key={goal.id}>
              <div className="flex items-center justify-between gap-2 text-xs text-slate-500">
                <span className="truncate font-medium text-slate-700">{goal.title}</span>
                <span className="flex-shrink-0">
                  {progress.isComplete ? "Complete" : `${progress.progressPercent}%`}
                </span>
              </div>
              <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-slate-100">
                <div
                  className="h-full rounded-full bg-teal-500 motion-safe:transition-all motion-safe:duration-500"
                  style={{ width: `${progress.progressPercent}%` }}
                />
              </div>
              <p className="mt-0.5 text-xs text-slate-400">{GOAL_TYPE_LABELS[goal.type]}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
