import type { CompletedWorkout, LoggedExercise } from "@/types/workout-log";
import type { VolumeAnalytics, VolumePoint, MuscleGroupVolume, ExerciseVolume } from "@/types/analytics";
import { addDays, getWeekStart, startOfDay } from "@/lib/dashboard";
import { getMuscleGroup, MUSCLE_GROUP_LABELS, type MuscleGroup } from "@/lib/muscle-groups";

// Training volume — weekly/monthly rollups, per-muscle-group and
// per-exercise breakdowns, and total sets/reps. Volume itself only ever
// sums logged weight × reps (never invents a number for a bodyweight set
// with no weight logged), matching lib/insights.ts#getVolumeTrend's
// existing rule. This file adds the muscle-group/exercise/monthly
// breakdowns getVolumeTrend doesn't compute — the weekly-only trend and
// its 4-week percent-change stay owned by lib/insights.ts and are reused
// as-is elsewhere (see lib/analytics/coach.ts).

const MIN_WORKOUTS_FOR_VOLUME_BREAKDOWN = 3;
const BREAKDOWN_WINDOW_DAYS = 28;
const WEEKLY_POINTS = 8;
const MONTHLY_POINTS = 6;

interface SetAccumulator {
  volume: number;
  sets: number;
  reps: number;
}

function accumulateSets(exercises: LoggedExercise[]): SetAccumulator {
  let volume = 0;
  let sets = 0;
  let reps = 0;
  for (const exercise of exercises) {
    for (const set of exercise.sets) {
      if (!set.completed) continue;
      sets += 1;
      if (set.reps !== null && set.reps > 0) reps += set.reps;
      if (set.weight !== null && set.weight > 0 && set.reps !== null && set.reps > 0) {
        volume += set.weight * set.reps;
      }
    }
  }
  return { volume: Math.round(volume), sets, reps };
}

function inRange(workout: CompletedWorkout, start: Date, end: Date): boolean {
  const d = new Date(workout.completedAt);
  return d >= start && d < end;
}

const WEEK_LABEL_FORMAT: Intl.DateTimeFormatOptions = { month: "short", day: "numeric" };
const MONTH_LABEL_FORMAT: Intl.DateTimeFormatOptions = { month: "short" };

function weeklyVolumePoints(history: CompletedWorkout[]): VolumePoint[] {
  const currentWeekStart = getWeekStart(new Date());
  const points: VolumePoint[] = [];
  for (let i = WEEKLY_POINTS - 1; i >= 0; i--) {
    const start = addDays(currentWeekStart, -7 * i);
    const end = addDays(start, 7);
    const { volume, sets, reps } = accumulateSets(
      history.filter((w) => inRange(w, start, end)).flatMap((w) => w.exercises)
    );
    points.push({ label: start.toLocaleDateString(undefined, WEEK_LABEL_FORMAT), periodStart: start.toISOString(), volume, sets, reps });
  }
  return points;
}

function monthlyVolumePoints(history: CompletedWorkout[]): VolumePoint[] {
  const now = new Date();
  const points: VolumePoint[] = [];
  for (let i = MONTHLY_POINTS - 1; i >= 0; i--) {
    const start = startOfDay(new Date(now.getFullYear(), now.getMonth() - i, 1));
    const end = startOfDay(new Date(now.getFullYear(), now.getMonth() - i + 1, 1));
    const { volume, sets, reps } = accumulateSets(
      history.filter((w) => inRange(w, start, end)).flatMap((w) => w.exercises)
    );
    points.push({ label: start.toLocaleDateString(undefined, MONTH_LABEL_FORMAT), periodStart: start.toISOString(), volume, sets, reps });
  }
  return points;
}

function volumeByMuscleGroup(recentWorkouts: CompletedWorkout[]): MuscleGroupVolume[] {
  const totals = new Map<MuscleGroup, { sets: number; volume: number }>();
  for (const workout of recentWorkouts) {
    for (const exercise of workout.exercises) {
      const group = getMuscleGroup(exercise.name);
      if (!group) continue;
      const { volume, sets } = accumulateSets([exercise]);
      const existing = totals.get(group) ?? { sets: 0, volume: 0 };
      totals.set(group, { sets: existing.sets + sets, volume: existing.volume + volume });
    }
  }
  return Array.from(totals.entries())
    .map(([group, v]) => ({ group, label: MUSCLE_GROUP_LABELS[group], sets: v.sets, volume: v.volume }))
    .sort((a, b) => b.volume - a.volume);
}

function volumeByExercise(recentWorkouts: CompletedWorkout[]): ExerciseVolume[] {
  const totals = new Map<string, { sets: number; volume: number }>();
  for (const workout of recentWorkouts) {
    for (const exercise of workout.exercises) {
      const { volume, sets } = accumulateSets([exercise]);
      const existing = totals.get(exercise.name) ?? { sets: 0, volume: 0 };
      totals.set(exercise.name, { sets: existing.sets + sets, volume: existing.volume + volume });
    }
  }
  return Array.from(totals.entries())
    .map(([exerciseName, v]) => ({ exerciseName, sets: v.sets, volume: v.volume }))
    .sort((a, b) => b.volume - a.volume)
    .slice(0, 10);
}

export function getVolumeAnalytics(history: CompletedWorkout[]): VolumeAnalytics {
  const windowStart = addDays(startOfDay(new Date()), -BREAKDOWN_WINDOW_DAYS);
  const recentWorkouts = history.filter((w) => new Date(w.completedAt) >= windowStart);
  const { sets: totalSets, reps: totalReps } = accumulateSets(recentWorkouts.flatMap((w) => w.exercises));

  return {
    weekly: weeklyVolumePoints(history),
    monthly: monthlyVolumePoints(history),
    byMuscleGroup: volumeByMuscleGroup(recentWorkouts),
    byExercise: volumeByExercise(recentWorkouts),
    totalSets,
    totalReps,
    hasEnoughData: history.length >= MIN_WORKOUTS_FOR_VOLUME_BREAKDOWN,
  };
}
