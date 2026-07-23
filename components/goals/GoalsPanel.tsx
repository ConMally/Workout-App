"use client";

import { useMemo, useState } from "react";
import type { CompletedWorkout } from "@/types/workout-log";
import type { Goal, GoalProgress, GoalType } from "@/types/goals";
import { GOAL_TYPE_LABELS, createGoal, getGoalProgress } from "@/lib/goals";
import GoalForm from "./GoalForm";

interface GoalsPanelProps {
  goals: Goal[];
  history: CompletedWorkout[];
  exerciseNames: string[];
  onCreate: (goal: Goal) => void;
  onUpdate: (goal: Goal) => void;
  onDelete: (id: string) => void;
}

export default function GoalsPanel({ goals, history, exerciseNames, onCreate, onUpdate, onDelete }: GoalsPanelProps) {
  const [formMode, setFormMode] = useState<"none" | "create" | string>("none");

  const editingGoal = typeof formMode === "string" && formMode !== "none" && formMode !== "create" ? goals.find((g) => g.id === formMode) ?? null : null;

  // getGoalProgress walks the full history per goal (more so for
  // exercise-linked goals, via getExerciseStats) — computed once per
  // [goals, history] change here rather than freshly on every render.
  const progressByGoalId = useMemo(() => {
    const map = new Map<string, GoalProgress>();
    for (const goal of goals) {
      map.set(goal.id, getGoalProgress(goal, history));
    }
    return map;
  }, [goals, history]);

  function handleCreateSubmit(input: { type: GoalType; title: string; exerciseName: string | null; targetValue: number; targetDate: string | null }) {
    onCreate(createGoal(input));
    setFormMode("none");
  }

  function handleEditSubmit(input: { type: GoalType; title: string; exerciseName: string | null; targetValue: number; targetDate: string | null }) {
    if (!editingGoal) return;
    onUpdate({ ...editingGoal, ...input });
    setFormMode("none");
  }

  function handleDelete(goal: Goal) {
    if (window.confirm(`Delete the goal "${goal.title}"?`)) {
      onDelete(goal.id);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Goals</h2>
          <p className="mt-1 text-sm text-slate-500">Track strength and consistency targets over time.</p>
        </div>
        {formMode === "none" && (
          <button
            type="button"
            onClick={() => setFormMode("create")}
            className="rounded-lg bg-teal-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-teal-700"
          >
            Add goal
          </button>
        )}
      </div>

      {formMode === "create" && (
        <GoalForm exerciseNames={exerciseNames} onSubmit={handleCreateSubmit} onCancel={() => setFormMode("none")} />
      )}
      {editingGoal && (
        <GoalForm initialGoal={editingGoal} exerciseNames={exerciseNames} onSubmit={handleEditSubmit} onCancel={() => setFormMode("none")} />
      )}

      {goals.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-slate-300 bg-slate-50/60 px-6 py-10 text-center">
          <p className="text-sm font-medium text-slate-600">No goals yet</p>
          <p className="max-w-xs text-sm text-slate-400">
            Create a strength or consistency goal to track your progress over time.
          </p>
        </div>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2">
          {goals.map((goal) => {
            const progress = progressByGoalId.get(goal.id);
            if (!progress) return null;
            return (
              <li key={goal.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-xs font-medium uppercase tracking-wide text-slate-400">{GOAL_TYPE_LABELS[goal.type]}</p>
                    <p className="mt-0.5 truncate text-sm font-bold text-slate-900">{goal.title}</p>
                  </div>
                  {progress.isComplete && (
                    <span className="flex-shrink-0 rounded-full bg-teal-50 px-2.5 py-1 text-xs font-semibold text-teal-700">Complete</span>
                  )}
                </div>

                <div className="mt-3">
                  <div className="flex items-center justify-between text-xs text-slate-500">
                    <span>
                      {progress.currentValue} / {goal.targetValue}
                    </span>
                    <span>{progress.progressPercent}%</span>
                  </div>
                  <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-slate-100">
                    <div
                      className="h-full rounded-full bg-teal-500 motion-safe:transition-all motion-safe:duration-500"
                      style={{ width: `${progress.progressPercent}%` }}
                    />
                  </div>
                </div>

                {goal.targetDate && <p className="mt-2 text-xs text-slate-400">Target date: {goal.targetDate}</p>}

                <div className="mt-3 flex gap-3 text-xs font-medium">
                  <button type="button" onClick={() => setFormMode(goal.id)} className="text-teal-700 hover:underline">
                    Edit
                  </button>
                  <button type="button" onClick={() => handleDelete(goal)} className="text-slate-500 hover:text-red-600 hover:underline">
                    Delete
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
