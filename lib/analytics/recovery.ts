import type { CompletedWorkout } from "@/types/workout-log";
import type { ReadinessTrendResult } from "@/types/insights";
import type { RecoveryResult, RecoveryStatus, VolumeAnalytics } from "@/types/analytics";
import { addDays, startOfDay } from "@/lib/dashboard";

// A single 0-100 recovery/readiness score composed from three weighted
// signals — recent readiness check-ins (40%), how tightly back-to-back
// recent workouts have been (30%), and whether this week's volume is
// spiking above the recent trend (30%). Every component is a plain,
// explainable comparison against the user's own recent numbers — same
// "no AI, no external calls" philosophy as the rest of lib/analytics/.

const READINESS_WEIGHT = 40;
const FREQUENCY_WEIGHT = 30;
const VOLUME_WEIGHT = 30;

const MIN_WORKOUTS_FOR_RECOVERY = 2;

function readinessComponent(readiness: ReadinessTrendResult): { score: number; reason: string | null } {
  if (!readiness.hasEnoughData) {
    return { score: READINESS_WEIGHT * 0.75, reason: null };
  }

  const soreness = readiness.averages.soreness ?? 5;
  const difficulty = readiness.averages.difficulty ?? 5;
  const energy = readiness.averages.energy ?? 5;

  // soreness/difficulty: lower is better recovery. energy: higher is better.
  const sorenessScore = Math.max(0, 1 - (soreness - 1) / 9);
  const difficultyScore = Math.max(0, 1 - (difficulty - 1) / 9);
  const energyScore = Math.max(0, (energy - 1) / 9);
  const combined = (sorenessScore + difficultyScore + energyScore) / 3;
  const score = Math.round(combined * READINESS_WEIGHT);

  let reason: string | null = null;
  if (soreness >= 7 || difficulty >= 7) {
    reason = `Recent check-ins show elevated soreness/difficulty (avg ${Math.max(soreness, difficulty).toFixed(1)}/10).`;
  } else if (energy <= 4) {
    reason = `Recent check-ins show low energy (avg ${energy.toFixed(1)}/10).`;
  } else if (soreness <= 4 && difficulty <= 4) {
    reason = "Recent check-ins show low soreness and difficulty.";
  }

  return { score, reason };
}

function frequencyComponent(history: CompletedWorkout[]): { score: number; reason: string | null } {
  const cutoff = addDays(startOfDay(new Date()), -3);
  const recentCount = history.filter((w) => new Date(w.completedAt) >= cutoff).length;

  const score = Math.max(0, FREQUENCY_WEIGHT - recentCount * 10);
  const reason =
    recentCount >= 3
      ? `You've trained ${recentCount} times in the last 3 days with little rest between sessions.`
      : recentCount === 0
        ? "No workouts logged in the last 3 days — well rested."
        : null;

  return { score, reason };
}

function volumeComponent(volume: VolumeAnalytics): { score: number; reason: string | null } {
  const weeks = volume.weekly;
  if (weeks.length < 5) return { score: VOLUME_WEIGHT * 0.75, reason: null };

  const currentWeekVolume = weeks[weeks.length - 1].volume;
  const priorFourWeekAvg = weeks.slice(-5, -1).reduce((s, w) => s + w.volume, 0) / 4;
  if (priorFourWeekAvg <= 0) return { score: VOLUME_WEIGHT * 0.75, reason: null };

  const spikePercent = ((currentWeekVolume - priorFourWeekAvg) / priorFourWeekAvg) * 100;
  // 0% or below average -> full credit; +40% or more above average -> none.
  const normalized = Math.max(0, Math.min(1, 1 - spikePercent / 40));
  const score = Math.round(normalized * VOLUME_WEIGHT);

  const reason =
    spikePercent >= 30
      ? `This week's training volume is ${Math.round(spikePercent)}% above your recent average.`
      : spikePercent <= -20
        ? `This week's training volume is well below your recent average — recovery time available.`
        : null;

  return { score, reason };
}

function statusForScore(score: number): RecoveryStatus {
  if (score >= 75) return "recovered";
  if (score >= 50) return "moderate";
  if (score >= 25) return "fatigued";
  return "overreaching";
}

export function getRecoveryScore(history: CompletedWorkout[], readiness: ReadinessTrendResult, volume: VolumeAnalytics): RecoveryResult {
  if (history.length < MIN_WORKOUTS_FOR_RECOVERY) {
    return { score: 100, status: "recovered", reasons: ["Not enough workout history yet to assess recovery."], hasEnoughData: false };
  }

  const readinessPart = readinessComponent(readiness);
  const frequencyPart = frequencyComponent(history);
  const volumePart = volumeComponent(volume);

  const score = Math.round(readinessPart.score + frequencyPart.score + volumePart.score);
  const reasons = [readinessPart.reason, frequencyPart.reason, volumePart.reason].filter(
    (r): r is string => r !== null
  );
  if (reasons.length === 0) {
    reasons.push("No strong recovery signals either way — a normal training week.");
  }

  return { score, status: statusForScore(score), reasons, hasEnoughData: true };
}
