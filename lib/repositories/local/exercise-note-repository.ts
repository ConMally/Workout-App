import type { ExerciseNoteRepository } from "../exercise-note-repository";

// Standalone per-exercise notes have no localStorage equivalent — no
// feature has ever used them locally. Every method is a safe, documented
// no-op rather than a silent partial implementation.
export function createLocalExerciseNoteRepository(): ExerciseNoteRepository {
  return {
    async getNote() {
      return null;
    },
    async saveNote() {
      // no-op — see file comment.
    },
    async deleteNote() {
      // no-op — see file comment.
    },
  };
}
