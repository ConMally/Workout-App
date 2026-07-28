"use client";

import type { TemplateSummary } from "@/types/templates";
import { GOAL_LABELS } from "@/lib/workout-generator";
import { formatDate } from "@/lib/workout-log";

interface TemplateCardProps {
  template: TemplateSummary;
  busy: boolean;
  onEdit: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
  onUse: () => void;
}

export default function TemplateCard({ template, busy, onEdit, onDuplicate, onDelete, onUse }: TemplateCardProps) {
  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div>
        <p className="text-xs font-medium uppercase tracking-wide text-slate-400">{GOAL_LABELS[template.goal]}</p>
        <h3 className="mt-0.5 truncate text-base font-bold text-slate-900">{template.name}</h3>
        {template.description && <p className="mt-1 line-clamp-2 text-sm text-slate-500">{template.description}</p>}
      </div>

      <div className="flex flex-wrap gap-3 text-xs text-slate-400">
        <span>
          {template.dayCount} day{template.dayCount === 1 ? "" : "s"}
        </span>
        <span>Updated {formatDate(template.updatedAt)}</span>
      </div>

      <div className="mt-1 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={onUse}
          disabled={busy}
          className="rounded-lg bg-teal-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Use template
        </button>
        <button
          type="button"
          onClick={onEdit}
          disabled={busy}
          className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Edit
        </button>
        <button
          type="button"
          onClick={onDuplicate}
          disabled={busy}
          className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Duplicate
        </button>
        <button
          type="button"
          onClick={onDelete}
          disabled={busy}
          className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-500 transition hover:border-red-300 hover:bg-red-50 hover:text-red-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Delete
        </button>
      </div>
    </div>
  );
}
