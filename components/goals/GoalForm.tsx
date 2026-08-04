"use client";

import { useState } from "react";
import type { Goal, GoalType } from "@/types/goals";
import { GoalTypeEnum } from "@/types/goals";
import { GOAL_TYPE_LABELS, suggestGoalTitle } from "@/lib/goals";
import Button from "@/components/ui/Button";

const FIELD_CLASS =
  "h-[var(--control-height)] rounded-[var(--control-radius)] border border-border bg-surface px-3 text-sm text-text-primary focus:border-accent focus:outline-none focus:ring-2 focus:ring-focus-ring/30";

interface GoalFormProps {
  initialGoal?: Goal | null;
  exerciseNames: string[];
  onSubmit: (input: {
    type: GoalType;
    title: string;
    exerciseName: string | null;
    targetValue: number;
    targetDate: string | null;
  }) => void;
  onCancel: () => void;
}

const EXERCISE_TYPES: GoalType[] = ["exercise_weight", "exercise_one_rep_max"];

export default function GoalForm({ initialGoal, exerciseNames, onSubmit, onCancel }: GoalFormProps) {
  const [type, setType] = useState<GoalType>(initialGoal?.type ?? "workout_count");
  const [title, setTitle] = useState(initialGoal?.title ?? "");
  const [exerciseName, setExerciseName] = useState<string | null>(initialGoal?.exerciseName ?? exerciseNames[0] ?? null);
  const [targetValue, setTargetValue] = useState(initialGoal?.targetValue ?? 10);
  const [targetDate, setTargetDate] = useState(initialGoal?.targetDate ?? "");
  const [titleTouched, setTitleTouched] = useState(Boolean(initialGoal));

  const needsExercise = EXERCISE_TYPES.includes(type);

  function handleTypeChange(nextType: GoalType) {
    setType(nextType);
    if (!titleTouched) {
      setTitle(suggestGoalTitle(nextType, needsExercise ? exerciseName : null, targetValue));
    }
  }

  function handleTargetChange(value: number) {
    setTargetValue(value);
    if (!titleTouched) {
      setTitle(suggestGoalTitle(type, needsExercise ? exerciseName : null, value));
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (targetValue <= 0) return;
    onSubmit({
      type,
      title: title.trim() || suggestGoalTitle(type, needsExercise ? exerciseName : null, targetValue),
      exerciseName: needsExercise ? exerciseName : null,
      targetValue,
      targetDate: targetDate || null,
    });
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4 rounded-[var(--card-radius)] border border-border bg-surface p-5 shadow-sm sm:p-6">
      <label className="flex flex-col gap-1 text-sm font-medium text-text-secondary">
        Goal type
        <select value={type} onChange={(e) => handleTypeChange(e.target.value as GoalType)} className={FIELD_CLASS}>
          {GoalTypeEnum.options.map((t) => (
            <option key={t} value={t}>
              {GOAL_TYPE_LABELS[t]}
            </option>
          ))}
        </select>
      </label>

      {needsExercise && (
        <label className="flex flex-col gap-1 text-sm font-medium text-text-secondary">
          Exercise
          {exerciseNames.length > 0 ? (
            <select
              value={exerciseName ?? ""}
              onChange={(e) => {
                setExerciseName(e.target.value);
                if (!titleTouched) setTitle(suggestGoalTitle(type, e.target.value, targetValue));
              }}
              className={FIELD_CLASS}
            >
              {exerciseNames.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>
          ) : (
            <input
              type="text"
              value={exerciseName ?? ""}
              onChange={(e) => setExerciseName(e.target.value)}
              placeholder="e.g. Barbell Bench Press"
              className={FIELD_CLASS}
            />
          )}
        </label>
      )}

      <label className="flex flex-col gap-1 text-sm font-medium text-text-secondary">
        Target value
        <input type="number" min={1} value={targetValue} onChange={(e) => handleTargetChange(Number(e.target.value))} className={FIELD_CLASS} />
      </label>

      <label className="flex flex-col gap-1 text-sm font-medium text-text-secondary">
        Title
        <input
          type="text"
          value={title}
          onChange={(e) => {
            setTitle(e.target.value);
            setTitleTouched(true);
          }}
          maxLength={120}
          className={FIELD_CLASS}
        />
      </label>

      <label className="flex flex-col gap-1 text-sm font-medium text-text-secondary">
        Target date (optional)
        <input type="date" value={targetDate} onChange={(e) => setTargetDate(e.target.value)} className={FIELD_CLASS} />
      </label>

      <div className="flex flex-wrap justify-end gap-2">
        <Button type="button" variant="secondary" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" variant="primary">
          {initialGoal ? "Save changes" : "Create goal"}
        </Button>
      </div>
    </form>
  );
}
