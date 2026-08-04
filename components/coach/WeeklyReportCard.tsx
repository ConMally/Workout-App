"use client";

import { useState } from "react";
import type { WeeklyReport } from "@/types/analytics";
import type { WeightUnit } from "@/types/workout-log";
import { formatDate } from "@/lib/workout-log";

interface WeeklyReportCardProps {
  report: WeeklyReport;
  weightUnit: WeightUnit;
}

export default function WeeklyReportCard({ report, weightUnit }: WeeklyReportCardProps) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="rounded-[var(--card-radius)] border border-border bg-surface p-5 shadow-sm sm:p-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-label">Weekly report</h3>
          <p className="mt-1 text-xs text-text-muted">
            {formatDate(report.weekStart)} – {formatDate(report.weekEnd)}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          aria-expanded={expanded}
          className="flex-shrink-0 rounded-[var(--control-radius)] border border-border px-3 py-1.5 text-xs font-medium text-text-secondary transition hover:bg-surface-muted"
        >
          {expanded ? "Show less" : "Show details"}
        </button>
      </div>

      <p className="mt-3 text-sm text-text-secondary">{report.summary}</p>

      {expanded && (
        <div className="motion-safe:animate-step-in mt-4 flex flex-col gap-4 border-t border-border pt-4">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <ReportStat label="Workouts" value={`${report.workoutsVsTarget.completed} / ${report.workoutsVsTarget.target}`} />
            <ReportStat label="New PRs" value={String(report.newPRs.length)} />
            <ReportStat
              label="Volume change"
              value={report.volumeChangePercent === null ? "—" : `${report.volumeChangePercent >= 0 ? "+" : ""}${report.volumeChangePercent}%`}
            />
            <ReportStat label="Top exercise" value={report.topExercise?.exerciseName ?? "—"} />
            <ReportStat
              label="Top exercise volume"
              value={report.topExercise ? `${report.topExercise.volume.toLocaleString()} ${weightUnit}` : "—"}
            />
            <ReportStat label="Goals behind pace" value={String(report.missedGoals.length)} />
          </div>

          {report.newPRs.length > 0 && (
            <div>
              <p className="text-label">New PRs this week</p>
              <ul className="mt-2 flex flex-col gap-1 text-sm text-text-secondary">
                {report.newPRs.map((pr, i) => (
                  <li key={i}>
                    <span className="font-medium">{pr.exerciseName}</span> — {pr.detail}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {report.missedGoals.length > 0 && (
            <div>
              <p className="text-label">Goals behind pace</p>
              <ul className="mt-2 flex flex-col gap-1 text-sm text-text-secondary">
                {report.missedGoals.map((goal, i) => (
                  <li key={i}>
                    {goal.title} — {goal.progressPercent}%
                  </li>
                ))}
              </ul>
            </div>
          )}

          {report.recommendations.length > 0 && (
            <div>
              <p className="text-label">Top recommendations</p>
              <ul className="mt-2 flex flex-col gap-2">
                {report.recommendations.map((rec) => (
                  <li key={rec.id} className="rounded-[var(--control-radius)] bg-surface-muted p-2.5 text-sm text-text-secondary">
                    {rec.message}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function ReportStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[var(--control-radius)] bg-surface-muted px-3 py-2">
      <p className="text-xs font-medium text-text-muted">{label}</p>
      <p className="mt-0.5 text-sm font-bold text-text-primary">{value}</p>
    </div>
  );
}
