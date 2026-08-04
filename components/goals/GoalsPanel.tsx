"use client";

import { useMemo, useState } from "react";
import type { CompletedWorkout } from "@/types/workout-log";
import type { Goal, GoalProgress, GoalType } from "@/types/goals";
import { GOAL_TYPE_LABELS, createGoal, getGoalProgress } from "@/lib/goals";
import GoalForm from "./GoalForm";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import EmptyState from "@/components/EmptyState";

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
          <h2 className="text-page-title text-text-primary">Goals</h2>
          <p className="mt-1 text-supporting">Track strength and consistency targets over time.</p>
        </div>
        {formMode === "none" && (
          <Button type="button" variant="primary" onClick={() => setFormMode("create")}>
            Add goal
          </Button>
        )}
      </div>

      {formMode === "create" && (
        <GoalForm exerciseNames={exerciseNames} onSubmit={handleCreateSubmit} onCancel={() => setFormMode("none")} />
      )}
      {editingGoal && (
        <GoalForm initialGoal={editingGoal} exerciseNames={exerciseNames} onSubmit={handleEditSubmit} onCancel={() => setFormMode("none")} />
      )}

      {goals.length === 0 ? (
        <EmptyState
          title="No goals yet"
          message="Create a strength or consistency goal to track your progress over time."
        />
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2">
          {goals.map((goal) => {
            const progress = progressByGoalId.get(goal.id);
            if (!progress) return null;
            return (
              <li key={goal.id} className="rounded-[var(--card-radius)] border border-border bg-surface p-5 shadow-sm">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-label">{GOAL_TYPE_LABELS[goal.type]}</p>
                    <p className="mt-0.5 truncate text-card-title text-text-primary">{goal.title}</p>
                  </div>
                  {progress.isComplete && <Badge tone="success" className="flex-shrink-0">Complete</Badge>}
                </div>

                <div className="mt-3">
                  <div className="flex items-center justify-between text-xs text-text-muted">
                    <span>
                      {progress.currentValue} / {goal.targetValue}
                    </span>
                    <span>{progress.progressPercent}%</span>
                  </div>
                  <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-surface-muted">
                    <div
                      className="h-full rounded-full bg-accent motion-safe:transition-all motion-safe:duration-500"
                      style={{ width: `${progress.progressPercent}%` }}
                    />
                  </div>
                </div>

                {goal.targetDate && <p className="mt-2 text-xs text-text-muted">Target date: {goal.targetDate}</p>}

                <div className="mt-3 flex gap-3 text-xs font-medium">
                  <button type="button" onClick={() => setFormMode(goal.id)} className="text-accent hover:underline">
                    Edit
                  </button>
                  <button type="button" onClick={() => handleDelete(goal)} className="text-text-muted hover:text-danger hover:underline">
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
