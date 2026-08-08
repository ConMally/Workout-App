import type { ActiveWorkout, LoggedExercise } from "@/types/workout-log";

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
//   IMPORTANT: this method only ever upserts existing rows — it never
//   deletes/inserts exercise or set rows, and must never be called with an
//   exercises array whose length or membership has changed (that would
//   silently orphan rows in the cloud implementation, or is simply
//   redundant locally). Any add/remove/replace/reorder of the exercise list
//   itself MUST go through the dedicated methods below instead (Phase 11B).
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

  // ---------------------------------------------------------------------
  // Phase 11B: mid-workout exercise editing. Each of these is one atomic
  // operation (a transactional RPC in the Supabase implementation — see
  // supabase/migrations/0015_active_workout_editing.sql — and a single
  // synchronous localStorage write in the local implementation) that
  // mutates the exercise list itself, something saveActiveWorkout above is
  // explicitly not safe to be used for.
  // ---------------------------------------------------------------------

  // Inserts a brand-new exercise (with target-sets-many fresh, unlogged
  // sets) into the workout. Never touches any existing exercise's own
  // fields/sets — only its position may shift to make room. See
  // NewActiveWorkoutExerciseInput#insertAfterExerciseId for placement.
  addExercise(userId: string, workoutId: string, input: NewActiveWorkoutExerciseInput): Promise<LoggedExercise>;

  // Two distinct, mutually exclusive modes selected by the caller via
  // `input.keepCompleted` (see ReplaceActiveWorkoutExerciseInput) — the
  // caller is responsible for knowing whether the exercise being replaced
  // has any completed sets (getExerciseCompletion) and choosing the correct
  // mode; both implementations re-validate this server/locally-side and
  // reject a mismatched call rather than silently discarding logged sets.
  replaceExercise(
    userId: string,
    workoutId: string,
    exerciseId: string,
    input: ReplaceActiveWorkoutExerciseInput
  ): Promise<ReplaceActiveWorkoutExerciseResult>;

  // Removes an exercise (and its set rows) entirely and renormalizes the
  // remaining exercises' order. Rejected (by both implementations) if this
  // would remove the workout's last remaining exercise.
  deleteExercise(userId: string, workoutId: string, exerciseId: string): Promise<void>;

  // Persists a full reordering of the exercise list, given as an ordered
  // list of every existing exercise id. Rejected if the id list doesn't
  // exactly match the workout's current exercises (stale caller state).
  reorderExercises(userId: string, workoutId: string, exerciseIds: string[]): Promise<void>;
}

export interface NewActiveWorkoutExerciseInput {
  name: string;
  exerciseId: string | null;
  targetSets: number;
  targetReps: string;
  targetRestSeconds: number;
  note: string;
  // Phase 11C: the existing exercise's stable id to insert the new one
  // immediately after — never a raw array index (PART 4: "do not use array
  // position as permanent identity"). null/undefined appends to the end,
  // 0015's original and still-default behavior for a caller with no
  // meaningful "current exercise" (e.g. no valid current exercise to insert
  // after). Both implementations re-validate that this id still belongs to
  // the workout being edited before using it, and reject rather than
  // silently reinterpreting it if it doesn't (a stale id from an exercise
  // deleted between opening and confirming the Add flow) — see
  // supabase/migrations/0016_active_workout_insert_position.sql and
  // lib/repositories/local/active-workout-repository.ts#addExercise.
  insertAfterExerciseId?: string | null;
}

export interface ReplaceActiveWorkoutExerciseInput {
  name: string;
  exerciseId: string | null;
  targetSets: number;
  targetReps: string;
  targetRestSeconds: number;
  // false ("in place"): only valid when the exercise being replaced has
  // zero completed sets — its identity fields and sets are overwritten
  // directly, same row id.
  // true ("keep completed sets"): only valid when it has at least one
  // completed set — the original row is truncated to just those completed
  // sets and marked complete (never deleted, never renamed), and the
  // replacement is inserted as a new exercise immediately after it. See
  // PART 4 of the phase spec: option B ("replace only the remaining
  // unfinished sets" as a single exercise identity) was deliberately not
  // implemented — the data model has no concept of a single LoggedExercise
  // whose sets belong to two different exercise identities, and building
  // one would mean either splitting one exercise's `sets` array across two
  // different `name`/`exerciseId` values (nothing else in the app expects
  // that) or fabricating a synthetic combined identity for PR
  // detection/history (lib/progression.ts matches purely by exercise name,
  // and would misattribute or double-count). Both are the "fragile
  // workaround" the spec says not to build — this keep-completed mode (A)
  // plus Cancel is the actual implemented pair.
  keepCompleted: boolean;
}

export interface ReplaceActiveWorkoutExerciseResult {
  // The original exercise row, post-update — same id in both modes. In
  // "in place" mode this IS the replacement (new name/exerciseId/sets). In
  // "keep completed" mode this is the original exercise, truncated to its
  // completed sets and marked complete.
  replaced: LoggedExercise;
  // The newly-inserted replacement exercise — present only in
  // "keep completed" mode (null in "in place" mode, since there the
  // existing row already became the replacement).
  added: LoggedExercise | null;
}
