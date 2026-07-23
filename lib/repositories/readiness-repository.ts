import type { Readiness } from "@/types/workout-log";

// Backed by the readiness_checkins table. Not called by the main app data
// flow today — a completed workout's readiness is already embedded in
// CompletedWorkout.readiness (both in localStorage and reconstructed by
// HistoryRepository's cloud read via an embedded query), and
// lib/readiness.ts's trend calculations already operate on that embedded
// field, unchanged. This repository exists for the write side (persisting
// a check-in as part of completing a workout) and as a genuinely working,
// independently-callable interface per this phase's requirements.
export interface ReadinessCheckIn {
  completedWorkoutId: string;
  readiness: Readiness;
  createdAt: string;
}

export interface ReadinessRepository {
  createCheckIn(userId: string, completedWorkoutId: string, readiness: Readiness): Promise<void>;
  listCheckIns(userId: string, options?: { limit?: number }): Promise<ReadinessCheckIn[]>;
}
