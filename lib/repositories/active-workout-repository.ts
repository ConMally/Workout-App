import type { ActiveWorkout } from "@/types/workout-log";

// Mirrors readActiveWorkout / writeActiveWorkout / clearActiveWorkout in
// lib/storage.ts. At most one active workout per user, same as today.
//
// - createActiveWorkout: starting a new workout (fresh identity).
// - saveActiveWorkout: the continuous "user is logging sets" flow — the
//   existing ActiveWorkout/ExerciseLogger components already do immutable
//   whole-object updates and call one onChange with the full object, so
//   this takes the whole object too (the cloud implementation diffs it
//   internally against what's stored, upserting by natural key — see
//   lib/repositories/supabase/active-workout-repository.ts — rather than
//   exposing separate log-set/update-set/delete-set methods that nothing
//   would ever call independently given that existing component contract).
//
// Finishing a workout is *not* a method here — app/page.tsx composes it
// from three independent, already-meaningful calls: HistoryRepository's
// addCompletedWorkout, PRRepository's recordPersonalRecords (fed the
// events lib/progression.ts already computed — never recomputed in a
// repository), and this interface's clearActiveWorkout. That mirrors
// exactly how it already works today (writeHistory + clearActiveWorkout)
// and avoids a composite method whose only job would be to call three
// other repositories internally.
export interface ActiveWorkoutRepository {
  getActiveWorkout(userId: string): Promise<ActiveWorkout | null>;
  createActiveWorkout(userId: string, workout: ActiveWorkout): Promise<void>;
  saveActiveWorkout(userId: string, workout: ActiveWorkout): Promise<void>;
  clearActiveWorkout(userId: string): Promise<void>;
}
