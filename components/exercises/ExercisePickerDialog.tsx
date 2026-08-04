"use client";

import { useMemo, useState } from "react";
import type { CompletedWorkout } from "@/types/workout-log";
import type { ExerciseDefinition, ExerciseSearchFilters } from "@/types/exercises";
import {
  ALL_MUSCLE_GROUPS,
  DEFAULT_EXERCISE_SEARCH_FILTERS,
  MOVEMENT_PATTERN_LABELS,
  MUSCLE_GROUP_LABELS,
} from "@/types/exercises";
import { EquipmentEnum, ExperienceLevelEnum } from "@/lib/schemas";
import { listAllExercises } from "@/lib/exercises/library";
import { getRecentlyUsedExercises, searchExercises, sortExercisesWithFavoritesFirst } from "@/lib/exercises/search";
import Dialog from "@/components/ui/Dialog";
import Button from "@/components/ui/Button";
import ExerciseCard from "./ExerciseCard";
import EmptyState from "@/components/EmptyState";

interface ExercisePickerDialogProps {
  title: string;
  description?: string;
  history: CompletedWorkout[];
  favoriteIds: Set<string>;
  onToggleFavorite: (exerciseId: string) => void;
  onSelect: (exercise: ExerciseDefinition) => void;
  onCancel: () => void;
}

type QuickFilter = "all" | "favorites" | "recent";

// The library-only exercise picker for templates (PART 1): search/filter
// over the same centralized library ExerciseLibraryBrowser browses, reusing
// its filter set, quick filters, and ExerciseCard so a template exercise
// and the standalone library tab present the same information the same
// way. Selecting a card resolves it immediately — there is deliberately no
// free-text fallback anywhere in this dialog, since the whole point is that
// a new template exercise can only ever be a real library entry.
export default function ExercisePickerDialog({
  title,
  description,
  history,
  favoriteIds,
  onToggleFavorite,
  onSelect,
  onCancel,
}: ExercisePickerDialogProps) {
  const [filters, setFilters] = useState<ExerciseSearchFilters>(DEFAULT_EXERCISE_SEARCH_FILTERS);
  const [quickFilter, setQuickFilter] = useState<QuickFilter>("all");

  const allExercises = useMemo(() => listAllExercises(), []);

  const recentlyUsed = useMemo(() => {
    const names = history.slice(0, 30).flatMap((w) => w.exercises.map((e) => e.name));
    return getRecentlyUsedExercises(names, allExercises);
  }, [history, allExercises]);

  const results = useMemo(() => {
    const base =
      quickFilter === "recent"
        ? recentlyUsed
        : quickFilter === "favorites"
          ? allExercises.filter((e) => favoriteIds.has(e.id))
          : allExercises;
    const filtered = searchExercises(filters, base);
    return sortExercisesWithFavoritesFirst(filtered, favoriteIds);
  }, [filters, quickFilter, allExercises, recentlyUsed, favoriteIds]);

  function updateFilter<K extends keyof ExerciseSearchFilters>(key: K, value: ExerciseSearchFilters[K]) {
    setFilters((prev) => ({ ...prev, [key]: value }));
  }

  return (
    <Dialog onClose={onCancel} titleId="exercise-picker-title" className="max-w-2xl">
      <div className="flex items-start justify-between gap-3 border-b border-border p-5 sm:p-6">
        <div className="min-w-0">
          <h2 id="exercise-picker-title" className="text-section-heading text-text-primary">
            {title}
          </h2>
          {description && <p className="mt-1 text-supporting">{description}</p>}
        </div>
        <button
          type="button"
          onClick={onCancel}
          aria-label="Close"
          className="flex-shrink-0 rounded-[var(--control-radius)] p-1.5 text-text-muted transition hover:bg-surface-muted hover:text-text-secondary"
        >
          ✕
        </button>
      </div>

      <div className="flex flex-col gap-3 border-b border-border p-4 sm:p-5">
        <label htmlFor="exercise-picker-search" className="sr-only">
          Search exercises
        </label>
        <input
          id="exercise-picker-search"
          type="search"
          value={filters.query}
          onChange={(e) => updateFilter("query", e.target.value)}
          placeholder="Search by name, muscle, or movement…"
          className="h-[var(--control-height)] w-full rounded-[var(--control-radius)] border border-border bg-surface px-3 text-sm text-text-primary focus:border-accent focus:outline-none focus:ring-2 focus:ring-focus-ring/30"
        />

        <div className="flex flex-wrap gap-2">
          <div role="group" aria-label="Quick filters" className="flex gap-1 rounded-[var(--control-radius)] border border-border p-1">
            {(["all", "favorites", "recent"] as QuickFilter[]).map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => setQuickFilter(option)}
                aria-pressed={quickFilter === option}
                className={`rounded-md px-3 py-1.5 text-xs font-semibold transition ${
                  quickFilter === option ? "bg-accent text-accent-foreground" : "text-text-secondary hover:bg-surface-muted"
                }`}
              >
                {option === "all" ? "All" : option === "favorites" ? "Favorites" : "Recently used"}
              </button>
            ))}
          </div>

          <FilterSelect
            label="Muscle"
            value={filters.muscle}
            onChange={(v) => updateFilter("muscle", v as ExerciseSearchFilters["muscle"])}
            options={ALL_MUSCLE_GROUPS.map((g) => ({ value: g, label: MUSCLE_GROUP_LABELS[g] }))}
          />
          <FilterSelect
            label="Equipment"
            value={filters.equipment}
            onChange={(v) => updateFilter("equipment", v as ExerciseSearchFilters["equipment"])}
            options={EquipmentEnum.options.map((e) => ({ value: e, label: e.replace(/_/g, " ") }))}
          />
          <FilterSelect
            label="Difficulty"
            value={filters.difficulty}
            onChange={(v) => updateFilter("difficulty", v as ExerciseSearchFilters["difficulty"])}
            options={ExperienceLevelEnum.options.map((d) => ({ value: d, label: d }))}
          />
          <FilterSelect
            label="Movement"
            value={filters.movementPattern}
            onChange={(v) => updateFilter("movementPattern", v as ExerciseSearchFilters["movementPattern"])}
            options={Object.entries(MOVEMENT_PATTERN_LABELS).map(([value, label]) => ({ value, label }))}
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 sm:p-5">
        {results.length === 0 ? (
          <EmptyState
            title={
              quickFilter === "favorites" ? "No favorites yet" : quickFilter === "recent" ? "No recently used exercises" : "No exercises match"
            }
            message={
              quickFilter === "favorites"
                ? "Tap the star on any exercise to favorite it and it'll show up here."
                : quickFilter === "recent"
                  ? "Exercises you've logged in a workout will show up here."
                  : "Try a different search term, or clear a filter above."
            }
          />
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {results.map((exercise) => (
              <ExerciseCard
                key={exercise.id}
                exercise={exercise}
                isFavorite={favoriteIds.has(exercise.id)}
                recentlyUsed={recentlyUsed.some((e) => e.id === exercise.id)}
                onSelect={() => onSelect(exercise)}
                onToggleFavorite={() => onToggleFavorite(exercise.id)}
              />
            ))}
          </div>
        )}
      </div>

      <div className="flex justify-end border-t border-border p-4">
        <Button type="button" variant="secondary" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </Dialog>
  );
}

function FilterSelect<T extends string>({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: T;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <label className="flex items-center gap-1.5 text-xs font-medium text-text-secondary">
      <span className="sr-only">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-label={label}
        className="rounded-[var(--control-radius)] border border-border bg-surface px-2.5 py-1.5 text-sm capitalize text-text-primary focus:border-accent focus:outline-none focus:ring-2 focus:ring-focus-ring/30"
      >
        <option value="all">{label}: All</option>
        {options.map((option) => (
          <option key={option.value} value={option.value} className="capitalize">
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}
