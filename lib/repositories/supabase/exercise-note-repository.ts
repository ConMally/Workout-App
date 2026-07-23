import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import type { ExerciseNote, ExerciseNoteRepository } from "../exercise-note-repository";

type ExerciseNoteRow = Database["public"]["Tables"]["exercise_notes"]["Row"];

function toExerciseNote(row: ExerciseNoteRow): ExerciseNote {
  return {
    exerciseName: row.exercise_name,
    note: row.note,
    updatedAt: row.updated_at,
  };
}

export function createSupabaseExerciseNoteRepository(client: SupabaseClient<Database>): ExerciseNoteRepository {
  return {
    async getNote(userId: string, exerciseName: string): Promise<ExerciseNote | null> {
      const { data, error } = await client
        .from("exercise_notes")
        .select("*")
        .eq("user_id", userId)
        .eq("exercise_name", exerciseName)
        .maybeSingle();

      if (error) throw error;
      return data ? toExerciseNote(data) : null;
    },

    // No unique constraint on (user_id, exercise_name) to upsert against
    // (see 0001_init.sql), so this does an explicit find-then-write.
    async saveNote(userId: string, exerciseName: string, note: string): Promise<void> {
      const { data: existing, error: findError } = await client
        .from("exercise_notes")
        .select("id")
        .eq("user_id", userId)
        .eq("exercise_name", exerciseName)
        .maybeSingle();

      if (findError) throw findError;

      if (existing) {
        const { error } = await client.from("exercise_notes").update({ note }).eq("id", existing.id);
        if (error) throw error;
        return;
      }

      const { error } = await client.from("exercise_notes").insert({
        user_id: userId,
        exercise_name: exerciseName,
        note,
      });
      if (error) throw error;
    },

    async deleteNote(userId: string, exerciseName: string): Promise<void> {
      const { error } = await client
        .from("exercise_notes")
        .delete()
        .eq("user_id", userId)
        .eq("exercise_name", exerciseName);

      if (error) throw error;
    },
  };
}
