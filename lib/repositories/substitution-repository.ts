import type { SubstitutionHistory } from "@/lib/storage";

// Mirrors readSubstitutionHistory / writeSubstitutionHistory / clearSubstitutionHistory
// in lib/storage.ts. One blob per user (keyed by "dayIndex:exerciseIndex" ->
// already-shown replacement names), same shape locally and in the cloud —
// see supabase/migrations/0003_migration_support.sql's plan_substitution_history.
export interface SubstitutionRepository {
  getSubstitutionHistory(userId: string): Promise<SubstitutionHistory>;
  saveSubstitutionHistory(userId: string, history: SubstitutionHistory): Promise<void>;
  clearSubstitutionHistory(userId: string): Promise<void>;
}
