interface MetricDisplayProps {
  label: string;
  value: string;
  unit?: string;
  className?: string;
}

// Compact "label over big number" primitive (PART 4's metric-number style)
// — the shape every stat tile in this app already reifies by hand
// (Dashboard stats, exercise best-weight/1RM, etc.); new usages can reach
// for this instead of re-typing the label/value markup.
export default function MetricDisplay({ label, value, unit, className = "" }: MetricDisplayProps) {
  return (
    <div className={className}>
      <p className="text-label">{label}</p>
      <p className="mt-0.5 text-metric text-text-primary">
        {value}
        {unit && <span className="ml-1 text-sm font-medium text-text-secondary">{unit}</span>}
      </p>
    </div>
  );
}
