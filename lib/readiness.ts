import type { CompletedWorkout, Readiness } from "@/types/workout-log";
import type { ReadinessTrendResult } from "@/types/insights";

// Simple, deterministic trend detection over post-workout readiness
// check-ins. Never diagnoses injury, fatigue, or overtraining — only
// surfaces plain numeric trends, plus a general, non-diagnostic safety
// message when soreness has been rated very high.

export const MIN_READINESS_ENTRIES_FOR_TRENDS = 3;
export const MIN_READINESS_ENTRIES_FOR_STREAK_LANGUAGE = 3;
const VERY_HIGH_SORENESS_THRESHOLD = 9;
const HIGH_RATING_THRESHOLD = 8;
const TREND_SHIFT_THRESHOLD = 2;

type Field = "difficulty" | "energy" | "soreness" | "sleepQuality" | "satisfaction";
const FIELDS: Field[] = ["difficulty", "energy", "soreness", "sleepQuality", "satisfaction"];

function average(values: number[]): number | null {
  if (values.length === 0) return null;
  return Math.round((values.reduce((s, v) => s + v, 0) / values.length) * 10) / 10;
}

export function getReadinessTrend(history: CompletedWorkout[]): ReadinessTrendResult {
  // history is newest-first; keep only workouts with a readiness check-in.
  const entries = history.map((w) => w.readiness).filter((r): r is Readiness => r !== null);
  const entryCount = entries.length;
  const hasEnoughData = entryCount >= MIN_READINESS_ENTRIES_FOR_TRENDS;

  const averages: ReadinessTrendResult["averages"] = {
    difficulty: null,
    energy: null,
    soreness: null,
    sleepQuality: null,
    satisfaction: null,
  };
  for (const field of FIELDS) {
    averages[field] = average(entries.map((e) => e[field]).filter((v): v is number => v !== null));
  }

  const flags: string[] = [];
  let showSafetyMessage = false;

  if (!hasEnoughData) {
    return { hasEnoughData, entryCount, averages, flags, showSafetyMessage };
  }

  const recent = entries.slice(0, Math.min(3, entries.length));
  const earlier = entries.slice(recent.length);

  const recentSoreness = recent.map((e) => e.soreness).filter((v): v is number => v !== null);
  const highSorenessCount = recentSoreness.filter((v) => v >= HIGH_RATING_THRESHOLD).length;
  if (highSorenessCount >= 2) {
    flags.push("Soreness has been rated high across multiple recent workouts.");
    showSafetyMessage = true;
  }
  const latestSoreness = entries[0]?.soreness ?? null;
  if (latestSoreness !== null && latestSoreness >= VERY_HIGH_SORENESS_THRESHOLD) {
    showSafetyMessage = true;
  }

  const recentDifficulty = recent.map((e) => e.difficulty).filter((v): v is number => v !== null);
  if (recent.length >= MIN_READINESS_ENTRIES_FOR_STREAK_LANGUAGE && recentDifficulty.length === recent.length) {
    if (recentDifficulty.every((v) => v >= HIGH_RATING_THRESHOLD)) {
      flags.push("Difficulty has been rated high across your last few workouts.");
    }
  }

  if (earlier.length > 0) {
    const recentEnergyAvg = average(recent.map((e) => e.energy).filter((v): v is number => v !== null));
    const earlierEnergyAvg = average(earlier.map((e) => e.energy).filter((v): v is number => v !== null));
    if (recentEnergyAvg !== null && earlierEnergyAvg !== null && earlierEnergyAvg - recentEnergyAvg >= TREND_SHIFT_THRESHOLD) {
      flags.push("Energy levels have trended lower recently.");
    }

    const recentSatisfactionAvg = average(recent.map((e) => e.satisfaction).filter((v): v is number => v !== null));
    const earlierSatisfactionAvg = average(earlier.map((e) => e.satisfaction).filter((v): v is number => v !== null));
    if (
      recentSatisfactionAvg !== null &&
      earlierSatisfactionAvg !== null &&
      recentSatisfactionAvg - earlierSatisfactionAvg >= TREND_SHIFT_THRESHOLD
    ) {
      flags.push("Workout satisfaction has been trending upward.");
    }
  }

  return { hasEnoughData, entryCount, averages, flags, showSafetyMessage };
}
