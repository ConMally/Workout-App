import type { WorkoutPlan } from "@/types/workout";
import type { CompletedWorkout } from "@/types/workout-log";
import type { NeglectedMuscleGroup, ReadinessTrendResult } from "@/types/insights";
import type { ConsistencyAnalytics, PlateauFinding, VolumeAnalytics } from "@/types/analytics";
import { addDays, startOfDay } from "@/lib/dashboard";
import { listExercisesWithHistory } from "@/lib/insights";
import { getExerciseProgress } from "./exerciseProgress";

// Deterministic stall/regression detection — every finding here is a plain
// comparison against the user's own recent numbers, same "no AI, no
// external calls" philosophy as lib/progression.ts. Each finding's `id` is
// derived from its type + subject (never random) so the same underlying
// condition always produces the same id across recomputation — that's what
// lets the Coach section's dismiss action stay meaningful across reloads
// within a session (see lib/analytics/coach.ts).

const STALL_WINDOW_SESSIONS = 4;
const MIN_SESSIONS_FOR_STALL_CHECK = STALL_WINDOW_SESSIONS + 1;
const VOLUME_DECLINE_THRESHOLD_PERCENT = 20;
const OVERTRAINING_SPIKE_THRESHOLD_PERCENT = 30;
const NEGLECTED_DAYS_FOR_FINDING = 8;

function detectExerciseStalls(history: CompletedWorkout[]): PlateauFinding[] {
  const findings: PlateauFinding[] = [];

  for (const exerciseName of listExercisesWithHistory(history)) {
    const progress = getExerciseProgress(history, exerciseName);
    if (progress.oneRepMaxHistory.length < MIN_SESSIONS_FOR_STALL_CHECK) continue;

    const recent = progress.oneRepMaxHistory.slice(-STALL_WINDOW_SESSIONS);
    const priorBest = Math.max(
      0,
      ...progress.oneRepMaxHistory.slice(0, -STALL_WINDOW_SESSIONS).map((p) => p.estimatedOneRepMax)
    );
    const recentBest = Math.max(...recent.map((p) => p.estimatedOneRepMax));

    if (recentBest <= priorBest) {
      findings.push({
        id: `exercise_stall-${exerciseName}`,
        type: "exercise_stall",
        subject: exerciseName,
        message: `${exerciseName} has stalled — no new estimated 1RM in your last ${STALL_WINDOW_SESSIONS} sessions.`,
        explanation: `Best estimated 1RM over your last ${STALL_WINDOW_SESSIONS} sessions (~${recentBest}) hasn't beaten your prior best (~${priorBest}).`,
      });
    }
  }

  return findings;
}

function windowVolume(history: CompletedWorkout[], start: Date, end: Date): number {
  let total = 0;
  for (const workout of history) {
    const d = new Date(workout.completedAt);
    if (d < start || d >= end) continue;
    for (const exercise of workout.exercises) {
      for (const set of exercise.sets) {
        if (!set.completed || set.weight === null || set.weight <= 0 || set.reps === null || set.reps <= 0) continue;
        total += set.weight * set.reps;
      }
    }
  }
  return Math.round(total);
}

function detectDecliningVolume(history: CompletedWorkout[]): PlateauFinding[] {
  const now = startOfDay(new Date());
  const currentStart = addDays(now, -28);
  const priorStart = addDays(now, -56);

  const currentVolume = windowVolume(history, currentStart, now);
  const priorVolume = windowVolume(history, priorStart, currentStart);
  if (priorVolume <= 0) return [];

  const percentChange = Math.round(((currentVolume - priorVolume) / priorVolume) * 100);
  if (percentChange > -VOLUME_DECLINE_THRESHOLD_PERCENT) return [];

  return [
    {
      id: "declining_volume-overall",
      type: "declining_volume",
      subject: "Overall training volume",
      message: `Your training volume has decreased ${Math.abs(percentChange)}% over the last month.`,
      explanation: `Logged volume over the last 28 days (${currentVolume.toLocaleString()}) vs. the 28 days before that (${priorVolume.toLocaleString()}).`,
    },
  ];
}

function detectMissedWorkouts(
  consistency: ConsistencyAnalytics,
  neglectedMuscleGroups: NeglectedMuscleGroup[]
): PlateauFinding[] {
  const findings: PlateauFinding[] = [];

  if (consistency.missedGoalWeeks >= 2) {
    findings.push({
      id: "missed_workouts-weekly-target",
      type: "missed_workouts",
      subject: "Weekly target",
      message: `You've missed your weekly workout target ${consistency.missedGoalWeeks} of the last 8 weeks.`,
      explanation: `Averaging ${consistency.averageWorkoutsPerWeek} workouts/week recently.`,
    });
  }

  for (const group of neglectedMuscleGroups) {
    if (group.daysSinceTrained === null || group.daysSinceTrained < NEGLECTED_DAYS_FOR_FINDING) continue;
    findings.push({
      id: `missed_workouts-${group.group}`,
      type: "missed_workouts",
      subject: group.label,
      message: `You haven't trained your ${group.label.toLowerCase()} in ${group.daysSinceTrained} days.`,
      explanation: `Last ${group.label.toLowerCase()} work was ${group.daysSinceTrained} days ago.`,
    });
  }

  return findings;
}

function detectDecliningReadiness(readiness: ReadinessTrendResult): PlateauFinding[] {
  if (!readiness.hasEnoughData) return [];

  const findings: PlateauFinding[] = [];
  if (readiness.flags.some((f) => f.includes("Energy levels have trended lower"))) {
    findings.push({
      id: "declining_readiness-energy",
      type: "declining_readiness",
      subject: "Energy",
      message: "Your energy levels have been trending down across recent check-ins.",
      explanation: "Average energy in your most recent check-ins is lower than in earlier ones.",
    });
  }
  if (readiness.showSafetyMessage) {
    findings.push({
      id: "declining_readiness-soreness",
      type: "declining_readiness",
      subject: "Soreness",
      message: "You're consistently reporting high soreness or difficulty. Consider a deload week.",
      explanation: `Average soreness across recent check-ins is ${readiness.averages.soreness ?? "high"}/10.`,
    });
  }
  return findings;
}

// "Skipped a day twice" — looks at the most recent two full cycles through
// the plan (2 × daysPerWeek workouts) and flags any planned day that never
// appears in that window at all, matched by dayIndex (the same index
// CompletedWorkout already carries from when it was logged against this
// plan). A day that's merely infrequent doesn't fire — only one that's
// completely absent across two full expected cycles.
function detectSkippedPlanDays(history: CompletedWorkout[], plan: WorkoutPlan | null): PlateauFinding[] {
  if (!plan || plan.weeklySchedule.length < 2) return [];

  const cycleLength = plan.weeklySchedule.length;
  const recentWindow = history.slice(0, cycleLength * 2);
  if (recentWindow.length < cycleLength) return [];

  const performedDayIndexes = new Set(recentWindow.map((w) => w.dayIndex));

  return plan.weeklySchedule
    .map((day, dayIndex) => ({ day, dayIndex }))
    .filter(({ dayIndex }) => !performedDayIndexes.has(dayIndex))
    .map(({ day, dayIndex }) => ({
      id: `missed_workouts-plan-day-${dayIndex}`,
      type: "missed_workouts" as const,
      subject: day.title,
      message: `You've skipped ${day.title} for the last two expected cycles.`,
      explanation: `${day.title} hasn't appeared in your last ${recentWindow.length} logged workouts.`,
    }));
}

function detectOvertraining(volume: VolumeAnalytics, readiness: ReadinessTrendResult): PlateauFinding[] {
  const weeks = volume.weekly;
  if (weeks.length < 5) return [];

  const currentWeekVolume = weeks[weeks.length - 1].volume;
  const priorFourWeekAvg = weeks.slice(-5, -1).reduce((s, w) => s + w.volume, 0) / 4;
  if (priorFourWeekAvg <= 0) return [];

  const spikePercent = Math.round(((currentWeekVolume - priorFourWeekAvg) / priorFourWeekAvg) * 100);
  const readinessDeclining = readiness.hasEnoughData && readiness.showSafetyMessage;

  if (spikePercent >= OVERTRAINING_SPIKE_THRESHOLD_PERCENT && readinessDeclining) {
    return [
      {
        id: "overtraining-volume-spike",
        type: "overtraining",
        subject: "Training load",
        message: "Your training volume has spiked while your readiness ratings are low — signs of overtraining.",
        explanation: `This week's volume is ${spikePercent}% above your recent 4-week average, alongside high soreness/difficulty ratings.`,
      },
    ];
  }

  return [];
}

export function detectPlateaus(params: {
  history: CompletedWorkout[];
  plan: WorkoutPlan | null;
  volume: VolumeAnalytics;
  readiness: ReadinessTrendResult;
  consistency: ConsistencyAnalytics;
  neglectedMuscleGroups: NeglectedMuscleGroup[];
}): PlateauFinding[] {
  const { history, plan, volume, readiness, consistency, neglectedMuscleGroups } = params;

  return [
    ...detectExerciseStalls(history),
    ...detectDecliningVolume(history),
    ...detectMissedWorkouts(consistency, neglectedMuscleGroups),
    ...detectSkippedPlanDays(history, plan),
    ...detectDecliningReadiness(readiness),
    ...detectOvertraining(volume, readiness),
  ];
}
