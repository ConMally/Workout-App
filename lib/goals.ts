import type { CompletedWorkout } from "@/types/workout-log";
import type { Goal, GoalProgress, GoalType } from "@/types/goals";
import { getStreakDays, getWeeklyProgress } from "./dashboard";
import { getExerciseStats } from "./insights";

// Goal current-value/progress is always computed live from history — never
// persisted — so it can never drift out of sync with the workouts a user
// has actually logged. Reuses getExerciseStats / getStreakDays /
// getWeeklyProgress rather than re-walking history with new logic.

export function createGoal(input: {
  type: GoalType;
  title: string;
  exerciseName?: string | null;
  targetValue: number;
  targetDate?: string | null;
}): Goal {
  return {
    id: crypto.randomUUID(),
    type: input.type,
    title: input.title,
    exerciseName: input.exerciseName ?? null,
    targetValue: input.targetValue,
    targetDate: input.targetDate ?? null,
    createdAt: new Date().toISOString(),
  };
}

function clampPercent(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)));
}

export function getGoalProgress(goal: Goal, history: CompletedWorkout[]): GoalProgress {
  let currentValue = 0;

  switch (goal.type) {
    case "exercise_weight":
      currentValue = goal.exerciseName ? getExerciseStats(history, goal.exerciseName).heaviestWeight : 0;
      break;
    case "exercise_one_rep_max":
      currentValue = goal.exerciseName ? getExerciseStats(history, goal.exerciseName).bestEstimatedOneRepMax : 0;
      break;
    case "workout_count":
      currentValue = history.length;
      break;
    case "weekly_frequency":
      currentValue = getWeeklyProgress(history).workoutsThisWeek;
      break;
    case "streak":
      currentValue = getStreakDays(history);
      break;
  }

  const progressPercent = goal.targetValue > 0 ? clampPercent((currentValue / goal.targetValue) * 100) : 0;
  return { currentValue, progressPercent, isComplete: currentValue >= goal.targetValue };
}

export const GOAL_TYPE_LABELS: Record<GoalType, string> = {
  exercise_weight: "Exercise weight",
  exercise_one_rep_max: "Estimated one-rep max",
  workout_count: "Total workouts",
  weekly_frequency: "Weekly frequency",
  streak: "Workout streak",
};

export function suggestGoalTitle(type: GoalType, exerciseName: string | null, targetValue: number): string {
  switch (type) {
    case "exercise_weight":
      return `Lift ${targetValue} on ${exerciseName ?? "an exercise"}`;
    case "exercise_one_rep_max":
      return `Reach a ${targetValue} estimated 1RM on ${exerciseName ?? "an exercise"}`;
    case "workout_count":
      return `Complete ${targetValue} total workouts`;
    case "weekly_frequency":
      return `Train ${targetValue} times per week`;
    case "streak":
      return `Reach a ${targetValue}-day streak`;
  }
}
