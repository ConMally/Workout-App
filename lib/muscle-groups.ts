import { getMuscleGroup, type MuscleGroup } from "./exercise-substitutions";

export type { MuscleGroup };
export { getMuscleGroup };

// Higher-level training categories built on top of the existing
// exercise-substitutions muscle-group taxonomy, for balance analysis. Note
// this taxonomy's "posterior_chain" bucket covers hamstrings, glutes, and
// lower-back hinge movements together — it isn't a true hamstrings
// isolation, so anywhere that distinction is surfaced it's labeled
// "posterior chain (hamstrings/glutes)" rather than claiming precision the
// underlying data doesn't have.

export const PUSH_GROUPS: MuscleGroup[] = ["chest", "shoulders", "triceps"];
export const PULL_GROUPS: MuscleGroup[] = ["back", "biceps"];
export const UPPER_GROUPS: MuscleGroup[] = ["chest", "back", "shoulders", "biceps", "triceps"];
export const LOWER_GROUPS: MuscleGroup[] = ["quads", "posterior_chain"];
export const ARM_GROUPS: MuscleGroup[] = ["biceps", "triceps"];

export const MUSCLE_GROUP_LABELS: Record<MuscleGroup, string> = {
  chest: "Chest",
  back: "Back",
  shoulders: "Shoulders",
  quads: "Quads",
  posterior_chain: "Posterior chain (hamstrings/glutes)",
  biceps: "Biceps",
  triceps: "Triceps",
  core: "Core",
};

export function isInGroup(group: MuscleGroup, set: MuscleGroup[]): boolean {
  return set.includes(group);
}
