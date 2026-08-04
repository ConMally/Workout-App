import type { ExerciseDefinition } from "@/types/exercises";
import { MOVEMENT_PATTERN_LABELS, MUSCLE_GROUP_LABELS } from "@/types/exercises";

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
    <div className="motion-safe:hover:-translate-y-0.5 relative rounded-[var(--card-radius)] border border-border bg-surface p-4 shadow-sm transition hover:border-accent/40 hover:shadow-md">
      <button
        type="button"
        onClick={onToggleFavorite}
        title={isFavorite ? `Unfavorite ${exercise.name}` : `Favorite ${exercise.name}`}
        aria-label={isFavorite ? `Unfavorite ${exercise.name}` : `Favorite ${exercise.name}`}
        aria-pressed={isFavorite}
        className={`motion-safe:active:scale-90 absolute right-2 top-2 rounded-[var(--control-radius)] p-1 text-base leading-none transition hover:bg-warning-soft hover:text-warning ${isFavorite ? "text-warning" : "text-text-muted"}`}
      >
        {isFavorite ? "★" : "☆"}
      </button>
      <button type="button" onClick={onSelect} className="w-full pr-6 text-left">
        <p className="text-label">{MUSCLE_GROUP_LABELS[exercise.primaryMuscle]}</p>
        <p className="mt-0.5 truncate text-card-title text-text-primary">{exercise.name}</p>
        <p className="mt-1 text-xs text-text-muted">
          {exercise.equipment[0]?.replace(/_/g, " ")} · {MOVEMENT_PATTERN_LABELS[exercise.movementPattern]}
        </p>
        {recentlyUsed && (
          <span className="mt-1.5 inline-block rounded-full bg-surface-muted px-2 py-0.5 text-[10px] font-medium text-text-muted">
            Recently used
          </span>
        )}
      </button>
    </div>
  );
}
