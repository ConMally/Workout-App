"use client";

import { useMemo, useRef, useState } from "react";
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
import { useFocusTrap } from "@/lib/useFocusTrap";
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
  const dialogRef = useRef<HTMLDivElement>(null);
  useFocusTrap(dialogRef, true);

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

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Escape") onCancel();
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 px-4 py-8"
      role="presentation"
      onClick={onCancel}
      onKeyDown={handleKeyDown}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="exercise-picker-title"
        onClick={(e) => e.stopPropagation()}
        className="flex max-h-full w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-lg dark:border-slate-800 dark:bg-slate-900"
      >
        <div className="flex items-start justify-between gap-3 border-b border-slate-100 p-5 dark:border-slate-800 sm:p-6">
          <div className="min-w-0">
            <h2 id="exercise-picker-title" className="text-lg font-semibold text-slate-900 dark:text-slate-100">
              {title}
            </h2>
            {description && <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{description}</p>}
          </div>
          <button
            type="button"
            onClick={onCancel}
            aria-label="Close"
            className="flex-shrink-0 rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800"
          >
            ✕
          </button>
        </div>

        <div className="flex flex-col gap-3 border-b border-slate-100 p-4 dark:border-slate-800 sm:p-5">
          <label htmlFor="exercise-picker-search" className="sr-only">
            Search exercises
          </label>
          <input
            id="exercise-picker-search"
            type="search"
            value={filters.query}
            onChange={(e) => updateFilter("query", e.target.value)}
            placeholder="Search by name, muscle, or movement…"
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/30 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
          />

          <div className="flex flex-wrap gap-2">
            <div role="group" aria-label="Quick filters" className="flex gap-1 rounded-lg border border-slate-200 p-1 dark:border-slate-700">
              {(["all", "favorites", "recent"] as QuickFilter[]).map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => setQuickFilter(option)}
                  aria-pressed={quickFilter === option}
                  className={`rounded-md px-3 py-1.5 text-xs font-semibold transition ${
                    quickFilter === option ? "bg-teal-600 text-white" : "text-slate-600 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800"
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

        <div className="flex justify-end border-t border-slate-100 p-4 dark:border-slate-800">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
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
    <label className="flex items-center gap-1.5 text-xs font-medium text-slate-600 dark:text-slate-300">
      <span className="sr-only">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-label={label}
        className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-sm capitalize text-slate-800 focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/30 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
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
