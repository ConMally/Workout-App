import type { WorkoutPlan } from "@/types/workout";
import type { ActiveWorkout, CompletedWorkout } from "@/types/workout-log";
import type { DatedPersonalRecord, NextRecommendation, QuickStats, TodayWorkoutInfo, WeeklyProgress } from "@/types/dashboard";
import { countCompletedSets } from "./workout-log";
import { detectPersonalRecords, getProgressionSuggestion } from "./progression";

// Pure derivation helpers for the dashboard — everything here is computed
// fresh from existing history/plan/active-workout state. Nothing new is
// persisted, and PR/progression math is never reimplemented: this file only
// calls the existing functions in lib/progression.ts.

// Exported so lib/insights.ts (and any other consumer) shares the exact same
// date-key/week-boundary logic instead of re-deriving it.
export function toDateKey(date: Date): string {
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
}

export function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

export function startOfDay(date: Date): Date {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  return next;
}

// ---------------------------------------------------------------------------
// Streak
// ---------------------------------------------------------------------------

export function getStreakDays(history: CompletedWorkout[]): number {
  const dateKeys = new Set(history.map((workout) => toDateKey(new Date(workout.completedAt))));

  const today = startOfDay(new Date());
  let cursor = today;

  if (!dateKeys.has(toDateKey(cursor))) {
    // No workout logged yet today — the streak can still be "alive" if
    // yesterday has one, it just hasn't been extended to today yet.
    cursor = addDays(today, -1);
    if (!dateKeys.has(toDateKey(cursor))) return 0;
  }

  let streak = 0;
  while (dateKeys.has(toDateKey(cursor))) {
    streak += 1;
    cursor = addDays(cursor, -1);
  }
  return streak;
}

export function getLongestStreakDays(history: CompletedWorkout[]): number {
  if (history.length === 0) return 0;

  const sortedDayTimestamps = Array.from(
    new Set(history.map((workout) => toDateKey(new Date(workout.completedAt))))
  )
    .map((key) => {
      const [y, m, d] = key.split("-").map(Number);
      return new Date(y, m, d).getTime();
    })
    .sort((a, b) => a - b);

  const oneDayMs = 24 * 60 * 60 * 1000;
  let longest = 1;
  let current = 1;
  for (let i = 1; i < sortedDayTimestamps.length; i++) {
    if (sortedDayTimestamps[i] - sortedDayTimestamps[i - 1] === oneDayMs) {
      current += 1;
    } else {
      current = 1;
    }
    longest = Math.max(longest, current);
  }
  return longest;
}

// ---------------------------------------------------------------------------
// Historical personal records — reconstructed from history using the
// existing detectPersonalRecords, since PRs are otherwise only ever computed
// transiently at finish-time.
// ---------------------------------------------------------------------------

export function getAllPersonalRecords(history: CompletedWorkout[]): DatedPersonalRecord[] {
  const chronological = [...history].reverse();
  const priorHistory: CompletedWorkout[] = [];
  const allEvents: DatedPersonalRecord[] = [];

  for (const workout of chronological) {
    const events = detectPersonalRecords(priorHistory, workout);
    for (const event of events) {
      allEvents.push({ ...event, completedAt: workout.completedAt });
    }
    priorHistory.push(workout);
  }

  return allEvents.reverse();
}

export function getRecentPRs(history: CompletedWorkout[], limit = 3): DatedPersonalRecord[] {
  return getAllPersonalRecords(history).slice(0, limit);
}

// ---------------------------------------------------------------------------
// Quick stats
// ---------------------------------------------------------------------------

export function getQuickStats(history: CompletedWorkout[]): QuickStats {
  const totalTrainingMinutes = Math.round(
    history.reduce((sum, workout) => sum + (workout.durationSeconds ?? 0), 0) / 60
  );

  return {
    streakDays: getStreakDays(history),
    workoutsCompleted: history.length,
    totalPRs: getAllPersonalRecords(history).length,
    totalTrainingMinutes,
  };
}

// ---------------------------------------------------------------------------
// Weekly progress — Monday-start current week.
// ---------------------------------------------------------------------------

export function getWeekStart(date: Date): Date {
  const day = date.getDay(); // 0 = Sunday
  const diffToMonday = day === 0 ? -6 : 1 - day;
  return startOfDay(addDays(date, diffToMonday));
}

export function getWeeklyProgress(history: CompletedWorkout[]): WeeklyProgress {
  const weekStart = getWeekStart(new Date());
  const thisWeek = history.filter((workout) => new Date(workout.completedAt) >= weekStart);

  const daysWorkedOut = new Set(thisWeek.map((workout) => toDateKey(new Date(workout.completedAt)))).size;
  const setsThisWeek = thisWeek.reduce((sum, workout) => sum + countCompletedSets(workout.exercises), 0);
  const trainingMinutesThisWeek = Math.round(
    thisWeek.reduce((sum, workout) => sum + (workout.durationSeconds ?? 0), 0) / 60
  );

  return {
    daysWorkedOut,
    workoutsThisWeek: thisWeek.length,
    setsThisWeek,
    trainingMinutesThisWeek,
  };
}

// ---------------------------------------------------------------------------
// Greeting — local time-of-day only (never a network call, never guesses a
// user's timezone beyond what their own device already reports via
// Date#getHours). Deliberately three broad bands rather than a precise
// sunrise/sunset calculation, which would need location data this app
// doesn't collect.
// ---------------------------------------------------------------------------

export function getTimeOfDayGreeting(now: Date = new Date()): string {
  const hour = now.getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

// ---------------------------------------------------------------------------
// Today's workout — resume the active one, otherwise suggest the day after
// whichever was most recently completed (cycling through the plan).
// ---------------------------------------------------------------------------

export function getTodayWorkout(
  plan: WorkoutPlan | null,
  activeWorkout: ActiveWorkout | null,
  history: CompletedWorkout[]
): TodayWorkoutInfo {
  if (activeWorkout) {
    return { status: "resume", dayTitle: activeWorkout.dayTitle, dayFocus: activeWorkout.dayFocus };
  }

  if (!plan || plan.weeklySchedule.length === 0) {
    return { status: "no_plan" };
  }

  const dayIndex = history.length > 0 ? (history[0].dayIndex + 1) % plan.weeklySchedule.length : 0;
  const day = plan.weeklySchedule[dayIndex];

  return {
    status: "start",
    dayIndex,
    dayTitle: day.title,
    dayFocus: day.focus,
    estimatedDurationMinutes: day.estimatedDurationMinutes,
    exerciseCount: day.exercises.length,
  };
}

// ---------------------------------------------------------------------------
// Next recommendation — reuses getProgressionSuggestion per exercise from
// the most recently completed workout, preferring the most actionable one.
// ---------------------------------------------------------------------------

const PRIORITY = { increase_weight: 0, hold_or_decrease_weight: 1, hold: 2 } as const;

export function getNextRecommendation(history: CompletedWorkout[], plan: WorkoutPlan | null): NextRecommendation {
  if (history.length === 0) {
    return { message: "Finish your first workout to start unlocking personalized recommendations." };
  }

  const last = history[0];
  let best: { exerciseName: string; message: string; rank: number } | null = null;

  for (const exercise of last.exercises) {
    const suggestion = getProgressionSuggestion(exercise);
    if (!suggestion) continue;
    const rank = PRIORITY[suggestion.type];
    if (!best || rank < best.rank) {
      best = { exerciseName: exercise.name, message: suggestion.message, rank };
    }
  }

  if (best) {
    return { message: `${best.exerciseName}: ${best.message}` };
  }

  if (plan && plan.weeklySchedule.length > 0) {
    const nextDayIndex = (last.dayIndex + 1) % plan.weeklySchedule.length;
    const nextDay = plan.weeklySchedule[nextDayIndex];
    return { message: `Ready for your next session — ${nextDay.title} is up next.` };
  }

  return { message: "Log a weight next time you train to get a personalized recommendation." };
}
