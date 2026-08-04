interface ChartPoint {
  label: string;
  value: number;
}

interface MiniLineChartProps {
  points: ChartPoint[];
  unit?: string;
  ariaLabel: string;
}

const WIDTH = 300;
const HEIGHT = 100;
const PADDING = 10;

// A small, dependency-free SVG line chart. Always paired with a plain-text
// summary (not just an aria-label) so the trend is understandable without
// interpreting the graphic at all, per the "accompanying text summaries"
// requirement.
export default function MiniLineChart({ points, unit = "", ariaLabel }: MiniLineChartProps) {
  if (points.length < 2) {
    return <p className="text-sm text-text-muted">Not enough data points yet to chart a trend.</p>;
  }

  const values = points.map((p) => p.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;

  const coords = points.map((p, i) => {
    const x = PADDING + (i / (points.length - 1)) * (WIDTH - PADDING * 2);
    const y = HEIGHT - PADDING - ((p.value - min) / range) * (HEIGHT - PADDING * 2);
    return { x, y };
  });

  const path = coords.map((c) => `${c.x},${c.y}`).join(" ");
  const first = points[0];
  const last = points[points.length - 1];
  const changeText =
    first.value === 0
      ? ""
      : ` (${last.value >= first.value ? "+" : ""}${Math.round(((last.value - first.value) / first.value) * 100)}%)`;

  return (
    <div>
      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        role="img"
        aria-label={ariaLabel}
        className="w-full text-accent"
        preserveAspectRatio="none"
      >
        <polyline points={path} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
        {coords.map((c, i) => (
          <circle key={i} cx={c.x} cy={c.y} r={2.5} fill="currentColor" />
        ))}
      </svg>
      <p className="mt-1 text-xs text-text-muted">
        From {first.value}
        {unit} ({first.label}) to {last.value}
        {unit} ({last.label}){changeText}
      </p>
    </div>
  );
}
