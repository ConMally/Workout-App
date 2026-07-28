import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import type { Repositories } from "../types";
import { createSupabasePlanRepository } from "./plan-repository";
import { createSupabaseActiveWorkoutRepository } from "./active-workout-repository";
import { createSupabaseHistoryRepository } from "./history-repository";
import { createSupabaseGoalRepository } from "./goal-repository";
import { createSupabasePRRepository } from "./pr-repository";
import { createSupabaseReadinessRepository } from "./readiness-repository";
import { createSupabaseExerciseNoteRepository } from "./exercise-note-repository";
import { createSupabaseSettingsRepository } from "./settings-repository";
import { createSupabaseSubstitutionRepository } from "./substitution-repository";
import { createSupabaseTemplateRepository } from "./template-repository";

export function createSupabaseRepositories(client: SupabaseClient<Database>): Repositories {
  return {
    plan: createSupabasePlanRepository(client),
    activeWorkout: createSupabaseActiveWorkoutRepository(client),
    history: createSupabaseHistoryRepository(client),
    goals: createSupabaseGoalRepository(client),
    personalRecords: createSupabasePRRepository(client),
    readiness: createSupabaseReadinessRepository(client),
    exerciseNotes: createSupabaseExerciseNoteRepository(client),
    settings: createSupabaseSettingsRepository(client),
    substitutions: createSupabaseSubstitutionRepository(client),
    templates: createSupabaseTemplateRepository(client),
  };
}
