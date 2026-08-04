import type { RecoveryResult } from "@/types/analytics";
import { RECOVERY_STATUS_META } from "@/components/coach/RecoveryCard";
import StatsCard from "./StatsCard";

interface KeyMetricsProps {
  streakDays: number;
  workoutsThisWeek: number;
  recentPRCount: number;
  recovery: RecoveryResult;
}

// PART 4: exactly the four recommended metrics, nothing more — replaces the
// old streak/all-time-workouts/all-time-PRs/all-time-training-minutes grid
// (all-time totals are less actionable than "this week"), and absorbs what
// used to be DashboardSpotlight's separate recovery tile (same
// RECOVERY_STATUS_META RecoveryCard already exports, not a second copy).
export default function KeyMetrics({ streakDays, workoutsThisWeek, recentPRCount, recovery }: KeyMetricsProps) {
  const recoveryMeta = RECOVERY_STATUS_META[recovery.status];

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      <StatsCard icon="🔥" label="Streak" value={`${streakDays} day${streakDays === 1 ? "" : "s"}`} />
      <StatsCard icon="💪" label="This week" value={`${workoutsThisWeek} workout${workoutsThisWeek === 1 ? "" : "s"}`} />
      <StatsCard icon="🏆" label="Recent PRs" value={String(recentPRCount)} />
      <StatsCard icon={recoveryMeta.icon} label="Recovery" value={recoveryMeta.label} />
    </div>
  );
}
