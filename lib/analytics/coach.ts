import type { Recommendation } from "@/types/insights";
import type { CoachRecommendation, OverloadTarget, PlateauFinding, RecoveryResult } from "@/types/analytics";

// Combines this phase's new plateau/overload/recovery findings with the
// existing, already-working recommendation engine in lib/insights.ts —
// InsightsPage's push/pull-balance and neglected-group candidates are
// reused as-is (mapped into CoachRecommendation shape) rather than
// reimplemented a second time. Every recommendation's `id` is deterministic
// (derived from its source finding, never random), which is what lets the
// Coach section's dismiss action stay meaningful: a dismissed
// recommendation only reappears if its underlying condition actually
// changes and produces a different id, or after a fresh page load — never
// just because the list was recomputed with identical inputs.

const MAX_PROGRESSION_RECOMMENDATIONS = 2;

function plateauToRecommendation(finding: PlateauFinding): CoachRecommendation {
  const categoryByType: Record<PlateauFinding["type"], CoachRecommendation["category"]> = {
    exercise_stall: "plateau",
    declining_volume: "plateau",
    missed_workouts: "consistency",
    declining_readiness: "readiness",
    overtraining: "recovery",
  };
  const priorityByType: Record<PlateauFinding["type"], number> = {
    overtraining: 1,
    declining_readiness: 2,
    exercise_stall: 3,
    declining_volume: 3,
    missed_workouts: 4,
  };

  return {
    id: `plateau-${finding.id}`,
    category: categoryByType[finding.type],
    priority: priorityByType[finding.type],
    title: finding.subject,
    message: finding.message,
    explanation: finding.explanation,
  };
}

function overloadToRecommendation(target: OverloadTarget): CoachRecommendation | null {
  if (target.direction !== "increase" || target.nextWeight === null) return null;
  return {
    id: `progression-${target.exerciseName}`,
    category: "progression",
    priority: 2,
    title: target.exerciseName,
    message: `Increase ${target.exerciseName} to ${target.nextWeight} next session.`,
    explanation: target.reasoning,
  };
}

function recoveryToRecommendation(recovery: RecoveryResult): CoachRecommendation | null {
  if (!recovery.hasEnoughData) return null;
  if (recovery.status !== "fatigued" && recovery.status !== "overreaching") return null;

  return {
    id: `recovery-${recovery.status}`,
    category: "recovery",
    priority: recovery.status === "overreaching" ? 1 : 2,
    title: "Recovery",
    message:
      recovery.status === "overreaching"
        ? "You're overreaching. Consider a deload week before your next hard session."
        : "You're showing signs of fatigue. An easier session or extra rest day could help.",
    explanation: recovery.reasons.join(" "),
  };
}

function existingToRecommendation(rec: Recommendation): CoachRecommendation {
  const category: CoachRecommendation["category"] = rec.id.startsWith("readiness")
    ? "readiness"
    : rec.id.startsWith("muscle-imbalance")
      ? "muscle_balance"
      : rec.id.startsWith("weekly-goal") || rec.id.startsWith("neglected")
        ? "consistency"
        : rec.id.startsWith("progression")
          ? "progression"
          : "consistency";

  // Offset so these never outrank a genuine plateau/recovery/progression
  // finding above at the same nominal priority — they're a useful fallback
  // layer, not the primary signal.
  return { id: `insights-${rec.id}`, category, priority: rec.priority + 10, title: category, message: rec.message, explanation: rec.explanation };
}

export function getCoachRecommendations(params: {
  plateaus: PlateauFinding[];
  overloadTargets: OverloadTarget[];
  recovery: RecoveryResult;
  existingRecommendations: Recommendation[];
  // Phase 6's exercise-level suggestions (lib/exercises/coachSuggestions.ts)
  // — replace-a-stalled-exercise, reduce movement overlap, add a missing
  // movement. Optional so this function still works for any caller that
  // predates Phase 6.
  exerciseRecommendations?: CoachRecommendation[];
}): CoachRecommendation[] {
  const { plateaus, overloadTargets, recovery, existingRecommendations, exerciseRecommendations = [] } = params;

  const candidates: CoachRecommendation[] = [];

  // A stalled exercise that Phase 6 could find a ranked replacement for
  // gets the richer, actionable "try replacing X with Y" recommendation
  // instead of the plainer "X has stalled" one — never both, to avoid
  // showing the same underlying issue twice.
  const exerciseNamesWithReplacement = new Set(
    exerciseRecommendations.filter((r) => r.id.startsWith("exercise-replace-")).map((r) => r.title)
  );
  const plateauRecs = plateaus
    .filter((f) => !(f.type === "exercise_stall" && exerciseNamesWithReplacement.has(f.subject)))
    .map(plateauToRecommendation);
  candidates.push(...plateauRecs);

  const progressionRecs = overloadTargets
    .map(overloadToRecommendation)
    .filter((r): r is CoachRecommendation => r !== null)
    .slice(0, MAX_PROGRESSION_RECOMMENDATIONS);
  candidates.push(...progressionRecs);

  const recoveryRec = recoveryToRecommendation(recovery);
  if (recoveryRec) candidates.push(recoveryRec);

  candidates.push(...exerciseRecommendations);

  // Skip the existing engine's own low-data fallback ("Log more workouts…")
  // here — this list already has its own empty-state handling in the UI,
  // and duplicating that message alongside real findings would be noise.
  candidates.push(
    ...existingRecommendations.filter((r) => r.id !== "low-data-fallback").map(existingToRecommendation)
  );

  // Stable de-dupe by id (first occurrence wins) in case the same
  // underlying condition surfaced through two paths.
  const seen = new Set<string>();
  const deduped = candidates.filter((c) => {
    if (seen.has(c.id)) return false;
    seen.add(c.id);
    return true;
  });

  return deduped.sort((a, b) => a.priority - b.priority);
}
