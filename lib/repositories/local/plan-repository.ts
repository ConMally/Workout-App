import { clearSavedPlan, readSavedPlan, writeSavedPlan } from "@/lib/storage";
import type { PlanRepository } from "../plan-repository";

// Thin adapter over the existing localStorage functions — no new logic.
// userId is accepted for interface symmetry but ignored: localStorage is
// inherently single-scope (there is no "local account" beyond this browser).
export function createLocalPlanRepository(): PlanRepository {
  return {
    async getActivePlan() {
      return readSavedPlan();
    },
    async saveActivePlan(_userId, state) {
      writeSavedPlan(state);
    },
    async updateActivePlan(_userId, state) {
      writeSavedPlan(state);
    },
    async clearActivePlan() {
      clearSavedPlan();
    },
  };
}
