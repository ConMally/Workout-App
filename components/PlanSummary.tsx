import type { WorkoutPlan } from "@/types/workout";

function capitalize(word: string): string {
  return word.charAt(0).toUpperCase() + word.slice(1);
}

// Derived purely from the plan's own weeklySchedule day titles — no changes
// to the generator or schema needed to show a friendly split label.
function getSplitLabel(weeklySchedule: WorkoutPlan["weeklySchedule"]): string {
  const uniqueTitles = Array.from(new Set(weeklySchedule.map((day) => day.title)));
  return uniqueTitles.join(" / ");
}

export default function PlanSummary({ plan }: { plan: WorkoutPlan }) {
  const items = [
    { label: "Goal", value: plan.summary.goal },
    { label: "Training days", value: `${plan.summary.daysPerWeek} / week` },
    { label: "Session length", value: `${plan.summary.sessionDurationMinutes} min` },
    { label: "Experience", value: capitalize(plan.summary.experienceLevel) },
    { label: "Split", value: getSplitLabel(plan.weeklySchedule) },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
      {items.map((item) => (
        <div
          key={item.label}
          className="rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm"
          title={item.value}
        >
          <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
            {item.label}
          </p>
          <p className="mt-1 truncate text-sm font-semibold text-slate-900">{item.value}</p>
        </div>
      ))}
    </div>
  );
}
