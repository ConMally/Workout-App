import { SkeletonCard, SkeletonText } from "@/components/ui/Skeleton";

// Mirrors Dashboard.tsx's layout (greeting, hero card, compact key metrics
// row, weekly progress, coach insight, goals, recent activity) so the page
// doesn't shift once real data replaces it. The metrics row height (h-20 =
// 80px) matches PART 1's ~72-88px compact StatsCard target.
export default function DashboardSkeleton() {
  return (
    <div role="status" aria-label="Loading dashboard" className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <SkeletonText className="w-48" />
        <SkeletonText className="w-56" />
        <SkeletonText className="w-40" />
      </div>

      <SkeletonCard className="h-40" />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <SkeletonCard key={i} className="h-20" />
        ))}
      </div>

      <SkeletonCard className="h-36" />
      <SkeletonCard className="h-24" />
      <SkeletonCard className="h-28" />
      <SkeletonCard className="h-48" />
    </div>
  );
}
