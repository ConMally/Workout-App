import { getTimeOfDayGreeting } from "@/lib/dashboard";

interface DashboardHeaderProps {
  displayName: string | null;
  streakDays: number;
  workoutsThisWeek: number;
  weeklyTarget: number | null;
}

// PART 1: personalized greeting + a single compact summary line — never the
// user's email (displayName only, with a neutral fallback), and never a
// second computation of streak/weekly-progress numbers (both come from
// Dashboard.tsx's existing getQuickStats/getWeeklyProgress calls).
export default function DashboardHeader({ displayName, streakDays, workoutsThisWeek, weeklyTarget }: DashboardHeaderProps) {
  const name = displayName?.trim();
  const heading = name ? `${getTimeOfDayGreeting()}, ${name}` : "Welcome back";

  const summaryParts: string[] = [];
  if (streakDays > 0) {
    summaryParts.push(`🔥 ${streakDays}-day streak`);
  }
  summaryParts.push(`${workoutsThisWeek} workout${workoutsThisWeek === 1 ? "" : "s"} this week`);
  if (weeklyTarget !== null && weeklyTarget > 0) {
    const percent = Math.min(100, Math.round((workoutsThisWeek / weeklyTarget) * 100));
    summaryParts.push(`${percent}% of weekly goal`);
  }

  return (
    <div>
      <h1 className="text-page-title text-text-primary">{heading}</h1>
      <p className="mt-0.5 text-supporting">Ready to make progress today?</p>
      <p className="mt-2 text-xs font-medium text-text-muted">{summaryParts.join(" · ")}</p>
    </div>
  );
}
