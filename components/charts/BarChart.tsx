interface BarChartBar {
  label: string;
  value: number;
}

interface BarChartProps {
  bars: BarChartBar[];
  unit?: string;
  ariaLabel: string;
  formatValue?: (value: number) => string;
}

const HEIGHT = 140;
const BAR_GAP = 8;

// A small, dependency-free SVG bar chart — same philosophy as
// MiniLineChart.tsx (no charting library; a plain-text summary always
// accompanies the graphic so the data is never locked inside an <svg>).
// Reused for training volume, workout frequency, and muscle-group volume.
export default function BarChart({ bars, unit = "", ariaLabel, formatValue }: BarChartProps) {
  if (bars.length === 0) {
    return <p className="text-sm text-slate-400">Not enough data yet to chart.</p>;
  }

  const max = Math.max(...bars.map((b) => b.value), 1);
  const format = formatValue ?? ((v: number) => `${v.toLocaleString()}${unit}`);
  const barWidth = 100 / bars.length;

  return (
    <div>
      <svg
        viewBox={`0 0 100 ${HEIGHT}`}
        role="img"
        aria-label={ariaLabel}
        className="w-full text-teal-600"
        preserveAspectRatio="none"
      >
        {bars.map((bar, i) => {
          const barHeight = (bar.value / max) * (HEIGHT - 20);
          const x = i * barWidth + BAR_GAP / 4;
          const width = barWidth - BAR_GAP / 2;
          return (
            <g key={i}>
              <rect
                x={x}
                y={HEIGHT - 16 - barHeight}
                width={Math.max(width, 1)}
                height={Math.max(barHeight, 1)}
                rx={1}
                fill="currentColor"
                opacity={i === bars.length - 1 ? 1 : 0.55}
              />
              <title>{`${bar.label}: ${format(bar.value)}`}</title>
            </g>
          );
        })}
      </svg>
      <div className="mt-1 flex justify-between text-[10px] text-slate-400">
        <span>{bars[0].label}</span>
        <span>{bars[bars.length - 1].label}</span>
      </div>
      <p className="mt-1 text-xs text-slate-500">
        Latest: {bars[bars.length - 1].label} — {format(bars[bars.length - 1].value)}
      </p>
    </div>
  );
}
