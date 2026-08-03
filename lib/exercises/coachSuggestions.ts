import type { WorkoutPlan } from "@/types/workout";
import type { PlateauFinding, CoachRecommendation } from "@/types/analytics";
import { MOVEMENT_PATTERN_LABELS, MUSCLE_GROUP_LABELS } from "@/types/exercises";
import { rankReplacements } from "./replacement";
import { getDayEditingSuggestions } from "./suggestions";

// Phase 6's contribution to the AI Coach recommendation pipeline (see
// lib/analytics/coach.ts#getCoachRecommendations, which merges this in) —
// exercise-level suggestions: replace a stalled exercise with a ranked
// alternative, reduce movement-pattern overlap, add a missing movement,
// improve push/pull balance. Every finding here is either a direct
// reshaping of an existing deterministic check (lib/exercises/suggestions.ts
// for the per-day checks) or a lookup against the ranked replacement engine
// — never a new judgment call invented for this integration.

const MAX_STALL_REPLACEMENTS = 2;

// Turns a Phase 5 "exercise_stall" plateau finding into a concrete
// "replace exercise" recommendation, using the same ranked replacement
// engine PART 3's swap picker uses — so a stalled exercise gets a real,
// muscle/pattern-matched alternative, not just a generic "try something
// else" message.
function stallToReplacementRecommendation(finding: PlateauFinding): CoachRecommendation | null {
  const [best] = rankReplacements(finding.subject, { limit: 1 });
  if (!best) return null;

  return {
    id: `exercise-replace-${finding.subject}`,
    category: "exercise",
    priority: 2,
    title: finding.subject,
    message: `Try replacing ${finding.subject} with ${best.exercise.name} for a while.`,
    explanation: `${finding.subject} has stalled — ${best.exercise.name} works the same primary muscle with a different movement pattern, which can help break through a plateau.`,
  };
}

function dayFindingsToRecommendations(plan: WorkoutPlan): CoachRecommendation[] {
  const recommendations: CoachRecommendation[] = [];

  for (const day of plan.weeklySchedule) {
    for (const suggestion of getDayEditingSuggestions(day)) {
      if (suggestion.type === "duplicate_movement") {
        recommendations.push({
          id: `exercise-overlap-${day.title}-${suggestion.id}`,
          category: "exercise",
          priority: 4,
          title: day.title,
          message: `${day.title}: ${suggestion.message}`,
          explanation: suggestion.explanation,
        });
      } else if (suggestion.type === "missing_muscle_group" || suggestion.type === "push_pull_imbalance") {
        recommendations.push({
          id: `exercise-balance-${day.title}-${suggestion.id}`,
          category: "exercise",
          priority: 4,
          title: day.title,
          message: `${day.title}: ${suggestion.message}`,
          explanation: suggestion.explanation,
        });
      }
    }
  }

  return recommendations;
}

export function getExerciseCoachRecommendations(params: {
  plan: WorkoutPlan | null;
  plateaus: PlateauFinding[];
}): CoachRecommendation[] {
  const { plan, plateaus } = params;
  const recommendations: CoachRecommendation[] = [];

  const stallFindings = plateaus.filter((f) => f.type === "exercise_stall").slice(0, MAX_STALL_REPLACEMENTS);
  for (const finding of stallFindings) {
    const rec = stallToReplacementRecommendation(finding);
    if (rec) recommendations.push(rec);
  }

  if (plan) {
    recommendations.push(...dayFindingsToRecommendations(plan));
  }

  return recommendations;
}

// Referenced by ExerciseDetailModal/ReplacementPicker for display labels —
// re-exported here so callers don't need a second import from types/exercises.
export { MOVEMENT_PATTERN_LABELS, MUSCLE_GROUP_LABELS };
