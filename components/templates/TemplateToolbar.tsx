"use client";

import { TEMPLATE_SORT_LABELS, type TemplateFilter, type TemplateSortMode } from "@/lib/templates";

interface TemplateToolbarProps {
  query: string;
  onQueryChange: (query: string) => void;
  filter: TemplateFilter;
  onFilterChange: (filter: TemplateFilter) => void;
  sort: TemplateSortMode;
  onSortChange: (sort: TemplateSortMode) => void;
}

const SORT_MODES: TemplateSortMode[] = ["favorites_first", "recently_updated", "name_asc", "name_desc"];

// Search/filter/sort all run client-side over the already-loaded template
// list (see lib/templates.ts#searchTemplates/filterTemplates/sortTemplates)
// — no request fires from typing here, so this stays responsive on every
// keystroke without hitting Supabase.
export default function TemplateToolbar({
  query,
  onQueryChange,
  filter,
  onFilterChange,
  sort,
  onSortChange,
}: TemplateToolbarProps) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
      <div className="flex-1 sm:min-w-[200px]">
        <label htmlFor="template-search" className="sr-only">
          Search templates
        </label>
        <input
          id="template-search"
          type="search"
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          placeholder="Search by name, day, or exercise…"
          className="h-[var(--control-height)] w-full rounded-[var(--control-radius)] border border-border bg-surface px-3 text-sm text-text-primary focus:border-accent focus:outline-none focus:ring-2 focus:ring-focus-ring/30"
        />
      </div>

      <div role="group" aria-label="Filter templates" className="flex gap-1 rounded-[var(--control-radius)] border border-border p-1">
        {(["all", "favorites"] as TemplateFilter[]).map((option) => (
          <button
            key={option}
            type="button"
            onClick={() => onFilterChange(option)}
            aria-pressed={filter === option}
            className={`rounded-md px-3 py-1.5 text-xs font-semibold transition ${
              filter === option ? "bg-accent text-accent-foreground" : "text-text-secondary hover:bg-surface-muted"
            }`}
          >
            {option === "all" ? "All" : "Favorites"}
          </button>
        ))}
      </div>

      <label className="flex items-center gap-2 text-xs font-medium text-text-secondary">
        Sort
        <select
          value={sort}
          onChange={(e) => onSortChange(e.target.value as TemplateSortMode)}
          className="rounded-[var(--control-radius)] border border-border bg-surface px-2.5 py-1.5 text-sm text-text-primary focus:border-accent focus:outline-none focus:ring-2 focus:ring-focus-ring/30"
        >
          {SORT_MODES.map((mode) => (
            <option key={mode} value={mode}>
              {TEMPLATE_SORT_LABELS[mode]}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}
