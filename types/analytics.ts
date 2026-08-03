import type { MuscleGroup } from "@/lib/muscle-groups";

// Derived/ephemeral shapes for Phase 5's Coach & Analytics layer — always
// recomputed from history/plan/goals by lib/analytics/*, never persisted
// (mirrors the ephemeral sections of types/dashboard.ts and
// types/insights.ts, which this phase reuses rather than duplicates).

// ---------------------------------------------------------------------------
// Volume (lib/analytics/volume.ts)
// ---------------------------------------------------------------------------

export interface VolumePoint {
  label: string; // e.g. "Jan 6" (week) or "January" (month)
  periodStart: string;
  volume: number;
  sets: number;
  reps: number;
}

export interface MuscleGroupVolume {
  group: MuscleGroup;
  label: string;
  sets: number;
  volume: number;
}

export interface ExerciseVolume {
  exerciseName: string;
  sets: number;
  volume: number;
}

export interface VolumeAnalytics {
  weekly: VolumePoint[]; // last 8 weeks, oldest first
  monthly: VolumePoint[]; // last 6 months, oldest first
  byMuscleGroup: MuscleGroupVolume[]; // trailing 28 days, sorted desc by volume
  byExercise: ExerciseVolume[]; // trailing 28 days, sorted desc by volume, top 10
  totalSets: number; // trailing 28 days
  totalReps: number; // trailing 28 days
  hasEnoughData: boolean;
}

// ---------------------------------------------------------------------------
// Exercise progress (lib/analytics/exerciseProgress.ts)
// ---------------------------------------------------------------------------

export interface OneRepMaxPoint {
  completedAt: string;
  estimatedOneRepMax: number;
}

export interface ExerciseProgressSummary {
  exerciseName: string;
  oneRepMaxHistory: OneRepMaxPoint[]; // chronological, one point per session performed
  bestWeight: number;
  bestReps: { reps: number; weight: number } | null;
  bestVolumeInASession: number;
  bestEstimatedOneRepMax: number;
  lifetimePRCount: number;
  recentPRCount: number; // last 30 days
}

// ---------------------------------------------------------------------------
// Consistency (lib/analytics/consistency.ts) — extends ConsistencyResult
// (types/insights.ts) with the fields this phase adds on top of it.
// ---------------------------------------------------------------------------

export interface ConsistencyAnalytics {
  workoutsThisWeek: number;
  workoutsThisMonth: number;
  currentStreak: number;
  longestStreak: number;
  averageWorkoutsPerWeek: number;
  missedGoalWeeks: number; // out of the trailing 8 weeks
  adherencePercent: number | null; // null when not enough plan data
}

// ---------------------------------------------------------------------------
// Workout trends (lib/analytics/trends.ts)
// ---------------------------------------------------------------------------

export interface WorkoutTrends {
  averageDurationMinutes: number | null;
  averageRestSeconds: number | null;
  averageReadiness: number | null; // 1-10, mean of available readiness fields
  averageExercisesPerWorkout: number | null;
  hasEnoughData: boolean;
}

// ---------------------------------------------------------------------------
// Plateau detection (lib/analytics/plateau.ts)
// ---------------------------------------------------------------------------

export type PlateauType =
  | "exercise_stall"
  | "declining_volume"
  | "missed_workouts"
  | "declining_readiness"
  | "overtraining";

export interface PlateauFinding {
  id: string;
  type: PlateauType;
  subject: string; // exercise name, muscle group label, or "training" generically
  message: string;
  explanation: string;
}

// ---------------------------------------------------------------------------
// Progressive overload (lib/analytics/overload.ts)
// ---------------------------------------------------------------------------

export type OverloadDirection = "increase" | "hold" | "decrease";

export interface OverloadTarget {
  exerciseName: string;
  direction: OverloadDirection;
  nextWeight: number | null; // null when there's no logged weight to base a number on
  nextReps: string; // rep target string, matching the app's existing reps format
  nextSets: number;
  reasoning: string;
}

// ---------------------------------------------------------------------------
// Recovery score (lib/analytics/recovery.ts)
// ---------------------------------------------------------------------------

export type RecoveryStatus = "recovered" | "moderate" | "fatigued" | "overreaching";

export interface RecoveryResult {
  score: number; // 0-100, higher = more recovered
  status: RecoveryStatus;
  reasons: string[];
  hasEnoughData: boolean;
}

// ---------------------------------------------------------------------------
// AI Coach recommendations (lib/analytics/coach.ts)
// ---------------------------------------------------------------------------

export type CoachRecommendationCategory =
  | "progression"
  | "plateau"
  | "consistency"
  | "recovery"
  | "muscle_balance"
  | "readiness"
  // Added in Phase 6 (lib/exercises/coachSuggestions.ts) — exercise-level
  // suggestions (replace a stalled exercise, reduce movement-pattern
  // overlap, add a missing movement) rather than a program-level signal.
  | "exercise";

export interface CoachRecommendation {
  id: string; // stable across recomputation — see lib/analytics/coach.ts
  category: CoachRecommendationCategory;
  priority: number; // lower = more important
  title: string;
  message: string;
  explanation: string;
}

// ---------------------------------------------------------------------------
// Weekly report (lib/analytics/weeklyReport.ts)
// ---------------------------------------------------------------------------

export interface WeeklyReport {
  weekStart: string;
  weekEnd: string;
  completedWorkouts: number;
  newPRs: { exerciseName: string; detail: string }[];
  missedGoals: { title: string; progressPercent: number }[];
  volumeChangePercent: number | null;
  workoutsVsTarget: { completed: number; target: number };
  topExercise: { exerciseName: string; volume: number } | null;
  summary: string;
  recommendations: CoachRecommendation[];
}

// ---------------------------------------------------------------------------
// Coach dashboard bundle (lib/analytics/index.ts) — the single object
// CoachSection computes once via useMemo and passes down to every card, so
// no sub-component ever re-walks history itself (same rule InsightsPage
// already follows for lib/insights.ts).
// ---------------------------------------------------------------------------

export interface CoachAnalytics {
  volume: VolumeAnalytics;
  consistency: ConsistencyAnalytics;
  trends: WorkoutTrends;
  recovery: RecoveryResult;
  plateaus: PlateauFinding[];
  overloadTargets: OverloadTarget[]; // most-recently-trained exercises first
  recommendations: CoachRecommendation[];
  weeklyReport: WeeklyReport;
}
