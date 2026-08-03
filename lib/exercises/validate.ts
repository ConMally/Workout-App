import { EquipmentEnum, ExperienceLevelEnum } from "@/lib/schemas";
import { ALL_MUSCLE_GROUPS, EXERCISE_CATEGORY_LABELS, MOVEMENT_PATTERN_LABELS } from "@/types/exercises";
import { EXERCISE_DATABASE } from "./data";

// Dev-time-only data integrity check for the static exercise library
// (see data.ts's header comment for why this is code, not a table). Not
// imported by any page/component — run it on demand with `npm run
// validate:exercises` after editing data.ts, or import
// validateExerciseDatabase() directly wherever useful (e.g. a future test).

export interface ExerciseValidationIssue {
  exerciseId: string;
  message: string;
}

// ExerciseKind/Laterality have no exported runtime const in types/exercises.ts
// (unlike MuscleGroup/MovementPattern/ExerciseCategory, which do) — mirror
// their literal unions here. Keep in sync with types/exercises.ts if those
// unions ever change.
const VALID_KINDS = new Set(["compound", "isolation"]);
const VALID_LATERALITIES = new Set(["bilateral", "unilateral"]);

const VALID_MUSCLE_GROUPS = new Set<string>(ALL_MUSCLE_GROUPS);
const VALID_MOVEMENT_PATTERNS = new Set<string>(Object.keys(MOVEMENT_PATTERN_LABELS));
const VALID_CATEGORIES = new Set<string>(Object.keys(EXERCISE_CATEGORY_LABELS));
const VALID_EQUIPMENT = new Set<string>(EquipmentEnum.options);
const VALID_DIFFICULTIES = new Set<string>(ExperienceLevelEnum.options);

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isNonEmptyStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.length > 0 && value.every((v) => isNonEmptyString(v));
}

export function validateExerciseDatabase(exercises: ExerciseDefinitionLike[] = EXERCISE_DATABASE): ExerciseValidationIssue[] {
  const issues: ExerciseValidationIssue[] = [];

  const idCounts = new Map<string, number>();
  const slugCounts = new Map<string, number>();
  const nameCounts = new Map<string, number>();
  // Every name and alias (lowercased) an exercise resolves under, mapped to
  // the exercise id(s) that claim it — used to catch aliases that collide
  // with another exercise's canonical name or another exercise's alias
  // (library.ts's BY_NAME map silently lets the first-registered canonical
  // name win a collision; this check surfaces that instead of hiding it).
  const nameOrAliasOwners = new Map<string, string[]>();

  for (const exercise of exercises) {
    idCounts.set(exercise.id, (idCounts.get(exercise.id) ?? 0) + 1);
    if (exercise.slug) slugCounts.set(exercise.slug, (slugCounts.get(exercise.slug) ?? 0) + 1);
    const lowerName = exercise.name.toLowerCase();
    nameCounts.set(lowerName, (nameCounts.get(lowerName) ?? 0) + 1);

    const owners = nameOrAliasOwners.get(lowerName) ?? [];
    owners.push(exercise.id);
    nameOrAliasOwners.set(lowerName, owners);

    for (const alias of exercise.aliases ?? []) {
      const key = alias.toLowerCase();
      const aliasOwners = nameOrAliasOwners.get(key) ?? [];
      aliasOwners.push(exercise.id);
      nameOrAliasOwners.set(key, aliasOwners);
    }
  }

  for (const [id, count] of idCounts) {
    if (count > 1) issues.push({ exerciseId: id, message: `Duplicate id "${id}" appears ${count} times` });
  }
  for (const [slug, count] of slugCounts) {
    if (count > 1) issues.push({ exerciseId: slug, message: `Duplicate slug "${slug}" appears ${count} times` });
  }
  for (const [name, count] of nameCounts) {
    if (count > 1) issues.push({ exerciseId: name, message: `Duplicate canonical name "${name}" appears ${count} times` });
  }
  for (const [nameOrAlias, owners] of nameOrAliasOwners) {
    const uniqueOwners = new Set(owners);
    if (uniqueOwners.size > 1) {
      issues.push({
        exerciseId: [...uniqueOwners].join(", "),
        message: `"${nameOrAlias}" is claimed by more than one exercise (as a name or alias) — search would return an ambiguous match`,
      });
    }
  }

  const byId = new Map(exercises.map((e) => [e.id, e]));

  for (const exercise of exercises) {
    const required: [string, unknown][] = [
      ["name", exercise.name],
      ["primaryMuscle", exercise.primaryMuscle],
      ["movementPattern", exercise.movementPattern],
      ["difficulty", exercise.difficulty],
      ["kind", exercise.kind],
      ["category", exercise.category],
      ["laterality", exercise.laterality],
    ];
    for (const [field, value] of required) {
      if (!isNonEmptyString(value)) issues.push({ exerciseId: exercise.id, message: `Missing required field "${field}"` });
    }
    if (!isNonEmptyStringArray(exercise.instructions)) {
      issues.push({ exerciseId: exercise.id, message: "Missing or empty required field \"instructions\"" });
    }
    if (!isNonEmptyStringArray(exercise.coachingCues)) {
      issues.push({ exerciseId: exercise.id, message: "Missing or empty required field \"coachingCues\"" });
    }
    if (!isNonEmptyStringArray(exercise.commonMistakes)) {
      issues.push({ exerciseId: exercise.id, message: "Missing or empty required field \"commonMistakes\"" });
    }
    if (!Array.isArray(exercise.equipment) || exercise.equipment.length === 0) {
      issues.push({ exerciseId: exercise.id, message: "Missing or empty required field \"equipment\"" });
    }

    // Fields added for exercises past the original seed set — required for
    // any exercise that opts into them (see ExerciseDefinition's comment),
    // so only enforced when at least one is present, rather than on every
    // entry in the database.
    const usesExpandedFields = exercise.slug !== undefined || exercise.setupInstructions !== undefined || exercise.substitutionIds !== undefined;
    if (usesExpandedFields) {
      if (!isNonEmptyString(exercise.slug)) issues.push({ exerciseId: exercise.id, message: "Missing required field \"slug\"" });
      if (!isNonEmptyStringArray(exercise.setupInstructions)) {
        issues.push({ exerciseId: exercise.id, message: "Missing or empty required field \"setupInstructions\"" });
      }
      if (!isNonEmptyString(exercise.breathingGuidance)) {
        issues.push({ exerciseId: exercise.id, message: "Missing required field \"breathingGuidance\"" });
      }
    }

    if (exercise.primaryMuscle && !VALID_MUSCLE_GROUPS.has(exercise.primaryMuscle)) {
      issues.push({ exerciseId: exercise.id, message: `Invalid primaryMuscle "${exercise.primaryMuscle}"` });
    }
    for (const muscle of exercise.secondaryMuscles ?? []) {
      if (!VALID_MUSCLE_GROUPS.has(muscle)) issues.push({ exerciseId: exercise.id, message: `Invalid secondaryMuscle "${muscle}"` });
    }
    if (exercise.movementPattern && !VALID_MOVEMENT_PATTERNS.has(exercise.movementPattern)) {
      issues.push({ exerciseId: exercise.id, message: `Invalid movementPattern "${exercise.movementPattern}"` });
    }
    if (exercise.category && !VALID_CATEGORIES.has(exercise.category)) {
      issues.push({ exerciseId: exercise.id, message: `Invalid category "${exercise.category}"` });
    }
    if (exercise.kind && !VALID_KINDS.has(exercise.kind)) {
      issues.push({ exerciseId: exercise.id, message: `Invalid kind "${exercise.kind}"` });
    }
    if (exercise.laterality && !VALID_LATERALITIES.has(exercise.laterality)) {
      issues.push({ exerciseId: exercise.id, message: `Invalid laterality "${exercise.laterality}"` });
    }
    if (exercise.difficulty && !VALID_DIFFICULTIES.has(exercise.difficulty)) {
      issues.push({ exerciseId: exercise.id, message: `Invalid difficulty "${exercise.difficulty}"` });
    }
    for (const item of exercise.equipment ?? []) {
      if (!VALID_EQUIPMENT.has(item)) issues.push({ exerciseId: exercise.id, message: `Invalid equipment value "${item}"` });
    }

    for (const subId of exercise.substitutionIds ?? []) {
      const target = byId.get(subId);
      if (!target) {
        issues.push({ exerciseId: exercise.id, message: `substitutionIds references unknown id "${subId}"` });
      } else if (target.primaryMuscle !== exercise.primaryMuscle) {
        issues.push({
          exerciseId: exercise.id,
          message: `substitutionIds references "${subId}" whose primaryMuscle ("${target.primaryMuscle}") doesn't match this exercise's ("${exercise.primaryMuscle}")`,
        });
      }
    }
  }

  return issues;
}

// Loosely typed so this file can validate any array shaped like the real
// ExerciseDefinition without creating a hard runtime dependency on the
// `@/types/exercises` module graph — only the fields this validator reads
// are declared.
interface ExerciseDefinitionLike {
  id: string;
  slug?: string;
  name: string;
  aliases?: string[];
  primaryMuscle: string;
  secondaryMuscles?: string[];
  movementPattern: string;
  equipment: string[];
  difficulty: string;
  kind: string;
  category: string;
  laterality: string;
  instructions: string[];
  setupInstructions?: string[];
  breathingGuidance?: string;
  coachingCues: string[];
  commonMistakes: string[];
  substitutionIds?: string[];
}
