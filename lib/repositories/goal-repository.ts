import type { Goal } from "@/types/goals";

// Mirrors readGoals / writeGoals in lib/storage.ts and the create/update/
// delete flows already used by components/goals/GoalsPanel.tsx. Current
// value and progress percentage are intentionally not part of this
// interface — lib/goals.ts#getGoalProgress always computes them live from
// history, and that stays true regardless of where goals are stored.
export interface GoalRepository {
  listGoals(userId: string): Promise<Goal[]>;
  createGoal(userId: string, goal: Goal): Promise<void>;
  updateGoal(userId: string, goal: Goal): Promise<void>;
  deleteGoal(userId: string, goalId: string): Promise<void>;
}
