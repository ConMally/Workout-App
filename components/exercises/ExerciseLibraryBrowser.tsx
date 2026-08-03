"use client";

import { useMemo, useState } from "react";
import dynamic from "next/dynamic";
import type { CompletedWorkout, WeightUnit } from "@/types/workout-log";
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
import ExerciseCard from "./ExerciseCard";
import EmptyState from "@/components/EmptyState";

// PART 9: neither modal is needed until the user opens one, so they're
// split into their own chunks rather than bundled into the exercise
// library's initial load — the grid of ExerciseCards is what needs to
// render fast, not these.
const ExerciseDetailModal = dynamic(() => import("./ExerciseDetailModal"));
const ExerciseComparisonModal = dynamic(() => import("./ExerciseComparisonModal"));

interface ExerciseLibraryBrowserProps {
  history: CompletedWorkout[];
  weightUnit: WeightUnit;
  favoriteIds: Set<string>;
  onToggleFavorite: (exerciseId: string) => void;
}

type QuickFilter = "all" | "favorites" | "recent";

// Search/filter/sort all run client-side over the statically-indexed
// library (lib/exercises/library.ts) — no network call and no
// exponentially-growing work as the library grows, so this stays instant
// even with hundreds of entries (PART 12).
export default function ExerciseLibraryBrowser({ history, weightUnit, favoriteIds, onToggleFavorite }: ExerciseLibraryBrowserProps) {
  const [filters, setFilters] = useState<ExerciseSearchFilters>(DEFAULT_EXERCISE_SEARCH_FILTERS);
  const [quickFilter, setQuickFilter] = useState<QuickFilter>("all");
  const [selected, setSelected] = useState<ExerciseDefinition | null>(null);
  const [comparing, setComparing] = useState<ExerciseDefinition | null>(null);

  const allExercises = useMemo(() => listAllExercises(), []);

  const recentlyUsed = useMemo(() => {
    const names = history.slice(0, 30).flatMap((w) => w.exercises.map((e) => e.name));
    return getRecentlyUsedExercises(names, allExercises);
  }, [history, allExercises]);
  const recentIds = useMemo(() => new Set(recentlyUsed.map((e) => e.id)), [recentlyUsed]);

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
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-900">Exercises</h2>
        <p className="mt-1 text-sm text-slate-500">Browse, search, and favorite exercises from the library.</p>
      </div>

      <div className="flex flex-col gap-3">
        <label htmlFor="exercise-search" className="sr-only">
          Search exercises
        </label>
        <input
          id="exercise-search"
          type="search"
          value={filters.query}
          onChange={(e) => updateFilter("query", e.target.value)}
          placeholder="Search by name, muscle, or movement…"
          className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/30"
        />

        <div className="flex flex-wrap gap-2">
          <div role="group" aria-label="Quick filters" className="flex gap-1 rounded-lg border border-slate-200 p-1">
            {(["all", "favorites", "recent"] as QuickFilter[]).map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => setQuickFilter(option)}
                aria-pressed={quickFilter === option}
                className={`rounded-md px-3 py-1.5 text-xs font-semibold transition ${
                  quickFilter === option ? "bg-teal-600 text-white" : "text-slate-600 hover:bg-slate-50"
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

      {results.length === 0 ? (
        <EmptyState
          title={
            quickFilter === "favorites"
              ? "No favorites yet"
              : quickFilter === "recent"
                ? "No recently used exercises"
                : "No exercises match"
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
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {results.map((exercise) => (
            <ExerciseCard
              key={exercise.id}
              exercise={exercise}
              isFavorite={favoriteIds.has(exercise.id)}
              recentlyUsed={recentIds.has(exercise.id)}
              onSelect={() => setSelected(exercise)}
              onToggleFavorite={() => onToggleFavorite(exercise.id)}
            />
          ))}
        </div>
      )}

      {selected && (
        <ExerciseDetailModal
          exercise={selected}
          history={history}
          weightUnit={weightUnit}
          isFavorite={favoriteIds.has(selected.id)}
          onToggleFavorite={() => onToggleFavorite(selected.id)}
          onClose={() => setSelected(null)}
          onCompare={() => setComparing(selected)}
        />
      )}

      {comparing && <ExerciseComparisonModal initialExercise={comparing} onClose={() => setComparing(null)} />}
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
    <label className="flex items-center gap-1.5 text-xs font-medium text-slate-600">
      <span className="sr-only">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-label={label}
        className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-sm capitalize text-slate-800 focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/30"
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
