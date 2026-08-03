import type { ExerciseDefinition } from "@/types/exercises";
import { MUSCLE_GROUP_LABELS } from "@/types/exercises";

interface ExerciseCardProps {
  exercise: ExerciseDefinition;
  isFavorite: boolean;
  recentlyUsed?: boolean;
  onSelect: () => void;
  onToggleFavorite: () => void;
}

// Compact result card for ExerciseLibraryBrowser's search grid — deliberate
// keyboard support: the whole card is a real <button> (not a div with an
// onClick), so Tab/Enter/Space work without any extra wiring, per PART 13's
// "cards need keyboard support."
export default function ExerciseCard({ exercise, isFavorite, recentlyUsed, onSelect, onToggleFavorite }: ExerciseCardProps) {
  return (
    <div className="relative rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-teal-300 hover:shadow-md dark:border-slate-800 dark:bg-slate-900 dark:hover:border-teal-700">
      <button
        type="button"
        onClick={onToggleFavorite}
        title={isFavorite ? `Unfavorite ${exercise.name}` : `Favorite ${exercise.name}`}
        aria-label={isFavorite ? `Unfavorite ${exercise.name}` : `Favorite ${exercise.name}`}
        aria-pressed={isFavorite}
        className={`absolute right-2 top-2 rounded-lg p-1 text-base leading-none transition active:scale-90 hover:bg-amber-50 hover:text-amber-500 ${isFavorite ? "text-amber-500" : "text-slate-300"}`}
      >
        {isFavorite ? "★" : "☆"}
      </button>
      <button type="button" onClick={onSelect} className="w-full pr-6 text-left">
        <p className="text-xs font-medium uppercase tracking-wide text-slate-400 dark:text-slate-500">{MUSCLE_GROUP_LABELS[exercise.primaryMuscle]}</p>
        <p className="mt-0.5 truncate text-sm font-bold text-slate-900 dark:text-slate-100">{exercise.name}</p>
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
          {exercise.equipment[0]?.replace(/_/g, " ")} · {exercise.difficulty}
        </p>
        {recentlyUsed && (
          <span className="mt-1.5 inline-block rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-500 dark:bg-slate-800 dark:text-slate-400">
            Recently used
          </span>
        )}
      </button>
    </div>
  );
}
