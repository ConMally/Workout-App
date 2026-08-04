"use client";

import type { TemplateSummary } from "@/types/templates";
import { GOAL_LABELS } from "@/lib/workout-generator";
import { formatDate } from "@/lib/workout-log";
import Button from "@/components/ui/Button";

interface TemplateCardProps {
  template: TemplateSummary;
  busy: boolean;
  onEdit: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
  onUse: () => void;
  onToggleFavorite: () => void;
}

export default function TemplateCard({
  template,
  busy,
  onEdit,
  onDuplicate,
  onDelete,
  onUse,
  onToggleFavorite,
}: TemplateCardProps) {
  const favoriteLabel = template.isFavorite
    ? `Unfavorite ${template.name}`
    : `Favorite ${template.name}`;

  return (
    <div className="flex flex-col gap-3 rounded-[var(--card-radius)] border border-border bg-surface p-5 shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="text-label">{GOAL_LABELS[template.goal]}</p>
          <h3 className="mt-0.5 truncate text-card-title text-text-primary">{template.name}</h3>
        </div>
        <button
          type="button"
          onClick={onToggleFavorite}
          disabled={busy}
          title={favoriteLabel}
          aria-label={favoriteLabel}
          aria-pressed={template.isFavorite}
          className={`flex-shrink-0 rounded-[var(--control-radius)] p-1.5 text-lg leading-none transition hover:bg-warning-soft hover:text-warning disabled:cursor-not-allowed disabled:opacity-50 ${
            template.isFavorite ? "text-warning" : "text-text-muted"
          }`}
        >
          {template.isFavorite ? "★" : "☆"}
        </button>
      </div>

      {template.description && <p className="line-clamp-2 text-sm text-text-muted">{template.description}</p>}

      <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-text-muted">
        <span>
          {template.dayCount} day{template.dayCount === 1 ? "" : "s"}
        </span>
        <span>Updated {formatDate(template.updatedAt)}</span>
      </div>

      <div className="mt-1 grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
        <Button type="button" variant="primary" size="sm" onClick={onUse} disabled={busy} className="col-span-2 sm:col-span-1">
          Use template
        </Button>
        <Button type="button" variant="secondary" size="sm" onClick={onEdit} disabled={busy}>
          Edit
        </Button>
        <Button type="button" variant="secondary" size="sm" onClick={onDuplicate} disabled={busy}>
          Duplicate
        </Button>
        <button
          type="button"
          onClick={onDelete}
          disabled={busy}
          className="rounded-[var(--control-radius)] border border-border px-3 py-1.5 text-xs font-medium text-text-secondary transition hover:border-danger/40 hover:bg-danger-soft hover:text-danger disabled:cursor-not-allowed disabled:opacity-50"
        >
          Delete
        </button>
      </div>
    </div>
  );
}
