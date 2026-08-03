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
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Weekly report</h3>
          <p className="mt-1 text-xs text-slate-400">
            {formatDate(report.weekStart)} – {formatDate(report.weekEnd)}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          aria-expanded={expanded}
          className="flex-shrink-0 rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-50"
        >
          {expanded ? "Show less" : "Show details"}
        </button>
      </div>

      <p className="mt-3 text-sm text-slate-700">{report.summary}</p>

      {expanded && (
        <div className="mt-4 flex flex-col gap-4 border-t border-slate-100 pt-4">
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
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">New PRs this week</p>
              <ul className="mt-2 flex flex-col gap-1 text-sm text-slate-700">
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
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Goals behind pace</p>
              <ul className="mt-2 flex flex-col gap-1 text-sm text-slate-700">
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
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Top recommendations</p>
              <ul className="mt-2 flex flex-col gap-2">
                {report.recommendations.map((rec) => (
                  <li key={rec.id} className="rounded-lg bg-slate-50 p-2.5 text-sm text-slate-700">
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
    <div className="rounded-xl bg-slate-50 px-3 py-2">
      <p className="text-xs font-medium text-slate-400">{label}</p>
      <p className="mt-0.5 text-sm font-bold text-slate-900">{value}</p>
    </div>
  );
}
