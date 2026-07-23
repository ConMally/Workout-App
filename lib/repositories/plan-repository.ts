import type { SavedPlanState } from "@/lib/storage";

// Mirrors readSavedPlan / writeSavedPlan / clearSavedPlan in lib/storage.ts.
// Reuses the existing SavedPlanState shape rather than a new DB-flavored
// type, so swapping the implementation never requires touching callers.
//
// saveActivePlan vs. updateActivePlan: generating or regenerating a plan is
// a new plan *identity* (saveActivePlan — the cloud implementation retires
// any previous active plan and creates a fresh one); swapping a single
// exercise keeps the same plan identity and just changes its content
// (updateActivePlan). Local (localStorage) mode has no plan-identity
// concept, so both simply overwrite the one stored plan.
export interface PlanRepository {
  getActivePlan(userId: string): Promise<SavedPlanState | null>;
  saveActivePlan(userId: string, state: SavedPlanState): Promise<void>;
  updateActivePlan(userId: string, state: SavedPlanState): Promise<void>;
  clearActivePlan(userId: string): Promise<void>;
}
