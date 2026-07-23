import { readGoals, writeGoals } from "@/lib/storage";
import type { GoalRepository } from "../goal-repository";

export function createLocalGoalRepository(): GoalRepository {
  return {
    async listGoals() {
      return readGoals();
    },
    async createGoal(_userId, goal) {
      writeGoals([goal, ...readGoals()]);
    },
    async updateGoal(_userId, goal) {
      writeGoals(readGoals().map((g) => (g.id === goal.id ? goal : g)));
    },
    async deleteGoal(_userId, goalId) {
      writeGoals(readGoals().filter((g) => g.id !== goalId));
    },
  };
}
