// Backed by the exercise_notes table (see supabase/migrations/0001_init.sql).
// Not called by any existing UI yet — no feature currently offers a
// standalone per-exercise journal, distinct from the per-set "note" field
// already embedded on logged exercises. Implemented in full per this
// phase's requirements so it's ready the moment a feature needs it.

export interface ExerciseNote {
  exerciseName: string;
  note: string;
  updatedAt: string;
}

export interface ExerciseNoteRepository {
  getNote(userId: string, exerciseName: string): Promise<ExerciseNote | null>;
  saveNote(userId: string, exerciseName: string, note: string): Promise<void>;
  deleteNote(userId: string, exerciseName: string): Promise<void>;
}
