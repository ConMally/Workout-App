interface StatsCardProps {
  icon: string;
  label: string;
  value: string;
  // Short contextual note under the value — e.g. a recovery reason or a
  // trend ("+12% vs last week"). Never a second independent calculation:
  // every caller passes something already computed elsewhere.
  context?: string;
}

// PART 4: compact metric tile — icon + large value + short label, used by
// KeyMetrics. Kept as its own component (not inlined) since the same shape
// is reused for streak/workouts/PRs/recovery.
export default function StatsCard({ icon, label, value, context }: StatsCardProps) {
  return (
    <div className="flex items-center gap-3 rounded-[var(--card-radius)] border border-border bg-surface p-4 shadow-sm">
      <span
        className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-accent-soft text-lg"
        aria-hidden="true"
      >
        {icon}
      </span>
      <div className="min-w-0">
        <p className="text-label">{label}</p>
        <p className="mt-0.5 text-metric text-text-primary">{value}</p>
        {context && <p className="mt-0.5 truncate text-xs text-text-muted">{context}</p>}
      </div>
    </div>
  );
}
