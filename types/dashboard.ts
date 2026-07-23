import type { PersonalRecordEvent } from "./workout-log";

// Derived/ephemeral dashboard shapes — always recomputed from history/plan/
// settings by lib/dashboard.ts, never persisted directly, so no Zod schemas
// are needed here (mirrors the ephemeral section of types/workout-log.ts).

export interface QuickStats {
  streakDays: number;
  workoutsCompleted: number;
  totalPRs: number;
  totalTrainingMinutes: number;
}

export interface WeeklyProgress {
  daysWorkedOut: number;
  workoutsThisWeek: number;
  setsThisWeek: number;
  trainingMinutesThisWeek: number;
}

export interface DatedPersonalRecord extends PersonalRecordEvent {
  completedAt: string;
}

export type TodayWorkoutInfo =
  | { status: "resume"; dayTitle: string; dayFocus: string }
  | {
      status: "start";
      dayIndex: number;
      dayTitle: string;
      dayFocus: string;
      estimatedDurationMinutes: number;
      exerciseCount: number;
    }
  | { status: "no_plan" };

export interface NextRecommendation {
  message: string;
}
