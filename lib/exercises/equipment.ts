import type { WorkoutPlan } from "@/types/workout";
import type { EquipmentGap, EquipmentProfile, EquipmentProfileId } from "@/types/exercises";
import { getExerciseByName } from "./library";
import { rankReplacements } from "./replacement";

// Named presets over the existing onboarding EquipmentEnum (lib/schemas.ts)
// — no new equipment vocabulary, just convenient bundles of the same
// values onboarding already collects. "full_gym" is treated as a superset
// that satisfies any more specific tag.
export const EQUIPMENT_PROFILES: EquipmentProfile[] = [
  { id: "commercial_gym", label: "Commercial gym", equipment: ["full_gym", "barbell", "dumbbells", "cardio_machines", "pull_up_bar"] },
  { id: "home_gym", label: "Home gym", equipment: ["barbell", "dumbbells", "pull_up_bar", "resistance_bands"] },
  { id: "dumbbells_only", label: "Dumbbells only", equipment: ["dumbbells"] },
  { id: "bodyweight_only", label: "Bodyweight only", equipment: ["bodyweight_only"] },
  { id: "garage_gym", label: "Garage gym", equipment: ["barbell", "dumbbells", "kettlebells", "pull_up_bar"] },
];

export function getEquipmentProfile(id: EquipmentProfileId): EquipmentProfile {
  return EQUIPMENT_PROFILES.find((p) => p.id === id) ?? EQUIPMENT_PROFILES[0];
}

// Walks every exercise in a plan and flags the ones the new equipment
// profile can't support, each paired with the single best-ranked
// replacement (see replacement.ts) that *can* be performed with the new
// equipment — "immediately suggest compatible replacements" from PART 6.
// An exercise this library doesn't recognize (never generated/added
// through this app) is skipped rather than guessed at.
export function findEquipmentGaps(plan: WorkoutPlan, newEquipment: EquipmentProfile["equipment"]): EquipmentGap[] {
  const gaps: EquipmentGap[] = [];
  const seen = new Set<string>();

  for (const day of plan.weeklySchedule) {
    for (const planExercise of day.exercises) {
      if (seen.has(planExercise.name.toLowerCase())) continue;
      seen.add(planExercise.name.toLowerCase());

      const definition = getExerciseByName(planExercise.name);
      if (!definition) continue;

      const compatible = definition.equipment.some((e) => newEquipment.includes(e));
      if (compatible) continue;

      const [best] = rankReplacements(definition.name, { availableEquipment: newEquipment, limit: 1 });
      gaps.push({
        exerciseName: definition.name,
        reason: `Requires ${definition.equipment.join(" or ")}, which isn't in your new equipment selection.`,
        replacement: best ?? null,
      });
    }
  }

  return gaps;
}
