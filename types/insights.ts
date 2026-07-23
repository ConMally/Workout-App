import type { MuscleGroup } from "@/lib/exercise-substitutions";
import type { DatedPersonalRecord } from "./dashboard";

// Derived/ephemeral insights shapes — always recomputed from history/plan by
// lib/insights.ts and lib/readiness.ts, never persisted (mirrors the
// ephemeral sections of types/workout-log.ts and types/dashboard.ts).

// ---------------------------------------------------------------------------
// Per-exercise stats — the single shared shape used by Strength Progress,
// Exercise Progress Detail, and Goals' current-value lookups.
// ---------------------------------------------------------------------------

export interface ExercisePerformancePoint {
  completedAt: string;
  weight: number | null;
  reps: number | null;
  estimatedOneRepMax: number | null;
}

export interface ExerciseStats {
  exerciseName: string;
  workoutCount: number;
  totalCompletedSets: number;
  firstPerformance: ExercisePerformancePoint | null;
  latestPerformance: ExercisePerformancePoint | null;
  heaviestWeight: number;
  bestReps: { reps: number; weight: number } | null;
  bestEstimatedOneRepMax: number;
  history: ExercisePerformancePoint[]; // one point per workout, chronological
  prHistory: DatedPersonalRecord[];
}

// ---------------------------------------------------------------------------
// Consistency
// ---------------------------------------------------------------------------

export interface ConsistencyResult {
  score: number; // 0-100
  workoutsLast7Days: number;
  workoutsLast30Days: number;
  weeklyTarget: number;
  weeklyAverage: number;
  currentStreak: number;
  longestStreak: number;
  plannedCompletionPercent: number | null; // null when not enough plan data
  // At least 2 weeks of history — gates trend-comparison language (e.g.
  // "your frequency increased vs. last month") without hiding the raw
  // current-period stats above, which are meaningful from day one.
  hasEnoughDataForTrend: boolean;
  findings: string[];
}

// ---------------------------------------------------------------------------
// Volume
// ---------------------------------------------------------------------------

export interface VolumeTrendResult {
  currentWeekVolume: number;
  previousWeekVolume: number;
  percentChange: number | null; // null when previous week had no volume
  rollingFourWeekAverage: number;
  weeklyTotals: { weekStart: string; volume: number }[]; // last 4, oldest first
  hasEnoughData: boolean;
}

// ---------------------------------------------------------------------------
// Muscle balance
// ---------------------------------------------------------------------------

export interface MuscleBalancePair {
  label: string;
  aLabel: string;
  bLabel: string;
  aCount: number;
  bCount: number;
  aPercent: number; // aCount / (aCount+bCount) * 100
  hasEnoughData: boolean;
  observation: string | null;
}

export interface MuscleBalanceResult {
  pairs: MuscleBalancePair[];
  coreSetsLast4Weeks: number;
  hasEnoughData: boolean;
}

// ---------------------------------------------------------------------------
// Exercise frequency
// ---------------------------------------------------------------------------

export interface ExerciseFrequencyEntry {
  exerciseName: string;
  workoutCount: number;
  lastPerformedAt: string;
}

export interface NeglectedMuscleGroup {
  group: MuscleGroup;
  label: string;
  lastTrainedAt: string | null;
  daysSinceTrained: number | null;
}

export interface RecentSwap {
  slotKey: string;
  fromName: string;
  toName: string;
}

export interface ExerciseFrequencyResult {
  hasEnoughData: boolean; // at least MIN_WORKOUTS_FOR_EXERCISE_FREQUENCY completed workouts
  mostFrequent: ExerciseFrequencyEntry[];
  notPerformedInLast30Days: ExerciseFrequencyEntry[];
  neglectedMuscleGroups: NeglectedMuscleGroup[];
  recentSwaps: RecentSwap[];
}

// ---------------------------------------------------------------------------
// Readiness trends
// ---------------------------------------------------------------------------

export interface ReadinessTrendResult {
  hasEnoughData: boolean;
  entryCount: number;
  averages: {
    difficulty: number | null;
    energy: number | null;
    soreness: number | null;
    sleepQuality: number | null;
    satisfaction: number | null;
  };
  flags: string[];
  showSafetyMessage: boolean;
}

// ---------------------------------------------------------------------------
// Next actions (recommendations)
// ---------------------------------------------------------------------------

export interface Recommendation {
  id: string;
  priority: number; // lower = more important
  message: string;
  explanation: string;
}
