import type { Equipment, ExperienceLevel } from "@/lib/schemas";

// The Phase 6 exercise library's own domain types. This is a distinct,
// more granular taxonomy from lib/exercise-substitutions.ts's 8-group
// MuscleGroup (which lib/insights.ts's muscle-balance math already depends
// on and which this phase does not change) — Hamstrings/Glutes/Calves are
// split out here rather than folded into "posterior_chain". See
// lib/exercises/library.ts#toLegacyMuscleGroup for the mapping between the
// two, used anywhere this phase's data needs to talk to Phase 5's existing
// analytics.

export type MuscleGroup =
  | "chest"
  | "back"
  | "shoulders"
  | "biceps"
  | "triceps"
  | "quads"
  | "hamstrings"
  | "glutes"
  | "calves"
  | "core";

export const ALL_MUSCLE_GROUPS: MuscleGroup[] = [
  "chest",
  "back",
  "shoulders",
  "biceps",
  "triceps",
  "quads",
  "hamstrings",
  "glutes",
  "calves",
  "core",
];

export const MUSCLE_GROUP_LABELS: Record<MuscleGroup, string> = {
  chest: "Chest",
  back: "Back",
  shoulders: "Shoulders",
  biceps: "Biceps",
  triceps: "Triceps",
  quads: "Quads",
  hamstrings: "Hamstrings",
  glutes: "Glutes",
  calves: "Calves",
  core: "Core",
};

export type MovementPattern =
  | "horizontal_push"
  | "vertical_push"
  | "horizontal_pull"
  | "vertical_pull"
  | "squat"
  | "hinge"
  | "lunge"
  | "carry"
  | "isolation"
  | "core";

export const MOVEMENT_PATTERN_LABELS: Record<MovementPattern, string> = {
  horizontal_push: "Horizontal push",
  vertical_push: "Vertical push",
  horizontal_pull: "Horizontal pull",
  vertical_pull: "Vertical pull",
  squat: "Squat",
  hinge: "Hinge",
  lunge: "Lunge",
  carry: "Carry",
  isolation: "Isolation",
  core: "Core",
};

export type ExerciseCategory = "push" | "pull" | "legs" | "core";

export const EXERCISE_CATEGORY_LABELS: Record<ExerciseCategory, string> = {
  push: "Push",
  pull: "Pull",
  legs: "Legs",
  core: "Core",
};

export type ExerciseKind = "compound" | "isolation";
export type Laterality = "bilateral" | "unilateral";

// Re-exported rather than redefined — equipment tags and difficulty reuse
// the exact same vocabulary as onboarding (lib/schemas.ts's EquipmentEnum/
// ExperienceLevelEnum), so a plan's own equipment/experience settings can
// be compared against an exercise's requirements without a translation
// layer.
export type { Equipment, ExperienceLevel };

// Shared by every screen that displays an exercise's difficulty (Exercise
// Library detail modal, active-workout Exercise Guide) — previously
// duplicated as a local const in each (Phase 7 cleanup).
export const DIFFICULTY_LABELS: Record<ExperienceLevel, string> = {
  beginner: "Beginner",
  intermediate: "Intermediate",
  advanced: "Advanced",
};

export interface RepRange {
  min: number;
  max: number;
}

export interface RestRange {
  min: number;
  max: number;
}

// Optional and unpopulated for every seed exercise today — present so the
// UI (ExerciseDetailModal) and data shape are both ready for media without
// a schema change later (see PART 2 of the phase spec).
export interface ExerciseMedia {
  imageUrl?: string;
  videoUrl?: string;
  animationUrl?: string;
}

export interface ExerciseDefinition {
  id: string;
  name: string;
  primaryMuscle: MuscleGroup;
  secondaryMuscles: MuscleGroup[];
  movementPattern: MovementPattern;
  equipment: Equipment[]; // any one of these is sufficient to perform it
  difficulty: ExperienceLevel;
  kind: ExerciseKind;
  category: ExerciseCategory;
  laterality: Laterality;
  instructions: string[];
  coachingCues: string[];
  commonMistakes: string[];
  recommendedRepRange: RepRange;
  recommendedRestSeconds: RestRange;
  estimatedSetupSeconds: number;
  media?: ExerciseMedia;

  // Added when the library was expanded past the original 68-exercise seed
  // set — optional (not backfilled onto the original entries) so nothing
  // above breaks. New entries should populate all of these; see
  // lib/exercises/validate.ts for the dev-time check that enforces that.
  //
  // slug: a stable, URL/search-friendly identifier. For every exercise
  // added since the expansion this is identical to `id` (both are already
  // kebab-case) — kept as a distinct field rather than reusing `id`
  // directly so a future rename of `id`'s prefixing convention doesn't
  // silently change slugs anyone has linked to.
  slug?: string;
  // Alternate names this exercise is commonly known by — used by search
  // (lib/exercises/search.ts) so "JM press" style abbreviations and gym-
  // floor nicknames resolve to the same entry instead of reading as "not
  // found" or, worse, prompting someone to add a near-duplicate.
  aliases?: string[];
  // Positioning/equipment setup *before* the movement starts — kept
  // separate from `instructions` (the execution steps) per PART "clearly
  // distinguish setup from execution."
  setupInstructions?: string[];
  // A single sentence on the breathing pattern for the lift (when to
  // inhale/exhale relative to the concentric/eccentric phases).
  breathingGuidance?: string;
  // Non-medical safety notes specific to this exercise/equipment (e.g.
  // Smith-machine bar-hook safety, spotter guidance) — deliberately
  // distinct from commonMistakes (form errors) and never phrased as
  // medical advice.
  safetyNotes?: string[];
  // Curated, hand-picked substitute exercise IDs — always same
  // primaryMuscle, always real IDs in this database (validated by
  // lib/exercises/validate.ts). This is separate from, and does not
  // replace, the dynamic scoring in lib/exercises/replacement.ts — that
  // algorithm is what the in-app Replace flow actually uses; this field is
  // curated metadata for anything (docs, a future feature) that wants a
  // deliberately hand-picked list instead of a computed one.
  substitutionIds?: string[];
}

// ---------------------------------------------------------------------------
// Favorites — persisted (see supabase/migrations/0008_exercise_favorites.sql)
// ---------------------------------------------------------------------------

export interface ExerciseFavorite {
  exerciseId: string;
  createdAt: string;
}

// ---------------------------------------------------------------------------
// Replacement (PART 3)
// ---------------------------------------------------------------------------

export interface ReplacementCandidate {
  exercise: ExerciseDefinition;
  score: number; // 0-100, higher = closer match
  matchedOn: string[]; // human-readable reasons, e.g. "Same primary muscle"
}

// ---------------------------------------------------------------------------
// Equipment adaptation (PART 6)
// ---------------------------------------------------------------------------

export type EquipmentProfileId = "commercial_gym" | "home_gym" | "dumbbells_only" | "bodyweight_only" | "garage_gym";

export interface EquipmentProfile {
  id: EquipmentProfileId;
  label: string;
  equipment: Equipment[];
}

export interface EquipmentGap {
  exerciseName: string;
  reason: string;
  replacement: ReplacementCandidate | null;
}

// ---------------------------------------------------------------------------
// Comparison (PART 9)
// ---------------------------------------------------------------------------

export interface ExerciseComparison {
  a: ExerciseDefinition;
  b: ExerciseDefinition;
  sameMuscle: boolean;
  sameMovementPattern: boolean;
  strengthEmphasis: { a: "higher" | "similar" | "lower" };
  hypertrophyEmphasis: { a: "higher" | "similar" | "lower" };
  fatigueEstimate: { a: "higher" | "similar" | "lower" };
  recommendedGoals: { a: string[]; b: string[] };
}

// ---------------------------------------------------------------------------
// Smart suggestions while editing (PART 5)
// ---------------------------------------------------------------------------

export type PlanSuggestionType =
  | "volume_too_high"
  | "volume_too_low"
  | "duplicate_movement"
  | "missing_muscle_group"
  | "push_pull_imbalance";

export interface PlanSuggestion {
  id: string;
  type: PlanSuggestionType;
  message: string;
  explanation: string;
}

// ---------------------------------------------------------------------------
// Search (PART 7)
// ---------------------------------------------------------------------------

export interface ExerciseSearchFilters {
  query: string;
  muscle: MuscleGroup | "all";
  equipment: Equipment | "all";
  difficulty: ExperienceLevel | "all";
  movementPattern: MovementPattern | "all";
}

export const DEFAULT_EXERCISE_SEARCH_FILTERS: ExerciseSearchFilters = {
  query: "",
  muscle: "all",
  equipment: "all",
  difficulty: "all",
  movementPattern: "all",
};
