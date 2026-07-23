import type { LoggedExercise, LoggedSet, ProgressionSuggestion, WeightUnit } from "@/types/workout-log";

const MAX_WEIGHT = 2000;
const MAX_REPS = 200;

function parseNullableWeight(raw: string, fallback: number | null): number | null {
  if (raw === "") return null;
  const parsed = Number(raw);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(MAX_WEIGHT, Math.max(0, parsed));
}

function parseNullableReps(raw: string, fallback: number | null): number | null {
  if (raw === "") return null;
  const parsed = Number(raw);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(MAX_REPS, Math.max(0, Math.round(parsed)));
}

function summarizeSets(exercise: LoggedExercise): string {
  const parts = exercise.sets
    .filter((set) => set.completed && set.weight !== null && set.reps !== null)
    .map((set) => `${set.weight}x${set.reps}`);
  return parts.length > 0 ? parts.join(", ") : "no data logged";
}

interface ExerciseLoggerProps {
  exercise: LoggedExercise;
  lastPerformance: LoggedExercise | null;
  suggestion: ProgressionSuggestion | null;
  weightUnit: WeightUnit;
  onChange: (updated: LoggedExercise) => void;
  onSetCompleted: (restSeconds: number) => void;
  onSelectExercise: (name: string) => void;
}

export default function ExerciseLogger({
  exercise,
  lastPerformance,
  suggestion,
  weightUnit,
  onChange,
  onSetCompleted,
  onSelectExercise,
}: ExerciseLoggerProps) {
  function updateSet(index: number, updates: Partial<LoggedSet>) {
    const nextSets = exercise.sets.map((set, i) => (i === index ? { ...set, ...updates } : set));
    let nextExercise = { ...exercise, sets: nextSets };

    // Convenience default: once every set is complete, mark the exercise
    // complete too. Still independently overridable by the user below.
    if (updates.completed === true && nextSets.every((set) => set.completed)) {
      nextExercise = { ...nextExercise, completed: true };
    }

    onChange(nextExercise);

    if (updates.completed === true) {
      onSetCompleted(exercise.targetRestSeconds);
    }
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-lg font-bold text-slate-900">{exercise.name}</p>
          <p className="mt-0.5 text-sm text-slate-500">
            Target: {exercise.targetSets} sets x {exercise.targetReps} reps · {exercise.targetRestSeconds}s
            rest
          </p>
        </div>
        <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
          <input
            type="checkbox"
            checked={exercise.completed}
            onChange={(e) => onChange({ ...exercise, completed: e.target.checked })}
            className="h-4 w-4 rounded border-slate-300 accent-teal-600"
          />
          Exercise complete
        </label>
      </div>

      {lastPerformance && (
        <p className="mt-2 text-xs text-slate-500">Last time: {summarizeSets(lastPerformance)}</p>
      )}

      <button
        type="button"
        onClick={() => onSelectExercise(exercise.name)}
        className="mt-1.5 text-xs font-medium text-teal-700 hover:underline"
      >
        View progress →
      </button>

      {suggestion && (
        <p className="mt-1.5 rounded-lg bg-teal-50 px-3 py-2 text-xs font-medium text-teal-800">
          {suggestion.message}
        </p>
      )}

      <div className="mt-4 divide-y divide-slate-100">
        {exercise.sets.map((set, index) => (
          <div key={set.setNumber} className="flex flex-wrap items-center gap-3 py-2.5 first:pt-0">
            <span className="w-12 flex-shrink-0 text-sm font-semibold text-slate-500">
              Set {set.setNumber}
            </span>
            <label className="flex items-center gap-1.5 text-xs text-slate-500">
              Weight ({weightUnit})
              <input
                type="number"
                inputMode="decimal"
                min={0}
                value={set.weight ?? ""}
                onChange={(e) => updateSet(index, { weight: parseNullableWeight(e.target.value, set.weight) })}
                className="w-20 rounded-lg border border-slate-200 px-2 py-1.5 text-sm text-slate-800 focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/30"
              />
            </label>
            <label className="flex items-center gap-1.5 text-xs text-slate-500">
              Reps
              <input
                type="number"
                inputMode="numeric"
                min={0}
                value={set.reps ?? ""}
                onChange={(e) => updateSet(index, { reps: parseNullableReps(e.target.value, set.reps) })}
                className="w-16 rounded-lg border border-slate-200 px-2 py-1.5 text-sm text-slate-800 focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/30"
              />
            </label>
            <label className="ml-auto flex items-center gap-1.5 text-xs font-medium text-slate-600">
              <input
                type="checkbox"
                checked={set.completed}
                onChange={(e) => updateSet(index, { completed: e.target.checked })}
                className="h-4 w-4 rounded border-slate-300 accent-teal-600"
              />
              Done
            </label>
          </div>
        ))}
      </div>

      <label className="mt-4 block text-xs font-medium text-slate-500">
        Note (optional)
        <textarea
          value={exercise.note}
          onChange={(e) => onChange({ ...exercise, note: e.target.value })}
          rows={2}
          maxLength={500}
          placeholder="e.g. felt strong, form broke down on the last rep..."
          className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/30"
        />
      </label>
    </div>
  );
}
