interface StatsCardProps {
  icon: string;
  label: string;
  value: string;
  // Short contextual note under the value — e.g. a trend. Never a second
  // independent calculation: any caller passes something already computed
  // elsewhere. Omitted by KeyMetrics today (kept compact per PART 1), but
  // left available since this is a shared primitive.
  context?: string;
}

// PART 1 (Phase 10C): compact metric tile — small icon circle on the left,
// label-over-value stacked on the right, restrained single-line
// typography. Only ever used by KeyMetrics today (verified via grep before
// this rewrite), so this compact treatment doesn't affect any other screen.
export default function StatsCard({ icon, label, value, context }: StatsCardProps) {
  return (
    <div className="flex items-center gap-2.5 rounded-[var(--card-radius)] border border-border bg-surface p-3 shadow-sm">
      <span
        className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-accent-soft text-xl leading-none"
        aria-hidden="true"
      >
        {icon}
      </span>
      <div className="min-w-0">
        <p className="truncate text-xs font-medium text-text-muted">{label}</p>
        {/* Not truncated: a long value (e.g. Recovery's "Overreaching")
            should wrap to a second line rather than clip with an ellipsis —
            every other value here is short enough to stay on one line
            naturally at this width. */}
        <p className="text-base font-semibold leading-snug text-text-primary">{value}</p>
        {context && <p className="mt-0.5 truncate text-xs text-text-muted">{context}</p>}
      </div>
    </div>
  );
}
