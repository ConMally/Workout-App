"use client";

import { useMemo, useState } from "react";
import type { WorkoutPlan } from "@/types/workout";
import type { AppSettings, CompletedWorkout } from "@/types/workout-log";
import type { Goal } from "@/types/goals";
import type { SubstitutionHistory } from "@/lib/storage";
import {
  getConsistency,
  getExerciseFrequency,
  getExerciseStats,
  getMuscleBalance,
  getRecommendations,
  getVolumeTrend,
  listExercisesWithHistory,
} from "@/lib/insights";
import { getReadinessTrend } from "@/lib/readiness";
import NextActions from "./NextActions";
import ConsistencyCard from "./ConsistencyCard";
import StrengthProgress from "./StrengthProgress";
import VolumeTrend from "./VolumeTrend";
import MuscleBalance from "./MuscleBalance";
import ExerciseFrequency from "./ExerciseFrequency";
import ReadinessTrends from "./ReadinessTrends";
import GoalsPanel from "@/components/goals/GoalsPanel";

interface InsightsPageProps {
  history: CompletedWorkout[];
  plan: WorkoutPlan | null;
  settings: AppSettings;
  substitutionHistory: SubstitutionHistory;
  goals: Goal[];
  onSelectExercise: (name: string) => void;
  onGoToPlan: () => void;
  onCreateGoal: (goal: Goal) => void;
  onUpdateGoal: (goal: Goal) => void;
  onDeleteGoal: (id: string) => void;
}

export default function InsightsPage({
  history,
  plan,
  settings,
  substitutionHistory,
  goals,
  onSelectExercise,
  onGoToPlan,
  onCreateGoal,
  onUpdateGoal,
  onDeleteGoal,
}: InsightsPageProps) {
  const [strengthExerciseOverride, setStrengthExerciseOverride] = useState<string | null>(null);

  // Every full history walk happens exactly once per history/plan change
  // here, memoized — section components below only ever receive already
  // computed results as props, never recompute from raw history themselves.
  const consistency = useMemo(() => getConsistency(history, plan), [history, plan]);
  const volumeTrend = useMemo(() => getVolumeTrend(history), [history]);
  const muscleBalance = useMemo(() => getMuscleBalance(history), [history]);
  const exerciseFrequency = useMemo(
    () => getExerciseFrequency(history, substitutionHistory),
    [history, substitutionHistory]
  );
  const readiness = useMemo(() => getReadinessTrend(history), [history]);
  const recommendations = useMemo(
    () => getRecommendations({ history, plan, consistency, muscleBalance, readiness, exerciseFrequency }),
    [history, plan, consistency, muscleBalance, readiness, exerciseFrequency]
  );
  const exerciseNames = useMemo(() => listExercisesWithHistory(history), [history]);
  const allLoggedExerciseNames = useMemo(() => {
    const names = new Set<string>();
    for (const workout of history) {
      for (const exercise of workout.exercises) names.add(exercise.name);
    }
    return Array.from(names).sort();
  }, [history]);

  const selectedStrengthExercise = strengthExerciseOverride ?? exerciseNames[0] ?? null;
  const strengthStats = useMemo(
    () => (selectedStrengthExercise ? getExerciseStats(history, selectedStrengthExercise) : null),
    [history, selectedStrengthExercise]
  );

  return (
    <div className="motion-safe:animate-step-in flex flex-col gap-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-900">Insights</h2>
        <p className="mt-1 text-sm text-slate-500">
          Understand whether your training is balanced, consistent, and improving over time.
        </p>
      </div>

      {history.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-slate-300 bg-slate-50/60 px-6 py-10 text-center">
          <p className="text-sm font-medium text-slate-600">No workout history yet</p>
          <p className="max-w-xs text-sm text-slate-400">
            Complete a workout to start unlocking consistency, strength, volume, and balance insights.
          </p>
          <button
            type="button"
            onClick={onGoToPlan}
            className="mt-2 rounded-lg bg-teal-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-teal-700"
          >
            Go to your plan
          </button>
        </div>
      ) : (
        <>
          <NextActions recommendations={recommendations} />
          <ConsistencyCard consistency={consistency} />
          <StrengthProgress
            exerciseNames={exerciseNames}
            selectedExercise={selectedStrengthExercise}
            stats={strengthStats}
            weightUnit={settings.weightUnit}
            onSelectExercise={setStrengthExerciseOverride}
            onViewFullHistory={onSelectExercise}
          />
          <VolumeTrend volumeTrend={volumeTrend} weightUnit={settings.weightUnit} />
          <MuscleBalance muscleBalance={muscleBalance} />
          <ExerciseFrequency exerciseFrequency={exerciseFrequency} onSelectExercise={onSelectExercise} />
          <ReadinessTrends readiness={readiness} />
        </>
      )}

      <div className="border-t border-slate-200 pt-6">
        <GoalsPanel
          goals={goals}
          history={history}
          exerciseNames={allLoggedExerciseNames}
          onCreate={onCreateGoal}
          onUpdate={onUpdateGoal}
          onDelete={onDeleteGoal}
        />
      </div>
    </div>
  );
}
