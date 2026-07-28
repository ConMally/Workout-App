import type { PlanRepository } from "./plan-repository";
import type { ActiveWorkoutRepository } from "./active-workout-repository";
import type { HistoryRepository } from "./history-repository";
import type { GoalRepository } from "./goal-repository";
import type { PRRepository } from "./pr-repository";
import type { ReadinessRepository } from "./readiness-repository";
import type { ExerciseNoteRepository } from "./exercise-note-repository";
import type { SettingsRepository } from "./settings-repository";
import type { SubstitutionRepository } from "./substitution-repository";
import type { TemplateRepository } from "./template-repository";

// The full set of workout-data repositories the app needs, bundled
// together so app/page.tsx (and anything else) can pick one bundle for
// "signed out" and one for "signed in" without wiring 8 separate hooks.
// Deliberately does not include ProfileRepository — that's account/profile
// data, already wired independently through app/account.
export interface Repositories {
  plan: PlanRepository;
  activeWorkout: ActiveWorkoutRepository;
  history: HistoryRepository;
  goals: GoalRepository;
  personalRecords: PRRepository;
  readiness: ReadinessRepository;
  exerciseNotes: ExerciseNoteRepository;
  settings: SettingsRepository;
  substitutions: SubstitutionRepository;
  templates: TemplateRepository;
}
