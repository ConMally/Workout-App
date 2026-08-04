"use client";

import { useId } from "react";
import { toDateKey } from "@/lib/dashboard";

interface ConsistencyCalendarProps {
  history: { completedAt: string }[];
  weeks?: number; // trailing weeks to show, including the current one
}

const CELL = 11;
const GAP = 3;
const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

// GitHub-style contribution calendar — one column per week, one row per
// weekday, cell shade = workouts completed that day. Intensity is
// color-graded but every cell also carries a native <title> tooltip with
// the exact count and date, so the information is never color-only (see
// PART 11's "colors must not be the only indicator").
export default function ConsistencyCalendar({ history, weeks = 18 }: ConsistencyCalendarProps) {
  const titleId = useId();
  const countsByDay = new Map<string, number>();
  for (const workout of history) {
    const key = toDateKey(new Date(workout.completedAt));
    countsByDay.set(key, (countsByDay.get(key) ?? 0) + 1);
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  // Start on the Sunday at or before (today - (weeks-1)*7 days).
  const start = new Date(today);
  start.setDate(start.getDate() - (weeks - 1) * 7 - today.getDay());

  const days: { date: Date; count: number }[] = [];
  const cursor = new Date(start);
  while (cursor <= today) {
    days.push({ date: new Date(cursor), count: countsByDay.get(toDateKey(cursor)) ?? 0 });
    cursor.setDate(cursor.getDate() + 1);
  }

  const columns: { date: Date; count: number }[][] = [];
  for (let i = 0; i < days.length; i += 7) {
    columns.push(days.slice(i, i + 7));
  }

  const maxCount = Math.max(1, ...days.map((d) => d.count));
  const width = columns.length * (CELL + GAP);
  const height = 7 * (CELL + GAP);

  // Uses the accent token at graded opacity (rather than hardcoded hex
  // shades) so every cell — including the "0 workouts" background — stays
  // correct in dark mode automatically, no separate dark: palette to
  // maintain (PART 11).
  function shade(count: number): string {
    if (count === 0) return "var(--border)";
    const intensity = Math.min(1, count / maxCount);
    if (intensity > 0.75) return "var(--accent)";
    if (intensity > 0.5) return "color-mix(in srgb, var(--accent) 75%, transparent)";
    if (intensity > 0.25) return "color-mix(in srgb, var(--accent) 50%, transparent)";
    return "color-mix(in srgb, var(--accent) 30%, transparent)";
  }

  const totalWorkouts = days.reduce((s, d) => s + d.count, 0);
  const activeDays = days.filter((d) => d.count > 0).length;

  return (
    <div>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-labelledby={titleId}
        className="w-full"
        style={{ maxWidth: width * 1.5 }}
      >
        <title id={titleId}>{`Workout activity over the last ${weeks} weeks: ${totalWorkouts} workouts across ${activeDays} active days`}</title>
        {columns.map((col, colIndex) =>
          col.map((day, rowIndex) => (
            <rect
              key={`${colIndex}-${rowIndex}`}
              x={colIndex * (CELL + GAP)}
              y={rowIndex * (CELL + GAP)}
              width={CELL}
              height={CELL}
              rx={2}
              fill={shade(day.count)}
            >
              <title>
                {day.count} workout{day.count === 1 ? "" : "s"} on{" "}
                {day.date.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}
              </title>
            </rect>
          ))
        )}
      </svg>
      <div className="mt-2 flex items-center justify-between text-xs text-text-muted">
        <span>
          {totalWorkouts} workout{totalWorkouts === 1 ? "" : "s"} across {activeDays} active day
          {activeDays === 1 ? "" : "s"} (last {weeks} weeks)
        </span>
        <div className="flex items-center gap-1" aria-hidden="true">
          <span className="text-[10px] text-text-muted">Less</span>
          {[0, 0.3, 0.5, 0.8, 1].map((fraction) => (
            <span key={fraction} className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: shade(fraction * maxCount) }} />
          ))}
          <span className="text-[10px] text-text-muted">More</span>
        </div>
      </div>
      <span className="sr-only">{DAY_LABELS.join(", ")}</span>
    </div>
  );
}
