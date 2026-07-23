import type { Repositories } from "../types";
import { createLocalPlanRepository } from "./plan-repository";
import { createLocalActiveWorkoutRepository } from "./active-workout-repository";
import { createLocalHistoryRepository } from "./history-repository";
import { createLocalGoalRepository } from "./goal-repository";
import { createLocalPRRepository } from "./pr-repository";
import { createLocalReadinessRepository } from "./readiness-repository";
import { createLocalExerciseNoteRepository } from "./exercise-note-repository";
import { createLocalSettingsRepository } from "./settings-repository";
import { createLocalSubstitutionRepository } from "./substitution-repository";

// Every local repository is a stateless adapter over lib/storage.ts, so
// one shared instance is safe to reuse across the whole app.
export const localRepositories: Repositories = {
  plan: createLocalPlanRepository(),
  activeWorkout: createLocalActiveWorkoutRepository(),
  history: createLocalHistoryRepository(),
  goals: createLocalGoalRepository(),
  personalRecords: createLocalPRRepository(),
  readiness: createLocalReadinessRepository(),
  exerciseNotes: createLocalExerciseNoteRepository(),
  settings: createLocalSettingsRepository(),
  substitutions: createLocalSubstitutionRepository(),
};
